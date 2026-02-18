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
  totalSessions?: number;
  periodLabel?: string;
}

export function TrafficSourcesDonut({ sources, totalSessions, periodLabel }: TrafficSourcesDonutProps): JSX.Element {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const computedTotalSessions = useMemo(
    () => sources.reduce((total, source) => total + source.sessions, 0),
    [sources]
  );

  const chartData = useMemo(() => {
    const sorted = [...sources].sort((a, b) => b.sessions - a.sessions);
    const topFive = sorted.slice(0, 5).map((source) => ({
        name: `${source.source} / ${source.medium}`,
        sessions: source.sessions,
        share: computedTotalSessions > 0 ? (source.sessions / computedTotalSessions) * 100 : 0
    }));

    const rest = sorted.slice(5);
    const restSessions = rest.reduce((sum, item) => sum + item.sessions, 0);
    if (restSessions > 0) {
      topFive.push({
        name: "Autres sources",
        sessions: restSessions,
        share: computedTotalSessions > 0 ? (restSessions / computedTotalSessions) * 100 : 0
      });
    }

    return topFive;
  }, [computedTotalSessions, sources]);

  const displayTotal = totalSessions ?? computedTotalSessions;

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Sources de trafic</h2>
          <p className="mt-1 text-xs text-text-2">Répartition des canaux d&apos;acquisition.</p>
        </div>
      </div>
      {chartData.length === 0 ? (
        <p className="mb-4 text-sm text-text-2">Aucune source détectée pour cette période.</p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="relative h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="sessions"
                nameKey="name"
                innerRadius={56}
                outerRadius={90}
                paddingAngle={3}
                onMouseEnter={(_, index) => setActiveIndex(typeof index === "number" ? index : null)}
                onMouseLeave={() => setActiveIndex(null)}
                isAnimationActive
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={SOURCE_COLORS[index % SOURCE_COLORS.length]}
                    stroke={activeIndex === index ? "var(--text)" : "transparent"}
                    strokeWidth={activeIndex === index ? 1 : 0}
                    style={{
                      filter: activeIndex === index ? "brightness(1.08)" : "brightness(1)",
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
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
            <div>
              <p className="font-mono text-2xl font-semibold text-text">{formatNumber(displayTotal)}</p>
              <p className="text-[11px] text-text-2">sessions {periodLabel ?? ""}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {chartData.map((entry, index) => (
            <div key={entry.name} className="flex items-center justify-between rounded-xl border border-border bg-surface-hover px-3 py-2 transition-colors hover:bg-surface-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }}
                />
                <p className="truncate text-xs text-text">{entry.name}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[11px] text-text-2">{entry.share.toFixed(1)}%</p>
                <p className="font-mono text-[10px] text-text-muted">{formatNumber(entry.sessions)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
