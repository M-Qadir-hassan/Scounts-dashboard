"use client";

import { Banknote, Hash, Trophy, Tag, RefreshCw } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import dynamic from "next/dynamic";
const ExpenseChart = dynamic(() => import("@/components/dashboard/ExpenseChart").then(mod => mod.ExpenseChart), { 
  ssr: false, 
  loading: () => <Skeleton className="h-[320px] w-full rounded-xl" /> 
});
import { TransactionTable } from "@/components/dashboard/TransactionTable";
import { ExpenseForm } from "@/components/dashboard/ExpenseForm";
import { SheetConfigPanel } from "@/components/dashboard/SheetConfigPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpenses } from "@/hooks/useExpenses";
import { type ExpenseRow, formatPKR } from "@/lib/sheets-utils";
import { extractError } from "@/lib/error-utils";

type Role = "client" | "accountant" | "admin";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mostFrequentCategory(rows: ExpenseRow[]) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = r.account.trim() || "Uncategorized";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best: { k: string; n: number } | null = null;
  for (const [k, n] of counts.entries()) {
    if (!best || n > best.n) best = { k, n };
  }
  return best?.k ?? "—";
}

function useSummary(rows: ExpenseRow[]) {
  const total = rows.reduce((acc, r) => acc + r.amount, 0);
  const count = rows.length;
  const largest = rows.reduce((m, r) => (r.amount > m ? r.amount : m), 0);
  const category = mostFrequentCategory(rows);
  return { total, count, largest, category };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ClientDashboard({
  clientId,
  clientName,
  role,
  initialRows,
  initialError,
  sheetConfigured,
}: {
  clientId: string;
  clientName: string;
  role: Role;
  initialRows: ExpenseRow[];
  initialError?: string;
  sheetConfigured: boolean;
}) {
  const expenses = useExpenses({ clientId, role, initialRows, initialError });
  const summary = useSummary(expenses.filteredPeriodRows);

  const saveSheetConfig = async (sheetId: string, sheetRange: string) => {
    if (role !== "admin") return;
    try {
      const res = await fetch("/api/admin/client-sheet", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId, sheetId, sheetRange }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(extractError(json, "Save failed"));
      }
      await expenses.refresh();
    } catch {
      // Error handling via the hook
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          title={clientName}
          description={role === "client" ? "Read-only view of your expenses" : "Manage client expenses from Google Sheets"}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={expenses.refresh} disabled={expenses.loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Period selector */}
      <PeriodSelector
        period={expenses.period}
        date={expenses.anchorDate}
        onPeriodChange={expenses.setPeriod}
        onDateChange={expenses.setAnchorDate}
      />

      {/* Sheet config (if not set up) */}
      {!sheetConfigured ? (
        <SheetConfigPanel
          role={role}
          loading={expenses.loading}
          onSave={saveSheetConfig}
          onRefresh={expenses.refresh}
        />
      ) : null}

      {/* Error */}
      {expenses.error ? (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg md:text-xl font-medium">Something went wrong</div>
              <div className="text-sm md:text-base text-muted-foreground">{expenses.error}</div>
            </div>
            <Button type="button" onClick={expenses.refresh} disabled={expenses.loading}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      {/* Summary cards */}
      {expenses.loading && expenses.rows.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Banknote, label: "Total Expenses", value: formatPKR(summary.total) },
            { icon: Hash, label: "Transactions", value: summary.count.toLocaleString("en-PK") },
            { icon: Trophy, label: "Largest Expense", value: formatPKR(summary.largest) },
            { icon: Tag, label: "Top Category", value: summary.category },
          ].map((c) => (
            <SummaryCard key={c.label} icon={c.icon} label={c.label} value={c.value} />
          ))}
        </div>
      )}

      {/* Charts */}
      <ExpenseChart
        period={expenses.period}
        anchorDate={expenses.anchorDate}
        rows={expenses.filteredPeriodRows}
      />

      {/* Add form (writers only) */}
      {expenses.canWrite ? (
        <ExpenseForm
          draft={expenses.draft}
          loading={expenses.loading}
          onDraftChange={expenses.setDraft}
          onSubmit={expenses.submitAppend}
        />
      ) : null}

      {/* Transaction table */}
      <TransactionTable
        sortedRows={expenses.sortedRows}
        pageRows={expenses.pageRows}
        page={expenses.page}
        totalPages={expenses.totalPages}
        pageSize={expenses.pageSize}
        query={expenses.query}
        canWrite={expenses.canWrite}
        loading={expenses.loading}
        editing={expenses.editing}
        onQueryChange={expenses.setQuery}
        onPageChange={expenses.setPage}
        onToggleSort={expenses.toggleSort}
        onEdit={expenses.setEditing}
        onCancelEdit={() => expenses.setEditing(null)}
        onEditChange={expenses.setEditing}
        onSubmitUpdate={expenses.submitUpdate}
        onDelete={expenses.submitDelete}
      />
    </div>
  );
}
