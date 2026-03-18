import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Shared Supabase admin client (service role).
 * Use this for any server-side DB operation that needs elevated privileges.
 * Single instance — avoids creating multiple clients across files.
 */
export const adminDb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
