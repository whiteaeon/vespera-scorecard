// ── Config ────────────────────────────────────────────────
// Set these before deploying. Password is checked client-side (fine for a
// 20-person pilot; not meant to guard sensitive data).
const DASHBOARD_PASSWORD = 'vespera2026';

// Same Apps Script URL used in submit.js — append ?action=read to fetch data
const APPS_SCRIPT_URL = (typeof window !== 'undefined' && window.APPS_SCRIPT_URL)
  ? window.APPS_SCRIPT_URL
  : 'YOUR_APPS_SCRIPT_URL_HERE';

// ── Login ─────────────────────────────────────────────────
function tryLogin() {
  const pw = document.getElementById('dash-pw').value;
  if (pw === DASHBOARD_PASSWORD) {
    sessionStorage.setItem('vespera_dash', '1');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dash-screen').classList.remove('hidden');
    loadData();
  } else {
    document.getElementById('pw-error').textContent = 'Incorrect password.';
  }
}

document.getElementById('dash-pw').addEventListener('keydown', e => {
  if (e.key === 'Enter') tryLogin();
});

if (sessionStorage.getItem('vespera_dash') === '1') {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dash-screen').classList.remove('hidden');
}

// ── Data loading ──────────────────────────────────────────
let allRows = [];

async function loadData() {
  if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    allRows = getSampleData();
    render(allRows);
    return;
  }

  try {
    const res  = await fetch(APPS_SCRIPT_URL + '?action=read');
    const json = await res.json();
    allRows = json.rows || [];
    render(allRows);
  } catch (e) {
    console.error('Failed to load data:', e);
  }
}

// ── Render ────────────────────────────────────────────────
let tasteChart, sleepChart;

function render(rows) {
  const complete = rows.filter(r => r.useAgain);          // submitted step 4
  const partial  = rows.filter(r => !r.useAgain);

  // Stats
  setText('stat-total',       rows.length);
  setText('stat-complete',    complete.length);
  setText('stat-avg-quality', avgSleepQuality(rows));
  setText('stat-recommend',   pctYesMaybe(rows, 'recommend'));

  renderGoNogo(complete);
  renderTasteChart(complete);
  renderSleepChart(rows);
  renderPriceSensitivity(complete);
  renderTesterList(rows);
  renderResponses(complete);
}

// ── GO / NO-GO ────────────────────────────────────────────
const SIGNALS = [
  { key: 'rCalm',       label: 'Helped wind down / feel calm' },
  { key: 'rSleepOnset', label: 'Helped fall asleep faster' },
  { key: 'rStayAsleep', label: 'Helped stay asleep' },
  { key: 'rVsOthers',   label: 'Felt better than alternatives' },
];
const GO_THRESHOLD = 3.5;
const MIN_RESPONSES = 5;

function renderGoNogo(rows) {
  const wrap = document.getElementById('gonogo-rows');
  wrap.innerHTML = '';

  let allGo = true;
  SIGNALS.forEach(sig => {
    const vals  = rows.map(r => parseFloat(r[sig.key])).filter(v => !isNaN(v));
    const avg   = vals.length ? (vals.reduce((a,b) => a+b, 0) / vals.length) : null;
    const score = avg !== null ? avg.toFixed(1) : '–';
    const cls   = avg === null ? '' : avg >= GO_THRESHOLD ? 'good' : avg >= 2.5 ? 'warn' : 'bad';
    if (avg === null || avg < GO_THRESHOLD) allGo = false;

    const row = document.createElement('div');
    row.className = 'signal-row';
    row.innerHTML = `<span>${sig.label}</span><span class="signal-score ${cls}">${score}</span>`;
    wrap.appendChild(row);
  });

  const badge = document.getElementById('gonogo-badge');
  if (rows.length < MIN_RESPONSES) {
    badge.className = 'go-badge pending';
    badge.textContent = `Pending (${rows.length}/${MIN_RESPONSES} complete)`;
  } else if (allGo) {
    badge.className = 'go-badge go';
    badge.textContent = '✓ GO';
  } else {
    badge.className = 'go-badge nogo';
    badge.textContent = '✗ NO-GO — review signals above';
  }
}

// ── Taste chart ───────────────────────────────────────────
function renderTasteChart(rows) {
  const labels = ['Look', 'Smell', 'Taste (straight)', 'Taste (diluted)', 'Mouthfeel'];
  const keys   = ['rLook', 'rSmell', 'rTasteStraight', 'rTasteDiluted', 'rMouthfeel'];
  const avgs   = keys.map(k => avg(rows, k));

  const ctx = document.getElementById('taste-chart').getContext('2d');
  if (tasteChart) tasteChart.destroy();
  tasteChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: avgs,
        backgroundColor: '#C2A15C',
        borderRadius: 4,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: '#E8E0D2' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ── Sleep quality chart ───────────────────────────────────
function renderSleepChart(rows) {
  const nightAvgs = [];
  for (let i = 0; i < 7; i++) {
    const vals = rows
      .flatMap(r => r.nights || [])
      .filter((_, idx) => idx % 7 === i)   // rough — each row has nights[0..6]
      .map(n => parseFloat(n?.quality))
      .filter(v => !isNaN(v));

    // Better: collect night i from each tester's nights array
    const perTester = rows
      .map(r => r.nights && r.nights[i] ? parseFloat(r.nights[i].quality) : NaN)
      .filter(v => !isNaN(v));

    nightAvgs.push(perTester.length ? (perTester.reduce((a,b) => a+b,0) / perTester.length) : null);
  }

  const ctx = document.getElementById('sleep-chart').getContext('2d');
  if (sleepChart) sleepChart.destroy();
  sleepChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Night 1','Night 2','Night 3','Night 4','Night 5','Night 6','Night 7'],
      datasets: [{
        data: nightAvgs,
        borderColor: '#3B2742',
        backgroundColor: 'rgba(59,39,66,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#C2A15C',
        pointRadius: 5,
        tension: 0.3,
        spanGaps: true,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: '#E8E0D2' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ── Price sensitivity ─────────────────────────────────────
function renderPriceSensitivity(rows) {
  const wrap = document.getElementById('price-bars');
  const yes   = rows.filter(r => r.pay46 === 'yes').length;
  const maybe = rows.filter(r => r.pay46 === 'maybe').length;
  const no    = rows.filter(r => r.pay46 === 'no').length;
  const total = rows.length || 1;

  wrap.innerHTML = [
    { label: 'Yes', n: yes, color: 'var(--green)' },
    { label: 'Maybe', n: maybe, color: '#e67e22' },
    { label: 'No', n: no, color: 'var(--red)' },
  ].map(({ label, n, color }) => `
    <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem; font-size:0.88rem;">
      <span style="min-width:3.5rem; font-weight:600;">${label}</span>
      <div style="flex:1; background:var(--bone-dark); border-radius:4px; height:18px; overflow:hidden;">
        <div style="width:${Math.round(n/total*100)}%; background:${color}; height:100%; border-radius:4px;"></div>
      </div>
      <span style="min-width:1.5rem; color:#666;">${n}</span>
    </div>`).join('');

  const alts = rows.filter(r => r.altPrice).map(r => `$${r.altPrice}`);
  const altWrap = document.getElementById('alt-prices');
  altWrap.innerHTML = alts.length
    ? `<p class="hint">Suggested alternative prices: ${alts.join(', ')}</p>`
    : '';
}

// ── Tester list ───────────────────────────────────────────
function renderTesterList(rows) {
  const wrap = document.getElementById('tester-list');
  if (!rows.length) { wrap.innerHTML = '<p class="hint">No submissions yet.</p>'; return; }

  wrap.innerHTML = rows.map(r => {
    const hasStep4 = !!r.useAgain;
    const nights   = (r.nights || []).filter(n => n && n.date).length;
    const statusCls  = hasStep4 ? 'complete' : nights > 0 ? 'partial' : 'pending';
    const statusText = hasStep4 ? 'Complete' : nights > 0 ? `${nights} nights logged` : 'Not started';
    const submitted  = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '–';
    return `
      <div class="tester-row">
        <span><strong>${esc(r.name)}</strong> <span class="text-sage" style="font-size:0.8rem;">${esc(r.ageRange || '')}</span></span>
        <span style="display:flex; gap:0.75rem; align-items:center;">
          <span class="hint">${submitted}</span>
          <span class="tester-status ${statusCls}">${statusText}</span>
        </span>
      </div>`;
  }).join('');
}

// ── Open responses ────────────────────────────────────────
function renderResponses(rows) {
  renderList('change-list', rows, 'changeOne');
  renderList('best-list',   rows, 'bestThing');
  renderList('other-list',  rows, 'anythingElse');
}

function renderList(id, rows, key) {
  const el = document.getElementById(id);
  const items = rows.filter(r => r[key]);
  el.innerHTML = items.length
    ? items.map(r => `<li><div class="resp-name">${esc(r.name)}</div>${esc(r[key])}</li>`).join('')
    : '<li class="hint">No responses yet.</li>';
}

// ── CSV export ────────────────────────────────────────────
function exportCSV() {
  if (!allRows.length) return;

  const cols = ['name','ageRange','bottleNum','dose','timingMin','howTaken','nightsUsed',
    'rLook','rSmell','rTasteStraight','rTasteDiluted','rMouthfeel','sweetness','tasteReorder',
    'rCalm','rSleepOnset','rStayAsleep','rVsOthers','onsetMin','onsetFelt','sideEffects',
    'useAgain','pay46','altPrice','subscribe','recommend','changeOne','bestThing','anythingElse',
    'submittedAt'];

  const header = cols.join(',');
  const rowsCSV = allRows.map(r =>
    cols.map(c => JSON.stringify(r[c] ?? '')).join(',')
  );

  const blob = new Blob([header + '\n' + rowsCSV.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vespera-pilot-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Helpers ───────────────────────────────────────────────
function avg(rows, key) {
  const vals = rows.map(r => parseFloat(r[key])).filter(v => !isNaN(v));
  return vals.length ? +(vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1) : null;
}

function avgSleepQuality(rows) {
  const vals = rows
    .flatMap(r => (r.nights || []).map(n => parseFloat(n?.quality)))
    .filter(v => !isNaN(v));
  return vals.length ? (vals.reduce((a,b) => a+b,0) / vals.length).toFixed(1) : '–';
}

function pctYesMaybe(rows, key) {
  const complete = rows.filter(r => r[key]);
  if (!complete.length) return '–';
  const n = complete.filter(r => r[key] === 'yes' || r[key] === 'maybe').length;
  return Math.round(n / complete.length * 100) + '%';
}

function setText(id, val) { document.getElementById(id).textContent = val ?? '–'; }

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Sample data (shown when Apps Script URL not set) ──────
function getSampleData() {
  return [
    {
      name: 'Sarah', ageRange: '25–34', bottleNum: '01', dose: '1 dropper',
      timingMin: '30', howTaken: 'in tea', nightsUsed: '7',
      rLook: '4', rSmell: '3', rTasteStraight: '3', rTasteDiluted: '4', rMouthfeel: '4',
      sweetness: 'just right', tasteReorder: 'maybe',
      rCalm: '4', rSleepOnset: '4', rStayAsleep: '3', rVsOthers: '4',
      onsetMin: '25', sideEffects: 'none',
      useAgain: 'yes', pay46: 'yes', subscribe: 'maybe', recommend: 'yes',
      changeOne: 'Slightly earthier smell would feel more herbal',
      bestThing: 'Fell asleep without the 3am spiral for the first time in weeks',
      anythingElse: 'Love the bottle — feels premium',
      submittedAt: '2026-06-16T20:00:00Z',
      nights: [
        { date:'2026-06-09', dose:'1', latency:'35', wakeups:'2', quality:'3', grogginess:'1' },
        { date:'2026-06-10', dose:'1', latency:'25', wakeups:'1', quality:'4', grogginess:'1' },
        { date:'2026-06-11', dose:'1', latency:'20', wakeups:'1', quality:'4', grogginess:'1' },
        { date:'2026-06-12', dose:'1', latency:'15', wakeups:'0', quality:'5', grogginess:'1' },
        { date:'2026-06-13', dose:'1', latency:'20', wakeups:'1', quality:'4', grogginess:'1' },
        { date:'2026-06-14', dose:'1', latency:'18', wakeups:'0', quality:'5', grogginess:'1' },
        { date:'2026-06-15', dose:'1', latency:'15', wakeups:'0', quality:'5', grogginess:'1' },
      ]
    },
    {
      name: 'Marcus', ageRange: '35–44', bottleNum: '02', dose: '2 droppers',
      timingMin: '45', howTaken: 'straight', nightsUsed: '6',
      rLook: '5', rSmell: '4', rTasteStraight: '2', rTasteDiluted: '3', rMouthfeel: '3',
      sweetness: 'not sweet enough', tasteReorder: 'no',
      rCalm: '3', rSleepOnset: '3', rStayAsleep: '2', rVsOthers: '3',
      onsetMin: '40', sideEffects: 'vivid dreams',
      useAgain: 'maybe', pay46: 'no', altPrice: '32', subscribe: 'no', recommend: 'maybe',
      changeOne: 'Taste is too bitter straight — need more sweetener or a different delivery',
      bestThing: 'Did feel calmer in the evenings even when sleep wasn\'t perfect',
      anythingElse: '',
      submittedAt: '2026-06-17T09:00:00Z',
      nights: [
        { date:'2026-06-09', dose:'2', latency:'50', wakeups:'3', quality:'2', grogginess:'2' },
        { date:'2026-06-10', dose:'2', latency:'40', wakeups:'2', quality:'3', grogginess:'2' },
        { date:'2026-06-11', dose:'2', latency:'35', wakeups:'2', quality:'3', grogginess:'1' },
        { date:'2026-06-12', dose:'2', latency:'30', wakeups:'1', quality:'4', grogginess:'1' },
        { date:'2026-06-13', dose:'2', latency:'30', wakeups:'2', quality:'3', grogginess:'1' },
        { date:'2026-06-14', dose:'2', latency:'25', wakeups:'1', quality:'4', grogginess:'1' },
      ]
    },
    {
      name: 'Lena', ageRange: '45–54', bottleNum: '03', dose: '1 dropper',
      timingMin: '20', howTaken: 'in water', nightsUsed: '7',
      rLook: '5', rSmell: '5', rTasteStraight: '4', rTasteDiluted: '5', rMouthfeel: '5',
      sweetness: 'just right', tasteReorder: 'yes',
      rCalm: '5', rSleepOnset: '5', rStayAsleep: '4', rVsOthers: '5',
      onsetMin: '20', sideEffects: 'none',
      useAgain: 'yes', pay46: 'yes', subscribe: 'yes', recommend: 'yes',
      changeOne: 'Nothing — honestly perfect',
      bestThing: 'Woke up without that groggy melatonin hangover',
      anythingElse: 'Would love a 1 oz travel size',
      submittedAt: '2026-06-18T15:00:00Z',
      nights: [
        { date:'2026-06-09', dose:'1', latency:'25', wakeups:'1', quality:'4', grogginess:'1' },
        { date:'2026-06-10', dose:'1', latency:'20', wakeups:'0', quality:'5', grogginess:'1' },
        { date:'2026-06-11', dose:'1', latency:'20', wakeups:'1', quality:'4', grogginess:'1' },
        { date:'2026-06-12', dose:'1', latency:'15', wakeups:'0', quality:'5', grogginess:'1' },
        { date:'2026-06-13', dose:'1', latency:'15', wakeups:'0', quality:'5', grogginess:'1' },
        { date:'2026-06-14', dose:'1', latency:'18', wakeups:'0', quality:'5', grogginess:'1' },
        { date:'2026-06-15', dose:'1', latency:'15', wakeups:'0', quality:'5', grogginess:'1' },
      ]
    },
  ];
}
