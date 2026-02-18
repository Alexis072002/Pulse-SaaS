"use client";

import { motion } from "framer-motion";

interface RetentionGaugeProps {
  retention: number;
  delta: number;
}

export function RetentionGauge({ retention, delta }: RetentionGaugeProps): JSX.Element {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const clampedRetention = Math.max(0, Math.min(100, retention));
  const dashOffset = circumference * (1 - clampedRetention / 100);
  const toneClass = delta >= 0 ? "border-ga/30 bg-ga/10 text-ga" : "border-youtube/30 bg-youtube/10 text-youtube";

  return (
    <section className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Rétention moyenne</h2>
          <p className="mt-1 text-xs text-text-2">Qualité de visionnage sur la période active.</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <svg width="176" height="176" viewBox="0 0 176 176">
            <circle cx="88" cy="88" r={radius} stroke="var(--border)" strokeWidth="14" fill="none" />
            <circle
              cx="88"
              cy="88"
              r={radius}
              stroke="var(--accent-muted)"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="4 8"
            />
          <motion.circle
            cx="88"
            cy="88"
            r={radius}
            stroke="#FF4444"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            transform="rotate(-90 88 88)"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="font-mono text-3xl font-semibold leading-none text-text">{clampedRetention.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-text-2">Watch quality</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2">
        <p className="text-xs text-text-2">Variation vs période précédente</p>
        <span className={`inline-block rounded-lg border px-2 py-1 text-xs font-medium ${toneClass}`}>
          {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded-lg border border-border bg-surface px-2 py-1.5 text-text-2">0-35% faible</div>
        <div className="rounded-lg border border-border bg-surface px-2 py-1.5 text-text-2">35-60% moyen</div>
        <div className="rounded-lg border border-border bg-surface px-2 py-1.5 text-text-2">60%+ solide</div>
      </div>
    </section>
  );
}
