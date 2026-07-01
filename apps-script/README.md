# Turning on cross-device sync (optional, ~5 minutes)

Without this step, the site already works and saves everything -- but each
person's edits only live in their own browser (localStorage). Do this once
to make edits show up on both your phones automatically.

1. Go to sheets.google.com and create a new blank spreadsheet. Name it
   anything, e.g. "Italy Croatia Trip Data".
2. Extensions -> Apps Script. Delete the placeholder code and paste in the
   full contents of `apps-script/Code.gs` from this repo.
3. Click Deploy -> New deployment.
   - Click the gear icon next to "Select type" and choose "Web app".
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Click Deploy. Google will ask you to authorize the script -- this is
     the one-time click the sign-in flow can't be avoided, it's your own
     script running under your own account, no one else sees a login.
4. Copy the Web app URL it gives you (ends in `/exec`).
5. Open `js/config.js` in the repo and set:
   `const APPS_SCRIPT_URL = "PASTE_URL_HERE";`
6. Commit and push (or just ask Claude to do it). Reload the site --
   the sync status in the top bar should say "synced".

If you ever need to redeploy after editing Code.gs, use
Deploy -> Manage deployments -> Edit -> New version, so the URL stays the
same and you don't have to update config.js again.
