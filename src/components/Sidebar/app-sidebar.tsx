"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  Building2,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Logo } from "@/components/common/logo";
import { NavMain } from "@/components/Sidebar/nav-main";
import { NavProjects } from "@/components/Sidebar/nav-projects";
import { NavUser } from "@/components/Sidebar/nav-user";
import { TeamSwitcher } from "@/components/Sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string;
  role: string;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  role: string;
  user: { name: string; email: string; avatar: string };
  clients: Profile[]; // for admin: all clients; for accountant: assigned clients
  accountants?: Profile[]; // admin only
}

// ── Static nav per role ───────────────────────────────────────────────────────
const ADMIN_NAV = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    isActive: true,
    items: [],
  },
  { title: "Users", url: "/admin/users", icon: Users, items: [] },
  { title: "Settings", url: "/admin/settings", icon: Settings, items: [] },
];

const ACCOUNTANT_NAV = [
  {
    title: "Dashboard",
    url: "/accountant",
    icon: LayoutDashboard,
    isActive: true,
    items: [],
  },
  { title: "Reports", url: "/accountant/reports", icon: FileText, items: [] },
  { title: "Settings", url: "/accountant/settings", icon: Settings, items: [] },
];

// ── Admin team switcher options ───────────────────────────────────────────────
const ADMIN_TEAMS = [
  { name: "Clients", logo: Building2, plan: "View all clients" },
  { name: "Accountants", logo: UserCheck, plan: "View all accountants" },
];

// ── AppSidebar ────────────────────────────────────────────────────────────────
export function AppSidebar({
  role,
  user,
  clients,
  accountants = [],
  ...props
}: AppSidebarProps) {
  const [activeTeam, setActiveTeam] = React.useState(ADMIN_TEAMS[0].name);
  const router = useRouter();
  const supabase = createClient();

  // Dynamic project list based on team switcher (admin only)
  const dynamicProjects = React.useMemo(() => {
    if (role !== "admin") {
      // Accountant: show their assigned clients
      return clients.map((c) => ({
        name: c.company_name ?? c.full_name ?? c.email,
        url: `/admin/client/${c.id}`,
        icon: Building2,
      }));
    }
    // Admin: switch between clients and accountants
    const list = activeTeam === "Clients" ? clients : accountants;
    const base =
      activeTeam === "Clients" ? "/admin/client" : "/admin/accountant";
    return list.map((p) => ({
      name: p.company_name ?? p.full_name ?? p.email,
      url: `${base}/${p.id}`,
      icon: activeTeam === "Clients" ? Building2 : UserCheck,
    }));
  }, [role, activeTeam, clients, accountants]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = role === "admin" ? ADMIN_NAV : ACCOUNTANT_NAV;
  const sectionLabel = role === "admin" ? activeTeam : "My Clients";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {role === "admin" ? (
          <TeamSwitcher
            teams={ADMIN_TEAMS}
            onTeamChange={(name) => setActiveTeam(name)}
          />
        ) : (
          <div className="flex h-12 items-center px-2">
            <Logo variant="primary" size="md" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <NavMain
          items={navItems}
          label={
            role === "admin"
              ? "Admin"
              : role === "accountant"
                ? "Accountant"
                : "Menu"
          }
        />
        <NavProjects projects={dynamicProjects} label={sectionLabel} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} onLogout={handleLogout} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
