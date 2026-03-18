import { describe, it, expect } from "vitest";
import {
  parseSheetDate,
  parseSheetRows,
  filterByPeriod,
  groupByCategory,
  groupByMonth,
  formatPKR,
  normalizeCategory,
  getFiscalYearStart,
  getFiscalYearLabel,
  type ExpenseRow,
} from "@/lib/sheets-utils";

// ── parseSheetDate ────────────────────────────────────────────────────────────

describe("parseSheetDate", () => {
  it("parses a valid D-MMM-YYYY date", () => {
    const d = parseSheetDate("1-Jul-2025");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getFullYear()).toBe(2025);
    expect(d!.getMonth()).toBe(6); // July = 6
    expect(d!.getDate()).toBe(1);
  });

  it("parses double-digit day", () => {
    const d = parseSheetDate("15-Jan-2024");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getDate()).toBe(15);
    expect(d!.getMonth()).toBe(0);
  });

  it("returns null for empty string", () => {
    expect(parseSheetDate("")).toBeNull();
  });

  it("returns null for invalid format", () => {
    expect(parseSheetDate("2025-07-01")).toBeNull();
    expect(parseSheetDate("Jul 1, 2025")).toBeNull();
    expect(parseSheetDate("01/07/2025")).toBeNull();
  });

  it("returns null for invalid date (e.g. Feb 30)", () => {
    expect(parseSheetDate("30-Feb-2025")).toBeNull();
  });

  it("returns null for invalid month abbreviation", () => {
    expect(parseSheetDate("1-Xyz-2025")).toBeNull();
  });

  it("handles leading/trailing whitespace", () => {
    const d = parseSheetDate("  5-Dec-2023  ");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getMonth()).toBe(11);
  });
});

// ── parseSheetRows ────────────────────────────────────────────────────────────

describe("parseSheetRows", () => {
  it("parses rows from raw sheet data, skipping header", () => {
    const raw = [
      ["Date", "Description", "Account", "Amount", "Month"], // header
      ["1-Jul-2025", "Office rent", "Rent", "50,000", "July"],
      ["2-Jul-2025", "Electricity", "Utilities", "12000", "July"],
    ];
    const rows = parseSheetRows(raw);
    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBe("1-Jul-2025");
    expect(rows[0].description).toBe("Office rent");
    expect(rows[0].account).toBe("Rent");
    expect(rows[0].amount).toBe(50000); // commas stripped
    expect(rows[0].month).toBe("July");
    expect(rows[0].rowIndex).toBe(4); // i=1 => row 4
    expect(rows[1].rowIndex).toBe(5);
    expect(rows[1].amount).toBe(12000);
  });

  it("skips fully empty rows", () => {
    const raw = [
      ["Date", "Description", "Account", "Amount", "Month"],
      ["", "", "", "", ""],
      ["1-Jul-2025", "Test", "Cat", "100", "July"],
    ];
    const rows = parseSheetRows(raw);
    expect(rows).toHaveLength(1);
  });

  it("handles NaN amounts gracefully", () => {
    const raw = [
      ["Date", "Description", "Account", "Amount", "Month"],
      ["1-Jul-2025", "Bad amount", "Cat", "abc", "July"],
    ];
    const rows = parseSheetRows(raw);
    expect(rows[0].amount).toBe(0);
  });

  it("returns empty array for empty input", () => {
    expect(parseSheetRows([])).toEqual([]);
  });

  it("returns empty array for header-only input", () => {
    const raw = [["Date", "Description", "Account", "Amount", "Month"]];
    expect(parseSheetRows(raw)).toEqual([]);
  });
});

// ── filterByPeriod ────────────────────────────────────────────────────────────

describe("filterByPeriod", () => {
  const makeRow = (date: string): ExpenseRow => ({
    rowIndex: 4, date, description: "", account: "", amount: 100, month: "",
  });

  it("filters daily — only same day", () => {
    const rows = [makeRow("1-Jul-2025"), makeRow("2-Jul-2025"), makeRow("3-Jul-2025")];
    const filtered = filterByPeriod(rows, "daily", new Date(2025, 6, 2));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].date).toBe("2-Jul-2025");
  });

  it("filters weekly — Monday to Sunday", () => {
    // July 7, 2025 is a Monday
    const rows = [
      makeRow("6-Jul-2025"), // Sunday before
      makeRow("7-Jul-2025"), // Monday (start)
      makeRow("9-Jul-2025"), // Wednesday
      makeRow("13-Jul-2025"), // Sunday (end)
      makeRow("14-Jul-2025"), // Monday next week
    ];
    const filtered = filterByPeriod(rows, "weekly", new Date(2025, 6, 9)); // Wed Jul 9
    expect(filtered).toHaveLength(3); // Jul 7, 9, 13
  });

  it("filters monthly — same month", () => {
    const rows = [makeRow("30-Jun-2025"), makeRow("1-Jul-2025"), makeRow("31-Jul-2025"), makeRow("1-Aug-2025")];
    const filtered = filterByPeriod(rows, "monthly", new Date(2025, 6, 15));
    expect(filtered).toHaveLength(2);
  });

  it("filters yearly — fiscal year Jul-Jun", () => {
    const rows = [
      makeRow("30-Jun-2025"), // FY2025 (prev year)
      makeRow("1-Jul-2025"),  // FY2026 start
      makeRow("15-Dec-2025"), // FY2026 mid
      makeRow("30-Jun-2026"), // FY2026 end
      makeRow("1-Jul-2026"),  // FY2027 (next year)
    ];
    const filtered = filterByPeriod(rows, "yearly", new Date(2025, 6, 15)); // in FY2026
    expect(filtered).toHaveLength(3); // Jul 1, Dec 15, Jun 30
  });

  it("returns empty for no matching rows", () => {
    const rows = [makeRow("1-Jan-2020")];
    const filtered = filterByPeriod(rows, "daily", new Date(2025, 0, 1));
    expect(filtered).toHaveLength(0);
  });
});

// ── groupByCategory ───────────────────────────────────────────────────────────

describe("groupByCategory", () => {
  it("groups and sums by category, sorted descending", () => {
    const rows: ExpenseRow[] = [
      { rowIndex: 4, date: "", description: "", account: "Rent", amount: 50000, month: "" },
      { rowIndex: 5, date: "", description: "", account: "Rent", amount: 50000, month: "" },
      { rowIndex: 6, date: "", description: "", account: "Utilities", amount: 12000, month: "" },
    ];
    const result = groupByCategory(rows);
    expect(result[0]).toEqual({ category: "Rent", total: 100000 });
    expect(result[1]).toEqual({ category: "Utilities", total: 12000 });
  });

  it("labels empty accounts as Uncategorized", () => {
    const rows: ExpenseRow[] = [
      { rowIndex: 4, date: "", description: "", account: "", amount: 500, month: "" },
    ];
    const result = groupByCategory(rows);
    expect(result[0].category).toBe("Uncategorized");
  });

  it("returns empty array for no rows", () => {
    expect(groupByCategory([])).toEqual([]);
  });
});

// ── groupByMonth ──────────────────────────────────────────────────────────────

describe("groupByMonth", () => {
  it("buckets rows into fiscal year months", () => {
    const rows: ExpenseRow[] = [
      { rowIndex: 4, date: "1-Jul-2025", description: "", account: "", amount: 1000, month: "" },
      { rowIndex: 5, date: "15-Jul-2025", description: "", account: "", amount: 2000, month: "" },
      { rowIndex: 6, date: "1-Aug-2025", description: "", account: "", amount: 500, month: "" },
    ];
    const result = groupByMonth(rows, new Date(2025, 6, 15)); // FY2026
    expect(result[0]).toEqual({ month: "Jul", total: 3000 });
    expect(result[1]).toEqual({ month: "Aug", total: 500 });
    expect(result[2].total).toBe(0); // Sep
  });

  it("returns all zeros for empty rows", () => {
    const result = groupByMonth([], new Date(2025, 6, 1));
    expect(result).toHaveLength(12);
    expect(result.every((m) => m.total === 0)).toBe(true);
  });
});

// ── getFiscalYearStart / Label ────────────────────────────────────────────────

describe("getFiscalYearStart", () => {
  it("returns Jul 1 of same year if month >= July", () => {
    const fy = getFiscalYearStart(new Date(2025, 6, 15)); // July 15
    expect(fy.getFullYear()).toBe(2025);
    expect(fy.getMonth()).toBe(6);
    expect(fy.getDate()).toBe(1);
  });

  it("returns Jul 1 of previous year if month < July", () => {
    const fy = getFiscalYearStart(new Date(2026, 2, 1)); // March 1, 2026
    expect(fy.getFullYear()).toBe(2025);
    expect(fy.getMonth()).toBe(6);
  });
});

describe("getFiscalYearLabel", () => {
  it("returns FY label like FY2026 (2025-26)", () => {
    const label = getFiscalYearLabel(new Date(2025, 6, 15));
    expect(label).toBe("FY2026 (2025-26)");
  });
});

// ── formatPKR ─────────────────────────────────────────────────────────────────

describe("formatPKR", () => {
  it("formats number with PKR prefix", () => {
    expect(formatPKR(50000)).toMatch(/PKR/);
    expect(formatPKR(50000)).toMatch(/50/);
  });

  it("handles zero", () => {
    expect(formatPKR(0)).toBe("PKR 0");
  });

  it("handles NaN gracefully", () => {
    expect(formatPKR(NaN)).toBe("PKR 0");
  });

  it("handles Infinity gracefully", () => {
    expect(formatPKR(Infinity)).toBe("PKR 0");
  });
});

// ── normalizeCategory ─────────────────────────────────────────────────────────

describe("normalizeCategory", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeCategory("  Office   Rent  ")).toBe("Office Rent");
  });

  it("handles empty string", () => {
    expect(normalizeCategory("")).toBe("");
  });
});
