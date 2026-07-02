// Set this to your deployed Google Apps Script Web App URL to enable
// cross-device sync (see apps-script/README.md for setup steps).
// Leave it as "" to run in local-only mode (localStorage per browser).
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwsaTH2W2xLPNuUjwB9GbL6zdHDHj9PbNTAMpiY4avlBKDzubyIoTlShIKbpMqlDDRd3A/exec";

// Optional: set this to a Google Maps JavaScript API key to enable the
// "Auto-fill" button on restaurant / thing-to-do forms (looks up the place by
// name + city and fills in the category and a short description for you).
// Leave it as "" to hide auto-fill and enter everything by hand.
//
// How to get a key (takes about 5 minutes, free tier covers normal trip use):
//   1. Go to https://console.cloud.google.com/ and create a project (or reuse one).
//   2. In "APIs & Services" > "Library", enable "Maps JavaScript API" and "Places API (New)".
//   3. In "APIs & Services" > "Credentials", click "Create credentials" > "API key".
//   4. Click the new key, then under "Application restrictions" choose
//      "Websites" and add your GitHub Pages URL, e.g.
//      andrewjc29.github.io/italy-croatia-trip-2026/*
//   5. Under "API restrictions" choose "Restrict key" and select the two
//      APIs from step 2. Save, then paste the key below.
const GOOGLE_MAPS_API_KEY = "";
