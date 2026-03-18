"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SummaryCard({
  icon: Icon,
  label,
  value,
  trend,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: { label: string; positive?: boolean };
  className?: string;
}) {
  return (
    <Card className={cn("border-border/60 shadow-sm transition-base hover:shadow-md hover:scale-[1.02]", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-xs md:text-sm font-medium text-muted-foreground">{label}</div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary ring-1 ring-primary/15">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">{value}</div>
        {trend ? (
          <div
            className={cn(
              "text-xs md:text-sm",
              trend.positive === undefined
                ? "text-muted-foreground"
                : trend.positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
            )}
          >
            {trend.label}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

