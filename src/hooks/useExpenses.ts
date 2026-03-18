"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  type ExpenseRow,
  type Period,
  filterByPeriod,
  parseSheetRows,
} from "@/lib/sheets-utils";
import { extractError } from "@/lib/error-utils";

type SortKey = "date" | "amount";
type SortDir = "asc" | "desc";

interface DraftRow {
  date: string;
  description: string;
  account: string;
  amount: string;
  month: string;
}

interface EditingRow extends DraftRow {
  rowIndex: number;
}

const EMPTY_DRAFT: DraftRow = { date: "", description: "", account: "", amount: "", month: "" };
const PAGE_SIZE = 20;

function normalizeMonth(m: string) {
  return m.trim().replace(/\s+/g, " ");
}

function rangeForRow(rowIndex: number) {
  return `expenses!B${rowIndex}:F${rowIndex}`;
}

function parseSheetDate(input: string): Date | null {
  const MONTHS: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const s = input.trim();
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(s);
  if (!m) return null;
  const day = Number(m[1]);
  const mon = MONTHS[m[2]];
  const year = Number(m[3]);
  if (!Number.isFinite(day) || !Number.isFinite(year) || mon === undefined) return null;
  const d = new Date(year, mon, day);
  if (d.getFullYear() !== year || d.getMonth() !== mon || d.getDate() !== day) return null;
  return d;
}

function safeDateKey(row: ExpenseRow) {
  const d = parseSheetDate(row.date);
  return d ? d.getTime() : 0;
}

export function useExpenses({
  clientId,
  role,
  initialRows,
  initialError,
}: {
  clientId: string;
  role: string;
  initialRows: ExpenseRow[];
  initialError?: string;
}) {
  const router = useRouter();
  const canWrite = role === "admin" || role === "accountant";

  const [period, setPeriod] = React.useState<Period>("monthly");
  const [anchorDate, setAnchorDate] = React.useState(() => new Date());

  const [rows, setRows] = React.useState<ExpenseRow[]>(initialRows);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError ?? null);

  const [queryInput, setQueryInput] = React.useState("");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => setQuery(queryInput), 300);
    return () => clearTimeout(handler);
  }, [queryInput]);
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [page, setPage] = React.useState(1);

  const [draft, setDraft] = React.useState<DraftRow>(EMPTY_DRAFT);
  const [editing, setEditing] = React.useState<EditingRow | null>(null);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sheets?clientId=${encodeURIComponent(clientId)}`, { method: "GET" });
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(extractError(json, "Failed to load"));
      }
      const data = (json as { data: string[][] }).data;
      setRows(parseSheetRows(data ?? []));
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [clientId, router]);

  // ── Filtered / sorted / paged ─────────────────────────────────────────────
  const filteredPeriodRows = React.useMemo(() => filterByPeriod(rows, period, anchorDate), [rows, period, anchorDate]);

  const searchedRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filteredPeriodRows;
    return filteredPeriodRows.filter((r) =>
      r.description.toLowerCase().includes(q) || r.account.toLowerCase().includes(q)
    );
  }, [filteredPeriodRows, query]);

  const sortedRows = React.useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const list = [...searchedRows];
    list.sort((a, b) => {
      if (sortKey === "amount") return dir * (a.amount - b.amount);
      return dir * (safeDateKey(a) - safeDateKey(b));
    });
    return list;
  }, [searchedRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = React.useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page, totalPages]);

  React.useEffect(() => {
    setPage(1);
  }, [period, query, sortKey, sortDir]);

  // ── Toggle sort ───────────────────────────────────────────────────────────
  const toggleSort = React.useCallback((k: SortKey) => {
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir("desc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }, [sortKey]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const submitAppend = React.useCallback(async () => {
    if (!canWrite) return;
    setLoading(true);
    setError(null);
    try {
      const values = [
        draft.date.trim(),
        draft.description.trim(),
        draft.account.trim(),
        String(Number(draft.amount.replace(/,/g, "")) || 0),
        normalizeMonth(draft.month),
      ];
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId, values }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(extractError(json, "Write failed"));
      }
      setDraft(EMPTY_DRAFT);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Write failed");
    } finally {
      setLoading(false);
    }
  }, [canWrite, draft, clientId, refresh]);

  const submitUpdate = React.useCallback(async () => {
    if (!canWrite || !editing) return;
    setLoading(true);
    setError(null);
    try {
      const values = [
        editing.date.trim(),
        editing.description.trim(),
        editing.account.trim(),
        String(Number(editing.amount.replace(/,/g, "")) || 0),
        normalizeMonth(editing.month),
      ];
      const range = rangeForRow(editing.rowIndex);
      const res = await fetch("/api/sheets", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId, range, values }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(extractError(json, "Update failed"));
      }
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }, [canWrite, editing, clientId, refresh]);

  const submitDelete = React.useCallback(async (rowIndex: number) => {
    if (!canWrite) return;
    setLoading(true);
    setError(null);
    try {
      const range = rangeForRow(rowIndex);
      const res = await fetch("/api/sheets", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId, range }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        throw new Error(extractError(json, "Delete failed"));
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }, [canWrite, clientId, refresh]);

  return {
    // State
    period, setPeriod,
    anchorDate, setAnchorDate,
    rows, loading, error,
    query: queryInput, setQuery: setQueryInput,
    sortKey, sortDir,
    page, setPage,
    draft, setDraft,
    editing, setEditing,
    canWrite,

    // Derived
    filteredPeriodRows,
    sortedRows,
    pageRows,
    totalPages,
    pageSize: PAGE_SIZE,

    // Actions
    refresh,
    toggleSort,
    submitAppend,
    submitUpdate,
    submitDelete,
  };
}
