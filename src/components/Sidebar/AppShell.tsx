"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/Sidebar/app-sidebar";

interface Profile {
  id:           string;
  full_name:    string | null;
  company_name: string | null;
  email:        string;
  role:         string;
}

interface AppShellProps {
  role:        string;
  user:        { name: string; email: string; avatar: string };
  clients:     Profile[];
  accountants: Profile[];
  children:    React.ReactNode;
}

export function AppShell({ role, user, clients, accountants, children }: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar role={role} user={user} clients={clients} accountants={accountants} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}