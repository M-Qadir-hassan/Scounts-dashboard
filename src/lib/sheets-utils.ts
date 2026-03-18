export type Period = "daily" | "weekly" | "monthly" | "yearly";

export interface ExpenseRow {
  rowIndex: number; // actual sheet row number (starts at 4)
  date: string;
  description: string;
  account: string;
  amount: number;
  month: string;
}

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export function parseSheetDate(input: string): Date | null {
  // Format: 1-Jul-2025 (D-MMM-YYYY)
  const s = input.trim();
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(s);
  if (!m) return null;
  const day = Number(m[1]);
  const mon = MONTHS[m[2]];
  const year = Number(m[3]);
  if (!Number.isFinite(day) || !Number.isFinite(year) || mon === undefined) return null;
  const d = new Date(year, mon, day);
  // Guard against JS Date rollover (e.g., 32-Jan becomes Feb).
  if (d.getFullYear() !== year || d.getMonth() !== mon || d.getDate() !== day) return null;
  return d;
}

export function normalizeCategory(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function parseSheetRows(raw: string[][]): ExpenseRow[] {
  // raw range includes header row at sheet row 3, so data starts at sheet row 4.
  // Columns: B=date, C=description, D=account/category, E=amount, F=month
  const rows: ExpenseRow[] = [];
  for (let i = 1; i < raw.length; i += 1) {
    const sheetRowIndex = 3 + i; // i=1 => row 4
    const r = raw[i] ?? [];
    const date = (r[0] ?? "").trim();
    const description = (r[1] ?? "").trim();
    const account = normalizeCategory(r[2] ?? "");
    const amountRaw = (r[3] ?? "").toString().trim();
    const month = (r[4] ?? "").trim();

    if (!date && !description && !account && !amountRaw && !month) continue;

    const amount = Number(amountRaw.toString().replace(/,/g, ""));
    rows.push({
      rowIndex: sheetRowIndex,
      date,
      description,
      account,
      amount: Number.isFinite(amount) ? amount : 0,
      month,
    });
  }
  return rows;
}

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
  const delta = (day + 6) % 7; // Mon=0 ... Sun=6
  return addDays(x, -delta);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getFiscalYearStart(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0=Jan ... 6=Jul
  const fyStartYear = month >= 6 ? year : year - 1; // July or later => same year July 1
  return new Date(fyStartYear, 6, 1);
}

export function getFiscalYearLabel(date: Date) {
  const fyStart = getFiscalYearStart(date);
  const startYear = fyStart.getFullYear();
  const endYear = startYear + 1;
  // FY2026 corresponds to Jul 1 2025 → Jun 30 2026
  return `FY${endYear} (${startYear}-${String(endYear).slice(-2)})`;
}

export function filterByPeriod(rows: ExpenseRow[], period: Period, date: Date): ExpenseRow[] {
  const anchor = startOfDay(date);
  const within = (row: ExpenseRow) => {
    const d = parseSheetDate(row.date);
    if (!d) return false;
    const day = startOfDay(d);

    if (period === "daily") return sameDay(day, anchor);

    if (period === "weekly") {
      const start = startOfWeekMonday(anchor);
      const end = addDays(start, 7);
      return day >= start && day < end;
    }

    if (period === "monthly") {
      return day.getFullYear() === anchor.getFullYear() && day.getMonth() === anchor.getMonth();
    }

    // yearly => fiscal year
    const fyStart = getFiscalYearStart(anchor);
    const fyEnd = new Date(fyStart.getFullYear() + 1, 6, 1);
    return day >= fyStart && day < fyEnd;
  };

  return rows.filter(within);
}

export function groupByCategory(rows: ExpenseRow[]) {
  const totals = new Map<string, number>();
  for (const r of rows) {
    const k = normalizeCategory(r.account) || "Uncategorized";
    totals.set(k, (totals.get(k) ?? 0) + (Number.isFinite(r.amount) ? r.amount : 0));
  }
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

const FY_MONTH_ORDER = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"] as const;

export function groupByMonth(rows: ExpenseRow[], anchor: Date = new Date()) {
  const fyStart = getFiscalYearStart(anchor);
  const buckets = new Map<string, number>();
  for (const m of FY_MONTH_ORDER) buckets.set(m, 0);

  for (const r of rows) {
    const d = parseSheetDate(r.date);
    if (!d) continue;
    const fyStartRow = getFiscalYearStart(d);
    if (fyStartRow.getTime() !== fyStart.getTime()) continue;
    const mon = d.toLocaleString("en-US", { month: "short" });
    if (!buckets.has(mon)) continue;
    buckets.set(mon, (buckets.get(mon) ?? 0) + (Number.isFinite(r.amount) ? r.amount : 0));
  }

  return FY_MONTH_ORDER.map((m) => ({ month: m, total: buckets.get(m) ?? 0 }));
}

export function formatPKR(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  return `PKR ${n.toLocaleString("en-PK")}`;
}

