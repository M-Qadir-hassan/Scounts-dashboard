import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title:        string;
  description?: string;
  className?:   string;
}

export function SectionHeader({ title, description, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {/* Left accent bar */}
      <div className="mt-1 w-1 shrink-0 self-stretch rounded-full bg-primary" />

      {/* Text */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-5xl text-primary font-light  tracking-wide leading-none ">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground font-light leading-none tracking-wide">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}