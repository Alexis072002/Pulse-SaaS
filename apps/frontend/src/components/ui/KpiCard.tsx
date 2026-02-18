"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/utils/formatNumber";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: number;
  delta: number;
  accent: "youtube" | "ga" | "accent";
  index: number;
  icon?: ReactNode;
}

function CountUp({ value }: { value: number }): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      animate(motionValue, value, {
        duration: 1.2,
        ease: "easeOut"
      });
    }
  }, [isInView, motionValue, value]);

  useEffect(() => {
    const unsubscribe = motionValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatNumber(Math.round(latest));
      }
    });
    return unsubscribe;
  }, [motionValue]);

  return <span ref={ref}>0</span>;
}

export function KpiCard({ label, value, delta, accent, index, icon }: KpiCardProps): JSX.Element {
  const accentColor =
    accent === "youtube" ? "#FF4444" : accent === "ga" ? "#34D399" : "var(--accent)";

  return (
    <motion.article
      className="glass group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.1 }}
    >
      {/* Accent left bar */}
      <div
        className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl"
        style={{ background: accentColor }}
      />

      {/* Glow effect on hover */}
      <div
        className="absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25"
        style={{ background: accentColor }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p
            className="font-mono text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{ color: "var(--kpi-meta)" }}
          >
            {label}
          </p>
          <p className="mt-3 font-mono text-3xl font-semibold text-text">
            <CountUp value={value} />
          </p>
          <div className="mt-3">
            <Badge tone={delta >= 0 ? "positive" : "negative"}>
              {delta >= 0 ? `+${delta}%` : `${delta}%`}
            </Badge>
          </div>
        </div>
        {icon ? (
          <div className="rounded-xl p-2" style={{ background: `${accentColor}15`, color: "var(--kpi-meta)" }}>
            {icon}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
