"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SheetConfigPanel({
  role,
  loading,
  onSave,
  onRefresh,
}: {
  role: string;
  loading: boolean;
  onSave: (sheetId: string, sheetRange: string) => void;
  onRefresh: () => void;
}) {
  const [sheetIdInput, setSheetIdInput] = React.useState("");
  const [sheetRangeInput, setSheetRangeInput] = React.useState("expenses!B3:F1000");

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg md:text-xl font-medium">Google Sheet not configured</div>
          <div className="text-xs md:text-sm text-muted-foreground">
            Add a Google Spreadsheet ID (and optionally a range). The service account must have access.
          </div>
        </div>
      </div>

      {role === "admin" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-6">
          <Input
            value={sheetIdInput}
            onChange={(e) => setSheetIdInput(e.target.value)}
            placeholder="Spreadsheet ID"
            className="sm:col-span-4"
          />
          <Input
            value={sheetRangeInput}
            onChange={(e) => setSheetRangeInput(e.target.value)}
            placeholder="expenses!B3:F1000"
            className="sm:col-span-2"
          />
          <div className="sm:col-span-6 flex gap-2">
            <Button
              type="button"
              onClick={() => onSave(sheetIdInput.trim(), sheetRangeInput.trim() || "expenses!B3:F1000")}
              disabled={loading || !sheetIdInput.trim()}
            >
              Save
            </Button>
            <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm md:text-base text-muted-foreground">
          Ask an admin to set the client&apos;s Google Sheet ID and range.
        </div>
      )}
    </div>
  );
}
