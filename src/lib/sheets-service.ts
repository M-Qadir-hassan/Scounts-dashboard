import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { env } from "@/lib/env";
import { readSheet } from "@/lib/google-sheets";
import { parseSheetRows, type ExpenseRow, type Period, filterByPeriod, groupByCategory, groupByMonth } from "@/lib/sheets-utils";

export { parseSheetRows, filterByPeriod, groupByCategory, groupByMonth };
export type { ExpenseRow, Period };

type ClientSheetConfig = {
  sheet_id: string | null;
  sheet_range: string | null;
  company_name: string | null;
  full_name: string | null;
  email: string | null;
};

const adminDb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function getClientConfig(clientId: string): Promise<ClientSheetConfig | null> {
  const { data } = await adminDb
    .from("profiles")
    .select("sheet_id, sheet_range, company_name, full_name, email")
    .eq("id", clientId)
    .maybeSingle();
  return (data ?? null) as ClientSheetConfig | null;
}

export async function getClientSheetData(clientId: string) {
  return unstable_cache(
    async () => {
      const profile = await getClientConfig(clientId);
      if (!profile?.sheet_id) {
        return { profile, raw: [] as string[][], rows: [] as ExpenseRow[] };
      }

      const range = profile.sheet_range ?? "expenses!B3:F1000";
      const result = await readSheet(profile.sheet_id, range);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to read sheet");
      }
      const raw = result.data ?? [];
      const rows = parseSheetRows(raw);
      return { profile, raw, rows };
    },
    [`client-sheet-data-${clientId}`],
    { revalidate: 300, tags: [`client-sheet-${clientId}`] }
  )();
}
