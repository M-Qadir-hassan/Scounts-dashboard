"use client";

import { useActionState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { User } from "lucide-react";
import { loginAction } from "./Action";

export function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        {/* Header */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>

        {/* Email */}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="XYZ@scounts.com"
            autoComplete="email"
            required
            disabled={pending}
          />
        </Field>

        {/* Password */}
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
              Forgot your password?
            </a>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
          />
        </Field>

        {/* Error */}
        {state?.error && (
          <p className="text-sm font-medium text-destructive">{state.error}</p>
        )}

        {/* Submit */}
        <Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Login"}
          </Button>
        </Field>

        <FieldSeparator>Or</FieldSeparator>

        {/* Become a member — disabled, admin creates accounts */}
        <Field>
          <Button variant="ghost" type="button" className="w-full gap-2" disabled>
            <User className="h-4 w-4" />
            Become a member
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}