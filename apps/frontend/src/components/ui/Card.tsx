"use client";

import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "glass" | "solid" | "bordered";
  hover?: boolean;
  children?: ReactNode;
}

export function Card({
  variant = "glass",
  hover = true,
  className,
  children,
  ...props
}: CardProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={cn(
        "rounded-2xl p-5 transition-all duration-200",
        variant === "glass" && "glass",
        variant === "solid" && "border border-border bg-surface",
        variant === "bordered" && "border-2 border-border bg-transparent",
        hover && "hover:shadow-card-hover hover:border-border-2",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
