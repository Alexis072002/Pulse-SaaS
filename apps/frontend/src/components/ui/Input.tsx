import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface2 px-3 text-sm text-text outline-none placeholder:text-textMuted focus:border-accent",
        className
      )}
      {...props}
    />
  );
}
