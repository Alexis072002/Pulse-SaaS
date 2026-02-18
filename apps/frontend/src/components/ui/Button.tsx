import { cn } from "@/lib/utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition duration-200",
        variant === "primary" && "bg-accent text-white hover:bg-accent2",
        variant === "ghost" && "border border-border bg-surface text-text hover:border-border2",
        className
      )}
      {...props}
    />
  );
}
