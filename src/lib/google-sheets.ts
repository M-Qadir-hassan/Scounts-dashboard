import "server-only";
import { google, sheets_v4 } from "googleapis";
import { env } from "@/lib/env";

// ── Auth ──────────────────────────────────────────────────────────────────────
let cachedSheetsClient: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (!cachedSheetsClient) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key:  env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    cachedSheetsClient = google.sheets({ version: "v4", auth });
  }
  return cachedSheetsClient;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SheetRow {
  rowIndex: number;
  values:   string[];
}

export interface SheetsResult<T = unknown> {
  success: boolean;
  data?:   T;
  error?:  string;
}

// ── Read ──────────────────────────────────────────────────────────────────────
export async function readSheet(
  sheetId: string,
  range:   string
): Promise<SheetsResult<string[][]>> {
  try {
    const sheets = getSheetsClient();
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    return { success: true, data: data.values ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Read failed" };
  }
}

// ── Append ────────────────────────────────────────────────────────────────────
export async function appendRow(
  sheetId: string,
  range:   string,
  values:  string[]
): Promise<SheetsResult> {
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId:     sheetId,
      range,
      valueInputOption:  "USER_ENTERED",
      insertDataOption:  "INSERT_ROWS",
      requestBody:       { values: [values] },
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Append failed" };
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateRow(
  sheetId:  string,
  range:    string,
  values:   string[]
): Promise<SheetsResult> {
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId:    sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody:      { values: [values] },
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}

// ── Delete (clears a row) ─────────────────────────────────────────────────────
export async function deleteRow(
  sheetId:  string,
  range:    string
): Promise<SheetsResult> {
  try {
    const sheets = getSheetsClient();
    
    // Parse sheet name and row index from something like "expenses!B15:F15"
    const [sheetName, cellRange] = range.split("!");
    const match = cellRange.match(/\d+/);
    if (!match) throw new Error("Could not parse row index from range");
    
    const rowIndex = parseInt(match[0], 10) - 1; // 0-indexed for the API
    
    // Fetch spreadsheet info to get the numeric sheet ID
    const info = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheetProps = info.data.sheets?.find(s => s.properties?.title === sheetName);
    const numericSheetId = sheetProps?.properties?.sheetId;
    
    if (numericSheetId === undefined) {
      throw new Error(`Could not find numeric ID for sheet tab '${sheetName}'`);
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: numericSheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Delete failed" };
  }
}