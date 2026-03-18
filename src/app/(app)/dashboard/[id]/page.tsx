import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";
import { getClientSheetData } from "@/lib/sheets-service";
import { adminDb } from "@/lib/supabase-admin";
import type { ExpenseRow } from "@/lib/sheets-utils";

type Role = "client" | "accountant" | "admin";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const role = (user.app_metadata?.role ?? "client") as Role;
  if (role === "client" && id !== user.id) {
    redirect(`/dashboard/${user.id}`);
  }

  if (role === "accountant") {
    const { data: assignment } = await adminDb
      .from("assignments")
      .select("id")
      .eq("accountant_id", user.id)
      .eq("client_id", id)
      .maybeSingle();
      
    if (!assignment) {
      redirect("/accountant");
    }
  }

  let initialError: string | undefined;
  let rows: ExpenseRow[] = [];
  let clientName = "Client Dashboard";
  let sheetConfigured = false;
  let sheetRange: string | null = null;

  try {
    const { profile, rows: parsed } = await getClientSheetData(id);
    rows = parsed;
    clientName = profile?.company_name || profile?.full_name || profile?.email || clientName;
    sheetConfigured = !!profile?.sheet_id;
    sheetRange = profile?.sheet_range ?? null;
  } catch (e) {
    initialError = e instanceof Error ? e.message : "Failed to load sheet data";
  }

  return (
    <ClientDashboard
      clientId={id}
      clientName={clientName}
      role={role}
      initialRows={rows}
      initialError={initialError}
      sheetConfigured={sheetConfigured}
    />
  );
}

