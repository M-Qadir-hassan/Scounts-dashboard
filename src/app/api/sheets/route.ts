import "server-only";

import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/supabase-admin";
import { getAuthenticatedUser, sameOrigin } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAuditAction } from "@/lib/audit";
import { readSheet, appendRow, updateRow, deleteRow } from "@/lib/google-sheets";

const DEFAULT_READ_RANGE = "expenses!B3:F1000";
const DEFAULT_APPEND_RANGE = "expenses!B:F";

// ── Range validation ──────────────────────────────────────────────────────────
const SAFE_RANGE_RE = /^[A-Za-z0-9_ ]+!B\d+:F\d+$/;

function isValidRange(range: string): boolean {
  return SAFE_RANGE_RE.test(range.trim());
}

// ── Get sheet info for a client ───────────────────────────────────────────────
async function getClientSheet(clientId: string) {
  const { data } = await adminDb
    .from("profiles")
    .select("sheet_id, sheet_range")
    .eq("id", clientId)
    .single();
  return data as { sheet_id: string | null; sheet_range: string | null } | null;
}

async function canAccessClient(userId: string, role: string, clientId: string) {
  if (role === "admin") return true;
  if (role === "client") return userId === clientId;
  if (role !== "accountant") return false;

  const { data: assignment } = await adminDb
    .from("assignments")
    .select("id")
    .eq("accountant_id", userId)
    .eq("client_id", clientId)
    .maybeSingle();
  return !!assignment;
}

// ── GET — read sheet data ─────────────────────────────────────────────────────
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(arguments[0].url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const role = (user.app_metadata?.role ?? "client") as string;
  if (!(await canAccessClient(user.id, role, clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sheet = await getClientSheet(clientId);
  if (!sheet?.sheet_id) return NextResponse.json({ error: "No sheet configured" }, { status: 404 });

  const result = await readSheet(sheet.sheet_id, sheet.sheet_range ?? DEFAULT_READ_RANGE);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ data: result.data });
}

// ── POST — append a row ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!checkRateLimit(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (user.app_metadata?.role ?? "client") as string;
  if (role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { clientId, values } = body as { clientId?: string; values?: string[] };
  if (!clientId || !Array.isArray(values)) {
    return NextResponse.json({ error: "clientId and values required" }, { status: 400 });
  }
  if (!values.every(v => typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null)) {
    return NextResponse.json({ error: "values must contain only primitive types" }, { status: 400 });
  }
  if (!(await canAccessClient(user.id, role, clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sheet = await getClientSheet(clientId);
  if (!sheet?.sheet_id) return NextResponse.json({ error: "No sheet configured" }, { status: 404 });

  const result = await appendRow(sheet.sheet_id, sheet.sheet_range ?? DEFAULT_APPEND_RANGE, values);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  revalidateTag(`client-sheet-${clientId}`, "default");
  return NextResponse.json({ success: true }, { status: 201 });
}

// ── PUT — update a row ────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  if (!checkRateLimit(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (user.app_metadata?.role ?? "client") as string;
  if (role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { clientId, range, values } = body as { clientId?: string; range?: string; values?: string[] };
  if (!clientId || !range || !Array.isArray(values)) {
    return NextResponse.json({ error: "clientId, range and values required" }, { status: 400 });
  }
  if (!values.every(v => typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null)) {
    return NextResponse.json({ error: "values must contain only primitive types" }, { status: 400 });
  }

  if (!isValidRange(range)) {
    return NextResponse.json({ error: "Invalid range format" }, { status: 400 });
  }

  if (!(await canAccessClient(user.id, role, clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sheet = await getClientSheet(clientId);
  if (!sheet?.sheet_id) return NextResponse.json({ error: "No sheet configured" }, { status: 404 });

  const result = await updateRow(sheet.sheet_id, range, values);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  revalidateTag(`client-sheet-${clientId}`, "default");
  return NextResponse.json({ success: true });
}

// ── DELETE — clear a row ──────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!checkRateLimit(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (user.app_metadata?.role ?? "client") as string;
  if (role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { clientId, range } = body as { clientId?: string; range?: string };
  if (!clientId || !range) {
    return NextResponse.json({ error: "clientId and range required" }, { status: 400 });
  }

  if (!isValidRange(range)) {
    return NextResponse.json({ error: "Invalid range format" }, { status: 400 });
  }

  if (!(await canAccessClient(user.id, role, clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sheet = await getClientSheet(clientId);
  if (!sheet?.sheet_id) return NextResponse.json({ error: "No sheet configured" }, { status: 404 });

  const result = await deleteRow(sheet.sheet_id, range);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  logAuditAction(user.id, clientId, "SHEET_ROW_DELETE", { range });

  revalidateTag(`client-sheet-${clientId}`, "default");
  return NextResponse.json({ success: true });
}
