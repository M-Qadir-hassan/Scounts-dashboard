import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Get the authenticated user from cookies (for use in Server Components / Server Actions).
 * Calls getUser() which verifies the JWT — not just reads the cookie.
 */
export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Get the authenticated user from a NextRequest (for use in API Route handlers).
 * Uses the request's cookies directly instead of next/headers.
 */
export async function getAuthenticatedUserFromRequest(req: NextRequest) {
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * CSRF: Verify that the request originates from the same host.
 */
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    return o.host === req.nextUrl.host && (o.protocol === "https:" || o.protocol === req.nextUrl.protocol);
  } catch {
    return false;
  }
}
