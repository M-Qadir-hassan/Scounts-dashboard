"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const LABELS: Record<string, string> = {
  admin:       "Admin",
  accountant:  "Accountant",
  dashboard:   "Dashboard",
  users:       "Users",
  settings:    "Settings",
  reports:     "Reports",
  client:      "Client",
  clients:     "Clients",
  accountants: "Accountants",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function DynamicBreadcrumb() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const name         = searchParams.get("name");

  const segments = pathname
    .split("/")
    .filter((s) => s && !s.startsWith("("));

  // Hide UUIDs that have no name (e.g. /dashboard/[id] shows just "Dashboard")
  const visible = segments.filter((s, i) => {
    if (!UUID_RE.test(s)) return true;
    return i === segments.length - 1 && !!name;
  });

  function toLabel(segment: string, isLast: boolean): string {
    if (UUID_RE.test(segment)) return isLast && name ? name : "";
    return LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {visible.map((segment, i) => {
          const isLast = i === visible.length - 1;
          const href   = "/" + segments.slice(0, segments.indexOf(segment) + 1).join("/");
          const label  = toLabel(segment, isLast);

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="text-primary" />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}