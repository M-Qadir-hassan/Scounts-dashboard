"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const HOME: Record<string, string> = {
  admin:      "/admin",
  accountant: "/accountant",
};

export async function loginAction(
  _prev: { error: string } | null,
  formData: FormData
) {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Email and password are required" };

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cos) => cos.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const role = user?.app_metadata?.role as string;
  redirect(HOME[role] ?? `/dashboard/${user?.id}`);
}