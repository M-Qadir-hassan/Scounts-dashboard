import { Logo } from "@/components/common/logo";
import Image from "next/image";
import { LoginForm } from "@/app/login/LoginForm";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/login-bg.webp"
          alt="Login background"
          fill
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className=" flex justify-center items-center md:justify-start">
          <Logo /> <span className="text-xl font-semibold">counts</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}