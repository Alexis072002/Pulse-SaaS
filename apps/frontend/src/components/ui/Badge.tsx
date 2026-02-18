import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "positive" | "negative";
}

export function Badge({ children, tone = "neutral" }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "border-border text-text2",
        tone === "positive" && "border-ga/30 bg-ga/10 text-ga",
        tone === "negative" && "border-youtube/30 bg-youtube/10 text-youtube"
      )}
    >
      {children}
    </span>
  );
}
