"use client";

import { type LucideIcon, MoreHorizontal } from "lucide-react";
import {
  SidebarGroup, SidebarGroupLabel, SidebarMenu,
  SidebarMenuAction, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

interface Project {
  name: string;
  url:  string;
  icon: LucideIcon;
}

export function NavProjects({
  projects,
  label = "Projects",
}: {
  projects: Project[];
  label?:   string;
}) {
  if (!projects.length) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <Link href={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}