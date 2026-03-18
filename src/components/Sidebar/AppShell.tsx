"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/Sidebar/app-sidebar";
import { DynamicBreadcrumb } from "@/components/common/Dynamicbreadcrumb";

interface Profile {
  id:        string;
  full_name: string | null;
  email:     string;
  role:      string;
}

interface AppShellProps {
  role:        string;
  userId:      string;
  companyName?: string;
  user:        { name: string; email: string; avatar: string };
  clients:     Profile[];
  accountants: Profile[];
  children:    React.ReactNode;
}

export function AppShell({ role, userId, companyName, user, clients, accountants, children }: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          role={role}
          userId={userId}
          companyName={companyName}
          user={user}
          clients={clients}
          accountants={accountants}
        />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <DynamicBreadcrumb />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}