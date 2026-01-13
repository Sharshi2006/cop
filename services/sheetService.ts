import { LogEntry } from "../types";

/**
 * The SCRIPT_URL must be the "Web App" URL from your Google Apps Script deployment.
 * Ensure the deployment is set to "Anyone" has access.
 */
const SCRIPT_URL = `https://script.google.com/macros/s/AKfycbyt3kFW0YUshpnUmfctHddWxpmFhxD48optpNw76yG0OXJaP4BGzIiiDlyBnKy2oRnp/exec`;

/**
 * Appends batches of LogEntry objects to the connected Google Sheet.
 * We use a clean JSON string as the body and 'text/plain' to avoid CORS preflight.
 */
export const appendToGoogleSheet = async (entries: LogEntry[]): Promise<boolean> => {
  if (!entries || entries.length === 0) return true;

  try {
    // Standardize data keys to match the Apps Script expectations
    const payload = entries.map(e => ({
      scNo: e.scNo ? String(e.scNo).trim() : "N/A",
      dtrCode: e.dtrCode ? String(e.dtrCode).trim() : "N/A",
      feederName: e.feederName ? String(e.feederName).trim() : "N/A",
      location: e.location ? String(e.location).trim() : "N/A",
      timestamp: e.timestamp || new Date().toLocaleString()
    }));

    console.log("📤 Sending payload to Google Sheets:", payload);

    // Apps Script redirects on POST, so 'no-cors' is necessary for direct browser calls.
    // This mode won't allow us to read the response, but it guarantees the data reaches the server
    // if the URL and permissions are correct.
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(payload),
    });

    // In 'no-cors', we assume success if no network error occurs.
    return true;
  } catch (error) {
    console.error("❌ Google Sheets Append Failed:", error);
    return false;
  }
};
