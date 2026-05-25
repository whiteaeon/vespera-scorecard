// Vespera Pilot Scorecard — Google Apps Script backend
// Deploy this as a Web App: Execute as "Me", Access "Anyone"
// Paste the deployment URL into submit.js and dashboard.js

const SHEET_NAME = 'Responses';

const COLUMNS = [
  'submittedAt','key','name','ageRange','startedAt',
  'bottleNum','dose','timingMin','howTaken','nightsUsed',
  'rLook','rSmell','rTasteStraight','rTasteDiluted','rMouthfeel',
  'sweetness','tasteReorder',
  'rCalm','rSleepOnset','rStayAsleep','rVsOthers',
  'onsetMin','onsetFelt','sideEffects',
  'useAgain','pay46','altPrice','subscribe','recommend',
  'changeOne','bestThing','anythingElse',
  // nights 1–7 flattened
  'n1date','n1latency','n1wakeups','n1quality','n1grogginess',
  'n2date','n2latency','n2wakeups','n2quality','n2grogginess',
  'n3date','n3latency','n3wakeups','n3quality','n3grogginess',
  'n4date','n4latency','n4wakeups','n4quality','n4grogginess',
  'n5date','n5latency','n5wakeups','n5quality','n5grogginess',
  'n6date','n6latency','n6wakeups','n6quality','n6grogginess',
  'n7date','n7latency','n7wakeups','n7quality','n7grogginess',
];

function getOrCreateSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  }
  return sheet;
}

function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();
    const nights = data.nights || [];

    const row = COLUMNS.map(col => {
      const m = col.match(/^n(\d)(date|latency|wakeups|quality|grogginess)$/);
      if (m) {
        const night = nights[parseInt(m[1]) - 1] || {};
        return night[m[2]] ?? '';
      }
      return data[col] ?? '';
    });

    // Upsert by session key: replace existing row if same tester resubmits
    const values = sheet.getDataRange().getValues();
    const keyCol = COLUMNS.indexOf('key');
    let updated  = false;
    for (let i = 1; i < values.length; i++) {
      if (values[i][keyCol] === data.key) {
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        updated = true;
        break;
      }
    }
    if (!updated) sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (e.parameter.action !== 'read') {
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }

  const sheet  = getOrCreateSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return json({ rows: [] });
  }

  const headers = values[0];
  const rows = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });

    // Re-pack nights array
    obj.nights = [];
    for (let n = 1; n <= 7; n++) {
      obj.nights.push({
        date:      obj[`n${n}date`]      || '',
        latency:   obj[`n${n}latency`]   || '',
        wakeups:   obj[`n${n}wakeups`]   || '',
        quality:   obj[`n${n}quality`]   || '',
        grogginess:obj[`n${n}grogginess`]|| '',
      });
    }
    return obj;
  });

  return json({ rows });
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
