import { userManager } from "@/lib/UserManager";
import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin, getAuthenticatedUserFromRequest } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!checkRateLimit(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // Cookie-authenticated endpoint with side effects: require same-origin to reduce CSRF risk.
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await getAuthenticatedUserFromRequest(req);

  if (user?.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { role, email, password, fullName, companyName, sheetId } = body;

  if (!email || !password || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (password.length < 10)        return NextResponse.json({ error: "Password too short" }, { status: 400 });
  if (role === "accountant" && !fullName)  return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (role === "client" && !companyName)   return NextResponse.json({ error: "Company required" }, { status: 400 });

  try {
    const result = role === "accountant"
      ? await userManager.createAccountant({ email, password, fullName })
      : await userManager.createClient({ email, password, companyName, sheetId });

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    logAuditAction(user.id, result.userId!, "USER_CREATE", { role, email });

    return NextResponse.json({ userId: result.userId, success: true }, { status: 201 });
  } catch (err: unknown) {
    console.error("[USER_CREATION_ERROR]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
