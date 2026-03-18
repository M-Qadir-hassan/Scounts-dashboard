import { userManager } from "@/lib/UserManager";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user?.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { role, email, password, fullName, companyName, sheetId } = body;

  if (!email || !password || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (password.length < 6)         return NextResponse.json({ error: "Password < 6 chars" }, { status: 400 });
  if (role === "accountant" && !fullName)  return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (role === "client" && !companyName)   return NextResponse.json({ error: "Company required" }, { status: 400 });

  try {
    const result = role === "accountant"
      ? await userManager.createAccountant({ email, password, fullName })
      : await userManager.createClient({ email, password, companyName, sheetId });

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ userId: result.userId, success: true }, { status: 201 });
// AFTER
} catch (err: unknown) {
  console.error("[USER_CREATION_ERROR]:", err);
  return NextResponse.json({ 
    error: err instanceof Error ? err.message : "Internal server error"
  }, { status: 500 });
}
}
