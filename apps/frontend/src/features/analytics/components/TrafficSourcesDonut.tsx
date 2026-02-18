"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Ga4TrafficSource } from "@/lib/api/analytics";
import { formatNumber } from "@/lib/utils/formatNumber";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

// Updated to Richer Gold palette (Amber 600-900 range)
const SOURCE_COLORS = ["#D97706", "#B45309", "#92400E", "#78350F", "#9A3412", "#7C2D12"];

interface TrafficSourcesDonutProps {
  sources: Ga4TrafficSource[];
}

export function TrafficSourcesDonut({ sources }: TrafficSourcesDonutProps): JSX.Element {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalSessions = useMemo(
    () => sources.reduce((total, source) => total + source.sessions, 0),
    [sources]
  );

  const chartData = useMemo(
    () =>
      sources.map((source) => ({
        name: `${source.source} / ${source.medium}`,
        sessions: source.sessions,
        share: totalSessions > 0 ? (source.sessions / totalSessions) * 100 : 0
      })),
    [sources, totalSessions]
  );

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-4 text-base font-semibold text-text">Sources de trafic</h2>
      {chartData.length === 0 ? (
        <p className="mb-4 text-sm text-text-2">Aucune source détectée pour cette période.</p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="sessions"
                nameKey="name"
                innerRadius={54}
                outerRadius={92}
                paddingAngle={3}
                onMouseEnter={(_, index) => setActiveIndex(typeof index === "number" ? index : null)}
                onMouseLeave={() => setActiveIndex(null)}
                isAnimationActive
                animationDuration={1000} // Slower, smoother animation
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                    stroke={activeIndex === index ? "var(--text)" : "transparent"}
                    strokeWidth={activeIndex === index ? 1 : 0}
                    style={{
                      filter: activeIndex === index ? "brightness(1.1)" : "brightness(1)",
                      transition: "filter 0.3s ease"
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatNumber(value), "Sessions"]}
                content={<ChartTooltip />}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {chartData.map((entry, index) => (
            <div key={entry.name} className="flex items-center justify-between rounded-xl border border-border bg-surface-hover px-3 py-2 transition-colors hover:bg-surface-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }}
                />
                <p className="truncate text-sm text-text">{entry.name}</p>
              </div>
              <p className="font-mono text-xs text-text-2">{entry.share.toFixed(1)}%</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
