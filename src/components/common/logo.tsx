"use client";

import { cn } from "@/lib/utils";

type LogoVariant = "primary" | "secondary" | "ghost";
type LogoSize    = "sm" | "md" | "lg";

interface LogoProps {
  variant?:  LogoVariant;
  size?:     LogoSize;
  className?: string;
}

const sizeMap: Record<LogoSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
};

export function Logo({ variant = "primary", size = "md", className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeMap[size], className)}
      aria-label="Scounts"
      role="img"
    >
      {/* Background */}
      {variant === "primary" && <rect width="100" height="100" rx="24" className="fill-sidebar-accent" />}
      {variant === "secondary" && <rect width="100" height="100" rx="24" className="fill-secondary stroke-border" strokeWidth="2" />}

      {/* Bold S */}
      <text
        x="50"
        y="72"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="68"
        className={variant === "primary" ? "fill-sidebar-accent-foreground" : "fill-primary"}
      >
        S
      </text>
    </svg>
  );
}