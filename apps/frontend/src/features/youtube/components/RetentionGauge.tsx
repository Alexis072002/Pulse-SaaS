"use client";

import { motion } from "framer-motion";

interface RetentionGaugeProps {
  retention: number;
  delta: number;
}

export function RetentionGauge({ retention, delta }: RetentionGaugeProps): JSX.Element {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const clampedRetention = Math.max(0, Math.min(100, retention));
  const dashOffset = circumference * (1 - clampedRetention / 100);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-4 font-syne text-xl font-bold text-text">Rétention moyenne</h2>
      <div className="flex items-center justify-center">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r={radius} stroke="#1C1C2E" strokeWidth="12" fill="none" />
          <motion.circle
            cx="75"
            cy="75"
            r={radius}
            stroke="#A855F7"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            transform="rotate(-90 75 75)"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div className="-ml-28 text-center">
          <p className="font-mono text-3xl text-text">{clampedRetention.toFixed(1)}%</p>
          <p className="text-xs text-text2">Moyenne période</p>
          <span
            className={`mt-2 inline-block rounded-md border px-2 py-1 text-xs ${
              delta >= 0 ? "border-ga/30 bg-ga/10 text-ga" : "border-youtube/30 bg-youtube/10 text-youtube"
            }`}
          >
            {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </section>
  );
}
