import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text outline-none",
        "placeholder:text-text-muted",
        "backdrop-blur-md",
        "transition-all duration-200",
        "focus:border-accent focus:ring-2 focus:ring-accent/20",
        "hover:border-border-2",
        className
      )}
      {...props}
    />
  );
}
