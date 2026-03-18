"use client";

import * as React from "react";
import {
  LayoutDashboard, Users, Settings,
  Building2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Logo } from "@/components/common/logo";
import { NavMain } from "@/components/Sidebar/nav-main";
import { NavProjects } from "@/components/Sidebar/nav-projects";
import {
  Sidebar, SidebarContent, SidebarFooter,
  SidebarHeader, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";

const NavUser = dynamic(
  () => import("./nav-user").then((m) => m.NavUser),
  { ssr: false }
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface Profile {
  id:        string;
  full_name: string | null;
  email:     string;
  role:      string;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  role:         string;
  userId:       string;
  companyName?: string;
  user:         { name: string; email: string; avatar: string };
  clients:      Profile[];
  accountants?: Profile[];
}

// ── Nav config ────────────────────────────────────────────────────────────────
const ADMIN_NAV = [
  { title: "Dashboard", url: "/admin",         icon: LayoutDashboard, exact: true },
  { title: "Users",     url: "/admin/users",    icon: Users },
  { title: "Settings",  url: "/admin/settings", icon: Settings },
];

const ACCOUNTANT_NAV = [
  { title: "Dashboard", url: "/accountant", icon: LayoutDashboard, exact: true },
];

const CLIENT_NAV = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

// ── AppSidebar ────────────────────────────────────────────────────────────────
export function AppSidebar({
  role, userId, companyName, user, clients, ...props
}: AppSidebarProps) {
  const { state } = useSidebar();
  const router   = useRouter();
  const supabase = createClient();

  const dynamicProjects = React.useMemo(() => {
    if (role === "admin") {
      // Admin can jump into individual client pages.
      return clients.map((c) => ({
        name: c.full_name ?? c.email,
        url:  `/admin/${c.id}`,
        icon: Building2,
      }));
    }

    if (role === "accountant") {
      // Accountants can jump into assigned client dashboards.
      return clients.map((c) => ({
        name: c.full_name ?? c.email,
        url:  `/dashboard/${c.id}`,
        icon: Building2,
      }));
    }

    return [];
  }, [role, clients]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-12 items-center px-2 transition-all duration-200 ease-in-out group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Logo variant="primary" size={state === "collapsed" ? "sm" : "md"} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavMain
          items={
            role === "admin"
              ? ADMIN_NAV
              : role === "accountant"
                ? ACCOUNTANT_NAV
                : CLIENT_NAV.map((i) => ({
                    ...i,
                    url: `/dashboard/${userId}`,
                    exact: true,
                  }))
          }
          label={
            role === "admin"
              ? "Admin"
              : role === "accountant"
                ? "Accountant"
                : (companyName?.trim() || "Client")
          }
        />
        <NavProjects
          projects={dynamicProjects}
          label={role === "admin" ? "Clients" : role === "accountant" ? "My Clients" : "My Account"}
        />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} onLogout={handleLogout} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}