# Vespera Pilot Scorecard

Web app for collecting and summarizing pilot tester feedback for Vespera Sleep Tincture.

## Setup (15 minutes)

### Step 1 — Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `vespera-scorecard`) — set it to **private**
2. Push this folder to it
3. Go to Settings → Pages → Source: `main` branch, `/ (root)` folder
4. Your site will be live at `https://yourusername.github.io/vespera-scorecard/`

### Step 2 — Set up the Google Sheet + Apps Script

1. Create a new Google Sheet (name it anything — "Vespera Pilot Data")
2. Click **Extensions → Apps Script**
3. Delete the default code and paste in the contents of `apps-script.gs`
4. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click Deploy, copy the **Web app URL**

### Step 3 — Wire up the URL

Paste the URL from Step 2 into two places:

**`submit.js` line 3:**
```js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
```

**`dashboard.js` line 5:**
```js
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE'
```

Replace `YOUR_APPS_SCRIPT_URL_HERE` in both files, commit, and push.

### Step 4 — Change the dashboard password

In `dashboard.js` line 3:
```js
const DASHBOARD_PASSWORD = 'vespera2026';
```
Change it to something only you know.

---

## Sending links to testers

Send each tester:
```
https://yourusername.github.io/vespera-scorecard/
```

That's it — they enter their name, get a session, and can return to add nightly entries.

## Viewing results

Go to:
```
https://yourusername.github.io/vespera-scorecard/dashboard.html
```

Enter your dashboard password. Data refreshes on load; click **Refresh data** to re-fetch.

The raw Google Sheet is also always available at the spreadsheet URL.

## GO / NO-GO logic

The dashboard flags a GO when:
- At least 5 complete submissions (step 4 filled in)
- All four efficacy averages ≥ 3.5 out of 5

If any signal is below 3.5, the badge shows NO-GO with the weak signal highlighted.

---

## File map

| File | Purpose |
|---|---|
| `index.html` | Tester landing page — name entry |
| `form.html` | 4-step scorecard form |
| `form.js` | Step logic, localStorage, submit call |
| `submit.js` | POST to Apps Script (swap URL here) |
| `dashboard.html` | Your results dashboard |
| `dashboard.js` | Data fetch, charts, GO/NO-GO logic |
| `apps-script.gs` | Paste into Google Apps Script editor |
| `style.css` | Brand styles (Vespera palette) |
