import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/common/SectionHeader";
import { AdminUsers } from "@/components/admin/AdminUsers";

type ProfileRow = {
  id: string;
  email: string;
  role: string;
  active: boolean;
  full_name: string | null;
  company_name: string | null;
  sheet_id: string | null;
  sheet_range: string | null;
};

const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/login");

  const { data } = await adminDb
    .from("profiles")
    .select("id, email, role, active, full_name, company_name, sheet_id, sheet_range")
    .order("role", { ascending: true })
    .order("email", { ascending: true });

  return (
    <div className="p-6 space-y-6">
      <SectionHeader title="Users" description="Create users, manage roles, activation, and sheet configuration." />
      <AdminUsers initialUsers={(data ?? []) as ProfileRow[]} />
    </div>
  );
}
