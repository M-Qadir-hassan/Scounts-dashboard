import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/supabase-admin";
import { getAuthenticatedUser, sameOrigin } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.app_metadata?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { accountantId, clientId } = body as { accountantId?: string; clientId?: string };
  if (!accountantId || !clientId) return NextResponse.json({ error: "accountantId and clientId required" }, { status: 400 });

  const { error } = await adminDb.from("assignments").insert({ accountant_id: accountantId, client_id: clientId });
  if (error) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

  logAuditAction(user.id, accountantId, "ASSIGNMENT_CREATE", { clientId });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.app_metadata?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { accountantId, clientId } = body as { accountantId?: string; clientId?: string };
  if (!accountantId || !clientId) return NextResponse.json({ error: "accountantId and clientId required" }, { status: 400 });

  const { error } = await adminDb
    .from("assignments")
    .delete()
    .eq("accountant_id", accountantId)
    .eq("client_id", clientId);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });

  logAuditAction(user.id, accountantId, "ASSIGNMENT_DELETE", { clientId });

  return NextResponse.json({ success: true });
}
