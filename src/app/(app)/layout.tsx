import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/Sidebar/AppShell";

interface Profile {
  id:        string;
  full_name: string | null;
  email:     string;
  role:      string;
}

async function getCompanyName(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data } = await supabase
    .from("profiles")
    .select("company_name")
    .eq("id", userId)
    .maybeSingle();

  return (data as { company_name?: string | null } | null)?.company_name ?? null;
}

async function getSidebarData(role: string, userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Clients don't have "assigned clients/accountants" lists.
  if (role === "client") {
    return { clients: [] as Profile[], accountants: [] as Profile[] };
  }

  if (role === "admin") {
    const [{ data: clients }, { data: accountants }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, role").eq("role", "client"),
      supabase.from("profiles").select("id, full_name, email, role").eq("role", "accountant"),
    ]);
    return { clients: (clients ?? []) as Profile[], accountants: (accountants ?? []) as Profile[] };
  }

  const { data: assignments } = await supabase
    .from("assignments")
    .select("client_id")
    .eq("accountant_id", userId);

  const clientIds = (assignments ?? []).map((a: { client_id: string }) => a.client_id);
  if (!clientIds.length) return { clients: [] as Profile[], accountants: [] as Profile[] };

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("id", clientIds);

  return { clients: (clients ?? []) as Profile[], accountants: [] as Profile[] };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  // Verify the JWT server-side — getUser() validates with auth server, not just cookies.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = (user.app_metadata?.role ?? "client") as string;
  const userId = user.id;
  const email = user.email ?? "";
  const name = user.user_metadata?.full_name ?? email ?? "User";
  const avatar = user.user_metadata?.avatar_url ?? "";

  const companyName = role === "client"
    ? await unstable_cache(
        () => getCompanyName(userId),
        [`company-name-${userId}`],
        { revalidate: 300 }
      )()
    : null;

  // ── Cache sidebar data 60s per user — skips DB on repeat navigations ──────
  const { clients, accountants } = await unstable_cache(
    () => getSidebarData(role, userId),
    [`sidebar-${role}-${userId}`],
    { revalidate: 60 }
  )();

  return (
    <AppShell
      role={role}
      userId={userId}
      companyName={companyName ?? undefined}
      user={{
        name,
        email,
        avatar,
      }}
      clients={clients}
      accountants={accountants}
    >
      {children}
    </AppShell>
  );
}