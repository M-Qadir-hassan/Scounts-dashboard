import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { userManager, type Role as ManagedRole } from "@/lib/UserManager";
import { getAuthenticatedUser, sameOrigin } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

type PatchBody =
  | { action: "setStatus"; active: boolean }
  | { action: "updateRole"; role: ManagedRole }
  | { action: "updateSheet"; sheetId: string; sheetRange?: string };

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.app_metadata?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (body.action === "setStatus") {
    const result = await userManager.setStatus(id, body.active);
    if (!result.success) return NextResponse.json({ error: result.error ?? "Update failed" }, { status: 400 });
    logAuditAction(user.id, id, "USER_STATUS_UPDATE", { active: body.active });
    return NextResponse.json({ success: true });
  }

  if (body.action === "updateRole") {
    const result = await userManager.updateRole(id, body.role);
    if (!result.success) return NextResponse.json({ error: result.error ?? "Update failed" }, { status: 400 });
    logAuditAction(user.id, id, "USER_ROLE_UPDATE", { role: body.role });
    return NextResponse.json({ success: true });
  }

  if (body.action === "updateSheet") {
    const result = await userManager.updateSheet(id, body.sheetId, body.sheetRange);
    if (!result.success) return NextResponse.json({ error: result.error ?? "Update failed" }, { status: 400 });
    logAuditAction(user.id, id, "SHEET_CONFIG_UPDATE", { sheetId: body.sheetId, sheetRange: body.sheetRange });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.app_metadata?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const result = await userManager.deleteUser(id);
  if (!result.success) return NextResponse.json({ error: result.error ?? "Delete failed" }, { status: 400 });

  logAuditAction(user.id, id, "USER_DELETE");

  return NextResponse.json({ success: true });
}
