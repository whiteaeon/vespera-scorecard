// Replace this URL after deploying your Google Apps Script web app.
// Instructions in README.md → "Step 2: Deploy the Apps Script"
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';

async function postToSheet(payload) {
  if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    // Dev mode: log to console instead of posting
    console.log('[vespera] Dev mode — would submit:', payload);
    await new Promise(r => setTimeout(r, 800));
    return;
  }

  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    // Apps Script requires text/plain to avoid CORS preflight on simple requests
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
