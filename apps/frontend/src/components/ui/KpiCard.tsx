"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/utils/formatNumber";

interface KpiCardProps {
  label: string;
  value: number;
  delta: number;
  accent: "youtube" | "ga" | "accent";
  index: number;
}

export function KpiCard({ label, value, delta, accent, index }: KpiCardProps): JSX.Element {
  const borderColor = accent === "youtube" ? "#FF4444" : accent === "ga" ? "#34D399" : "#7C3AED";

  return (
    <motion.article
      className="rounded-xl border border-border bg-surface p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.08 }}
      style={{ borderTop: `2px solid ${borderColor}` }}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">{label}</p>
      <p className="mt-3 font-mono text-3xl text-text">{formatNumber(value)}</p>
      <div className="mt-3">
        <Badge tone={delta >= 0 ? "positive" : "negative"}>{delta >= 0 ? `+${delta}%` : `${delta}%`}</Badge>
      </div>
    </motion.article>
  );
}
