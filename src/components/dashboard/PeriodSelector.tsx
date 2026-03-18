"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Period, getFiscalYearLabel, getFiscalYearStart } from "@/lib/sheets-utils";

const PERIODS: { key: Period; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfWeekMonday(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const delta = (day + 6) % 7;
  return addDays(x, -delta);
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

function formatPeriodLabel(period: Period, date: Date) {
  const d = startOfDay(date);
  if (period === "daily") {
    return d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (period === "weekly") {
    const start = startOfWeekMonday(d);
    return `Week of ${start.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}`;
  }
  if (period === "monthly") {
    return d.toLocaleDateString("en-PK", { month: "long", year: "numeric" });
  }
  return getFiscalYearLabel(d);
}

function step(period: Period, date: Date, dir: -1 | 1) {
  const d = startOfDay(date);
  if (period === "daily") return addDays(d, dir);
  if (period === "weekly") return addDays(d, dir * 7);
  if (period === "monthly") return addMonths(d, dir);
  // yearly: jump fiscal years
  const fyStart = getFiscalYearStart(d);
  return new Date(fyStart.getFullYear() + dir, 6, 1);
}

export function PeriodSelector({
  period,
  date,
  onPeriodChange,
  onDateChange,
  className,
}: {
  period: Period;
  date: Date;
  onPeriodChange: (p: Period) => void;
  onDateChange: (d: Date) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            type="button"
            size="sm"
            variant={period === p.key ? "default" : "ghost"}
            onClick={() => onPeriodChange(p.key)}
            className={cn(
              "h-9 rounded-md px-3 text-sm md:text-base transition-colors",
              period !== p.key && "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => onDateChange(step(period, date, -1))}
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 rounded-lg border bg-card px-3 py-2 text-sm md:text-base font-medium text-foreground shadow-sm">
          <span className="truncate">{formatPeriodLabel(period, date)}</span>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={() => onDateChange(step(period, date, 1))}
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

