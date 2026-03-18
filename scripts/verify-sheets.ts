import "dotenv/config";

import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const clientId = process.env.VERIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("Set VERIFY_CLIENT_ID env var to a profiles.id");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase env vars");

  const supa = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supa
    .from("profiles")
    .select("sheet_id, sheet_range")
    .eq("id", clientId)
    .maybeSingle();

  if (error) throw error;
  console.log("profile", data);

  if (!data?.sheet_id) {
    console.log("No sheet_id set");
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const range = data.sheet_range ?? "expenses!B3:F1000";
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: data.sheet_id,
    range,
  });

  console.log("valuesLen", resp.data.values?.length ?? 0);
  console.log("first5", (resp.data.values ?? []).slice(0, 5));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

