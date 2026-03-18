"use client";

import * as React from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ExpenseRow,
  type Period,
  formatPKR,
  getFiscalYearLabel,
  parseSheetDate,
  groupByCategory,
} from "@/lib/sheets-utils";

// ── Bar chart data builder ────────────────────────────────────────────────────

function buildBarData(period: Period, anchor: Date, rows: ExpenseRow[]) {
  if (period === "monthly" || period === "yearly") {
    const fyStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    const monthly = new Map<string, number>([
      ["Jul", 0], ["Aug", 0], ["Sep", 0], ["Oct", 0], ["Nov", 0], ["Dec", 0],
      ["Jan", 0], ["Feb", 0], ["Mar", 0], ["Apr", 0], ["May", 0], ["Jun", 0],
    ]);
    const fyLabel = getFiscalYearLabel(fyStart);
    for (const r of rows) {
      const d = parseSheetDate(r.date);
      if (!d) continue;
      const m = d.toLocaleString("en-US", { month: "short" });
      if (!monthly.has(m)) continue;
      monthly.set(m, (monthly.get(m) ?? 0) + r.amount);
    }
    return {
      title: period === "yearly" ? `Monthly totals (${fyLabel})` : "Monthly totals",
      data: Array.from(monthly.entries()).map(([label, total]) => ({ label, total })),
    };
  }

  const totals = new Map<string, number>();
  for (const r of rows) {
    const d = parseSheetDate(r.date);
    if (!d) continue;
    const label = d.toLocaleDateString("en-PK", { day: "2-digit", month: "short" });
    totals.set(label, (totals.get(label) ?? 0) + r.amount);
  }
  const data = Array.from(totals.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return { title: "Daily totals", data };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ExpenseChart = React.memo(function ExpenseChart({
  period,
  anchorDate,
  rows,
}: {
  period: Period;
  anchorDate: Date;
  rows: ExpenseRow[];
}) {
  const bar = buildBarData(period, anchorDate, rows);
  const categoryTotals = groupByCategory(rows).slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm md:text-base font-medium">{bar.title}</div>
          <div className="text-xs md:text-sm text-muted-foreground">
            {period === "yearly" ? getFiscalYearLabel(anchorDate) : period.toUpperCase()}
          </div>
        </div>
        <div className="h-64 min-w-0 min-h-[256px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
            <BarChart data={bar.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <ReTooltip
                formatter={(v) => formatPKR(Number(v))}
                contentStyle={{ borderRadius: 12, borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 text-lg md:text-xl font-medium">Top categories</div>
        <div className="space-y-3">
          {categoryTotals.length ? (
            categoryTotals.map((c) => (
              <div key={c.category} className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-sm md:text-base">
                  <div className="truncate">{c.category}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">{formatPKR(c.total)}</div>
                </div>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                    style={{
                      width: `${Math.min(100, Math.round((c.total / (categoryTotals[0]?.total || 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm md:text-base text-muted-foreground">No data for this period.</div>
          )}
        </div>
      </div>
    </div>
  );
});
