"use client";

import * as React from "react";

import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ExpenseRow, formatPKR } from "@/lib/sheets-utils";

type SortKey = "date" | "amount";

interface EditingRow {
  rowIndex: number;
  date: string;
  description: string;
  account: string;
  amount: string;
  month: string;
}

export const TransactionTable = React.memo(function TransactionTable({
  sortedRows,
  pageRows,
  page,
  totalPages,
  pageSize,
  query,
  canWrite,
  loading,
  editing,
  onQueryChange,
  onPageChange,
  onToggleSort,
  onEdit,
  onCancelEdit,
  onEditChange,
  onSubmitUpdate,
  onDelete,
}: {
  sortedRows: ExpenseRow[];
  pageRows: ExpenseRow[];
  page: number;
  totalPages: number;
  pageSize: number;
  query: string;
  canWrite: boolean;
  loading: boolean;
  editing: EditingRow | null;
  onQueryChange: (q: string) => void;
  onPageChange: (p: number) => void;
  onToggleSort: (k: SortKey) => void;
  onEdit: (row: EditingRow) => void;
  onCancelEdit: () => void;
  onEditChange: (row: EditingRow) => void;
  onSubmitUpdate: () => void;
  onDelete: (rowIndex: number) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg md:text-xl font-medium">Transactions</div>
          <div className="text-xs md:text-sm text-muted-foreground">Search, sort, and manage expenses</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search description or category…"
            className="w-full sm:w-72"
          />
        </div>
      </div>

      {editing ? (
        <div className="rounded-lg border p-3 bg-muted/20">
          <div className="mb-2 text-lg md:text-xl font-medium">Edit row #{editing.rowIndex}</div>
          <div className="grid gap-2 sm:grid-cols-6">
            {(
              [
                { key: "date", placeholder: "1-Jul-2025" },
                { key: "description", placeholder: "Description" },
                { key: "account", placeholder: "Category" },
                { key: "amount", placeholder: "Amount" },
                { key: "month", placeholder: "July" },
              ] as const
            ).map((f) => (
              <Input
                key={f.key}
                value={editing[f.key]}
                onChange={(e) => onEditChange({ ...editing, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className={f.key === "description" ? "sm:col-span-2" : "sm:col-span-1"}
              />
            ))}
            <div className="flex gap-2 sm:col-span-1">
              <Button type="button" onClick={onSubmitUpdate} disabled={loading}>
                Save
              </Button>
              <Button type="button" variant="outline" onClick={onCancelEdit} disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!sortedRows.length ? (
        <div className="rounded-lg border bg-background p-6 text-center">
          <div className="text-lg md:text-xl font-medium">No expenses found</div>
          <div className="mt-1 text-sm md:text-base text-muted-foreground">
            Try a different period, or adjust your search.
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {pageRows.map((r) => (
              <div key={r.rowIndex} className="rounded-lg border bg-card p-4 shadow-sm flex flex-col gap-3 transition-base hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium leading-tight">{r.description}</div>
                  <div className="font-semibold whitespace-nowrap">{formatPKR(r.amount)}</div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>{r.date}</div>
                  <div className="rounded bg-secondary px-2 py-1 text-secondary-foreground">{r.account}</div>
                </div>
                {canWrite ? (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onEdit({
                          rowIndex: r.rowIndex,
                          date: r.date,
                          description: r.description,
                          account: r.account,
                          amount: String(r.amount),
                          month: r.month,
                        })
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this expense? This cannot be undone.")) {
                          onDelete(r.rowIndex);
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Desktop/Tablet Table View */}
          <div className="hidden sm:block overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden sm:table-cell">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => onToggleSort("date")}
                    >
                      Date <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="hidden sm:table-cell">Account/Category</TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => onToggleSort("amount")}
                    >
                      Amount <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </TableHead>
                  {canWrite ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => (
                  <TableRow key={r.rowIndex}>
                    <TableCell className="hidden sm:table-cell whitespace-nowrap">{r.date}</TableCell>
                    <TableCell className="min-w-[140px] sm:min-w-[240px] break-all sm:break-words">{r.description}</TableCell>
                    <TableCell className="hidden sm:table-cell whitespace-nowrap">{r.account}</TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">{formatPKR(r.amount)}</TableCell>
                    {canWrite ? (
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="inline-flex gap-2">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            onClick={() =>
                              onEdit({
                                rowIndex: r.rowIndex,
                                date: r.date,
                                description: r.description,
                                account: r.account,
                                amount: String(r.amount),
                                month: r.month,
                              })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this expense? This cannot be undone.")) {
                                onDelete(r.rowIndex);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs md:text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sortedRows.length)} of{" "}
              {sortedRows.length.toLocaleString("en-PK")}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
                Prev
              </Button>
              <div className="text-xs md:text-sm">
                Page {page} / {totalPages}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
