import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
    variant?: "line" | "circle" | "card";
    className?: string;
}

export function Skeleton({ variant = "line", className }: SkeletonProps): JSX.Element {
    return (
        <div
            className={cn(
                "skeleton",
                variant === "line" && "h-4 w-full",
                variant === "circle" && "h-10 w-10 rounded-full",
                variant === "card" && "h-32 w-full rounded-2xl",
                className
            )}
        />
    );
}
