import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "positive" | "negative" | "accent";
}

export function Badge({ children, tone = "neutral" }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        tone === "neutral" && "border border-border bg-surface text-text-2",
        tone === "positive" && "border border-ga/20 bg-ga/10 text-ga",
        tone === "negative" && "border border-youtube/20 bg-youtube/10 text-youtube",
        tone === "accent" && "border border-accent/20 bg-accent-muted text-accent"
      )}
    >
      {tone === "positive" && (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path d="M6 9V3M6 3L3 6M6 3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {tone === "negative" && (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path d="M6 3v6M6 9l3-3M6 9L3 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {children}
    </span>
  );
}
