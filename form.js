// ── Session ──────────────────────────────────────────────
const SESSION_KEY = 'vespera_session';
const DATA_KEY    = 'vespera_form';

let session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
let data    = JSON.parse(localStorage.getItem(DATA_KEY)    || '{}');

if (!session) {
  window.location.href = 'index.html';
}

// ── Night log rows ────────────────────────────────────────
const MAX_NIGHTS = 7;

function buildNightRows() {
  const tbody = document.getElementById('night-body');
  tbody.innerHTML = '';
  const saved = data.nights || [];

  for (let i = 0; i < MAX_NIGHTS; i++) {
    const n = saved[i] || {};
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i + 1}</td>
      <td><input type="date" data-night="${i}" data-field="date" value="${n.date || ''}" /></td>
      <td>
        <select data-night="${i}" data-field="dose">
          <option value="">–</option>
          <option ${n.dose === '1' ? 'selected' : ''}>1</option>
          <option ${n.dose === '2' ? 'selected' : ''}>2</option>
        </select>
      </td>
      <td><input type="number" data-night="${i}" data-field="latency" value="${n.latency || ''}" min="0" max="240" placeholder="min" /></td>
      <td><input type="number" data-night="${i}" data-field="wakeups" value="${n.wakeups || ''}" min="0" max="20" placeholder="#" /></td>
      <td>
        <select data-night="${i}" data-field="quality">
          <option value="">–</option>
          <option ${n.quality === '1' ? 'selected' : ''}>1</option>
          <option ${n.quality === '2' ? 'selected' : ''}>2</option>
          <option ${n.quality === '3' ? 'selected' : ''}>3</option>
          <option ${n.quality === '4' ? 'selected' : ''}>4</option>
          <option ${n.quality === '5' ? 'selected' : ''}>5</option>
        </select>
      </td>
      <td>
        <select data-night="${i}" data-field="grogginess">
          <option value="">–</option>
          <option ${n.grogginess === '1' ? 'selected' : ''}>1</option>
          <option ${n.grogginess === '2' ? 'selected' : ''}>2</option>
          <option ${n.grogginess === '3' ? 'selected' : ''}>3</option>
          <option ${n.grogginess === '4' ? 'selected' : ''}>4</option>
          <option ${n.grogginess === '5' ? 'selected' : ''}>5</option>
        </select>
      </td>`;
    tbody.appendChild(row);
  }

  tbody.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', saveNightRow);
  });
}

function saveNightRow(e) {
  const el = e.target;
  const i  = parseInt(el.dataset.night);
  const f  = el.dataset.field;
  if (!data.nights) data.nights = [];
  if (!data.nights[i]) data.nights[i] = {};
  data.nights[i][f] = el.value;
  persist();
}

// ── Persist helpers ───────────────────────────────────────
function persist() {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function readRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function readCheckboxes(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)]
    .map(el => el.value).join(', ');
}

function restoreRadio(name, value) {
  if (!value) return;
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}

function restoreCheckboxes(name, valueStr) {
  if (!valueStr) return;
  const vals = valueStr.split(', ');
  document.querySelectorAll(`input[name="${name}"]`).forEach(el => {
    if (vals.includes(el.value)) el.checked = true;
  });
}

// ── Save current step data ────────────────────────────────
function saveStep(step) {
  if (step === 1) {
    data.bottleNum  = document.getElementById('bottle-num').value.trim();
    data.dose       = readRadio('dose');
    data.timingMin  = document.getElementById('timing-min').value;
    data.howTaken   = readRadio('how-taken');
    data.nightsUsed = document.getElementById('nights-used').value;
  }
  if (step === 2) {
    data.rLook        = readRadio('r-look');
    data.rSmell       = readRadio('r-smell');
    data.rTasteStraight = readRadio('r-taste-straight');
    data.rTasteDiluted  = readRadio('r-taste-diluted');
    data.rMouthfeel   = readRadio('r-mouthfeel');
    data.sweetness    = readRadio('sweetness');
    data.tasteReorder = readRadio('taste-reorder');
  }
  if (step === 4) {
    data.rCalm       = readRadio('r-calm');
    data.rSleepOnset = readRadio('r-sleep-onset');
    data.rStayAsleep = readRadio('r-stay-asleep');
    data.rVsOthers   = readRadio('r-vs-others');
    data.onsetMin    = document.getElementById('onset-min').value;
    data.onsetFelt   = readRadio('onset-felt');
    data.sideEffects = readCheckboxes('side-effects');
    data.useAgain    = readRadio('use-again');
    data.pay46       = readRadio('pay-46');
    data.altPrice    = document.getElementById('alt-price').value;
    data.subscribe   = readRadio('subscribe');
    data.recommend   = readRadio('recommend');
    data.changeOne   = document.getElementById('change-one').value.trim();
    data.bestThing   = document.getElementById('best-thing').value.trim();
    data.anythingElse = document.getElementById('anything-else').value.trim();
  }
  persist();
}

// ── Restore saved data into fields ───────────────────────
function restoreStep(step) {
  if (step === 1) {
    if (data.bottleNum) document.getElementById('bottle-num').value = data.bottleNum;
    restoreRadio('dose', data.dose);
    if (data.timingMin) document.getElementById('timing-min').value = data.timingMin;
    restoreRadio('how-taken', data.howTaken);
    if (data.nightsUsed) document.getElementById('nights-used').value = data.nightsUsed;
  }
  if (step === 2) {
    restoreRadio('r-look',          data.rLook);
    restoreRadio('r-smell',         data.rSmell);
    restoreRadio('r-taste-straight',data.rTasteStraight);
    restoreRadio('r-taste-diluted', data.rTasteDiluted);
    restoreRadio('r-mouthfeel',     data.rMouthfeel);
    restoreRadio('sweetness',       data.sweetness);
    restoreRadio('taste-reorder',   data.tasteReorder);
  }
  if (step === 3) {
    buildNightRows();
  }
  if (step === 4) {
    restoreRadio('r-calm',        data.rCalm);
    restoreRadio('r-sleep-onset', data.rSleepOnset);
    restoreRadio('r-stay-asleep', data.rStayAsleep);
    restoreRadio('r-vs-others',   data.rVsOthers);
    if (data.onsetMin) document.getElementById('onset-min').value = data.onsetMin;
    restoreRadio('onset-felt',    data.onsetFelt);
    restoreCheckboxes('side-effects', data.sideEffects);
    restoreRadio('use-again',  data.useAgain);
    restoreRadio('pay-46',     data.pay46);
    if (data.altPrice) document.getElementById('alt-price').value = data.altPrice;
    restoreRadio('subscribe',  data.subscribe);
    restoreRadio('recommend',  data.recommend);
    if (data.changeOne)    document.getElementById('change-one').value = data.changeOne;
    if (data.bestThing)    document.getElementById('best-thing').value = data.bestThing;
    if (data.anythingElse) document.getElementById('anything-else').value = data.anythingElse;
  }
}

// ── Navigation ────────────────────────────────────────────
let currentStep = 1;

function goTo(step) {
  saveStep(currentStep);

  // Show/hide steps
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`step-${i}`).classList.add('hidden');
  }
  const target = document.getElementById(`step-${step}`);
  if (!target) return;
  target.classList.remove('hidden');

  // Update progress bar
  for (let i = 1; i <= 4; i++) {
    const ps = document.getElementById(`ps-${i}`);
    ps.classList.remove('active', 'done');
    if (i < step) ps.classList.add('done');
    if (i === step) ps.classList.add('active');
  }

  currentStep = step;
  restoreStep(step);
  window.scrollTo(0, 0);
}

// ── Submit ────────────────────────────────────────────────
async function submitForm() {
  saveStep(4);

  const payload = {
    ...session,
    submittedAt: new Date().toISOString(),
    ...data
  };

  const btn = document.getElementById('submit-btn');
  const err = document.getElementById('submit-error');
  btn.disabled = true;
  btn.textContent = 'Submitting…';
  err.textContent = '';

  try {
    await postToSheet(payload);
    localStorage.removeItem(DATA_KEY);
    // Show confirmation
    document.getElementById(`step-${currentStep}`).classList.add('hidden');
    document.getElementById('progress-bar').classList.add('hidden');
    document.getElementById('step-done').classList.remove('hidden');
    window.scrollTo(0, 0);
  } catch (e) {
    err.textContent = 'Submission failed — please try again or screenshot this page and send it to us.';
    btn.disabled = false;
    btn.textContent = 'Submit scorecard';
  }
}

// ── Init ──────────────────────────────────────────────────
restoreStep(1);
