import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/supabase-admin";
import { getAuthenticatedUser, sameOrigin } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  // Cookie-authenticated endpoint with side effects: require same-origin to reduce CSRF risk.
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (user.app_metadata?.role ?? "client") as string;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { clientId, sheetId, sheetRange } = body as {
    clientId?: string;
    sheetId?: string;
    sheetRange?: string;
  };

  if (!clientId || !sheetId) {
    return NextResponse.json({ error: "clientId and sheetId required" }, { status: 400 });
  }

  const range = (sheetRange?.trim() || "expenses!B3:F1000");
  const { error } = await adminDb
    .from("profiles")
    .update({ sheet_id: sheetId.trim(), sheet_range: range })
    .eq("id", clientId);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  return NextResponse.json({ success: true });
}
