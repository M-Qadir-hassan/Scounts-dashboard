import "server-only";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.app_metadata?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await adminDb
    .from("profiles")
    .select("id, email, role, active, full_name, company_name, sheet_id, sheet_range")
    .order("role", { ascending: true })
    .order("email", { ascending: true });

  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });

  return NextResponse.json({ users: data ?? [] });
}
