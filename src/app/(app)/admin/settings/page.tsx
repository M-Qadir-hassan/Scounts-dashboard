import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/login");

  return (
    <div className="p-6 space-y-6">
      <SectionHeader title="Settings" description="System defaults for Scounts." />

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Google Sheets</CardTitle>
          <CardDescription>Default range used when a client has not configured one.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-sm md:text-base">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">Default expenses range</div>
            <div className="font-medium">expenses!B3:F1000</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
