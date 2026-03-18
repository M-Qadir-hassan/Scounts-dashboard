import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {AppShell} from "@/components/Sidebar/AppShell";
import { createClient } from "@supabase/supabase-js";


async function getSidebarData(role: string, userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  if (role === "admin") {
    const [{ data: clients }, { data: accountants }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, company_name, email, role")
        .eq("role", "client"),
      supabase
        .from("profiles")
        .select("id, full_name, company_name, email, role")
        .eq("role", "accountant"),
    ]);
    return { clients: clients ?? [], accountants: accountants ?? [] };
  }

  // Accountant: fetch only assigned clients
  const { data: assignments } = await supabase
    .from("assignments")
    .select("client_id")
    .eq("accountant_id", userId);

  const clientIds = (assignments ?? []).map(
    (a: { client_id: string }) => a.client_id,
  );
  if (!clientIds.length) return { clients: [], accountants: [] };

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, company_name, email, role")
    .in("id", clientIds);

  return { clients: clients ?? [], accountants: [] };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = (user.app_metadata?.role ?? "client") as string;
  const { clients, accountants } = await getSidebarData(role, user.id);

  const sidebarUser = {
    name: user.user_metadata?.full_name ?? user.email ?? "User",
    email: user.email ?? "",
    avatar: user.user_metadata?.avatar_url ?? "",
  };

  return (
  <AppShell
    role={role}
    user={sidebarUser}
    clients={clients}
    accountants={accountants}
  >
    {children}
  </AppShell>
  );
}
