// Paste this into Extensions > Apps Script inside a new Google Sheet.
// It turns that Sheet into a tiny free shared database for the trip
// planner site: every edit either of you makes in the browser is sent
// here and stored in cell A1 of a "State" tab, as one JSON blob.
// No login screen appears for site visitors -- this runs under YOUR
// Google account once you deploy it, and the deployed URL is what the
// site calls.

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("State");
  if (!sheet) {
    sheet = ss.insertSheet("State");
    sheet.getRange("A1").setValue("");
  }
  return sheet;
}

function doGet(e) {
  const sheet = getSheet_();
  const raw = sheet.getRange("A1").getValue();
  const body = raw ? raw : "null";
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  if (payload.action === "saveAll") {
    const sheet = getSheet_();
    sheet.getRange("A1").setValue(JSON.stringify(payload.data));
    sheet.getRange("B1").setValue(new Date().toISOString());
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
