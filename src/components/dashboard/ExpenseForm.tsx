"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DraftRow {
  date: string;
  description: string;
  account: string;
  amount: string;
  month: string;
}

const FIELDS = [
  { key: "date", placeholder: "1-Jul-2025" },
  { key: "description", placeholder: "Description" },
  { key: "account", placeholder: "Category" },
  { key: "amount", placeholder: "Amount" },
  { key: "month", placeholder: "July" },
] as const;

export function ExpenseForm({
  draft,
  loading,
  onDraftChange,
  onSubmit,
}: {
  draft: DraftRow;
  loading: boolean;
  onDraftChange: (d: DraftRow) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 items-end">
      {FIELDS.map((f) => (
        <div key={f.key} className={f.key === "description" ? "sm:col-span-2" : "sm:col-span-1"}>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground sm:hidden tracking-wide uppercase">
            {f.placeholder}
          </div>
          <Input
            value={draft[f.key]}
            onChange={(e) => onDraftChange({ ...draft, [f.key]: e.target.value })}
            placeholder={f.placeholder}
            className="w-full"
          />
        </div>
      ))}
      <div className="sm:col-span-1 mt-2 sm:mt-0">
        <Button type="button" onClick={onSubmit} disabled={loading} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  );
}
