/**
 * One-time script: adds column headers to both Google Sheets tabs.
 * Run with: node scripts/setup-sheets.mjs
 */

import { config } from "dotenv";
import { google } from "googleapis";

config({ path: ".env.local" });

const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const spreadsheetId = process.env.GOOGLE_SHEETS_SUBMISSIONS_ID;

if (!privateKey || !clientEmail || !spreadsheetId) {
  console.error("Missing env vars. Check .env.local");
  process.exit(1);
}

const auth = new google.auth.JWT({
  email: clientEmail,
  key: privateKey.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// Tab 2: Event Registrations (matches buildRow column order in route.ts)
const eventRegistrationsHeaders = [
  "Timestamp",
  "Email",
  "First Name",
  "Last Name",
  "Phone",
  "City/State",
  "Event / Source",
  "Event Type",
  "Experience Level",
  "Has Gear",
  "How Heard",
  "Hunter Safety Cert",
  "T-Shirt Size",
  "Emergency Contact Name",
  "Emergency Contact Phone",
  "Transportation",
  "Dietary / Medical",
  "Waiver",
  "Payment Method",
  "Free Text",
  "Company Name",
  "Opportunity Interest",
  "Budget Range",
  "Subject",
  "Registration Status",
  "Payment Status",
  "Notes",
];

// Tab 1: All Contacts (simple contact directory)
const allContactsHeaders = [
  "Timestamp",
  "Email",
  "First Name",
  "Last Name",
  "Phone",
  "City/State",
  "Source",
  "Role",
  "Status",
  "Notes",
];

async function addHeaders(sheetName, headers) {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
    console.log(`✓ Headers added to "${sheetName}"`);
  } catch (err) {
    console.error(`✗ Failed on "${sheetName}":`, err.message);
  }
}

await addHeaders("Event Registrations", eventRegistrationsHeaders);
await addHeaders("All Contacts", allContactsHeaders);

console.log("\nDone! Headers are set.");
