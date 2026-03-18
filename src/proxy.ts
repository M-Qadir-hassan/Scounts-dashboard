import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { HOME } from "@/lib/routes";

const PUBLIC = new Set(["/login"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Root → login
  if (pathname === "/") return NextResponse.redirect(new URL("/login", req.url));

  const res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cos) => cos.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        ),
      },
    }
  );

  // 2. Verify JWT — one network call, no DB
  const { data: { user }, error } = await supabase.auth.getUser();

  // 3. Unauthenticated
  if (error || !user) {
    if (PUBLIC.has(pathname)) return res;
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 4. Read role + active from JWT metadata — zero DB calls
  const role   = (user.app_metadata?.role   ?? "client") as string;
  const active =  user.app_metadata?.active ?? true;

  // 5. Disabled account
  if (!active) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=disabled", req.url));
  }

  // 6. Logged-in hitting login → home
  if (pathname === "/login") {
    return NextResponse.redirect(new URL(HOME[role] ?? `/dashboard/${user.id}`, req.url));
  }

  // 7. Route guards
  if (pathname.startsWith("/admin") && role !== "admin")
    return NextResponse.redirect(new URL(HOME[role] ?? "/login", req.url));

  if (pathname.startsWith("/accountant") && role !== "accountant" && role !== "admin")
    return NextResponse.redirect(new URL(HOME[role] ?? "/login", req.url));

  if (pathname.startsWith("/dashboard/") && role === "client") {
    if (pathname.split("/")[2] !== user.id)
      return NextResponse.redirect(new URL(`/dashboard/${user.id}`, req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|css|js)).*)",
  ],
};