import "server-only";

import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Users, Settings, ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  const quickLinks = [
    { title: "Users", description: "Create users and manage roles", href: "/admin/users", icon: Users },
    { title: "Settings", description: "System defaults and configuration", href: "/admin/settings", icon: Settings },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <SectionHeader title="Admin" description="Scounts control panel." />

      <div className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((q) => (
          <Card key={q.href} className="transition-shadow hover:shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <span className="rounded-lg bg-primary/10 p-2 text-primary ring-1 ring-primary/15">
                  <q.icon className="h-4 w-4" />
                </span>
                {q.title}
              </CardTitle>
              <CardDescription>{q.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button asChild>
                <Link href={q.href}>
                  Open <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
