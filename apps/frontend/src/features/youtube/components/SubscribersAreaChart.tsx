"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { YoutubeSubscriberPoint } from "@/lib/api/youtube";
import { formatDate } from "@/lib/utils/formatDate";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

interface SubscribersAreaChartProps {
  points: YoutubeSubscriberPoint[];
}

export function SubscribersAreaChart({ points }: SubscribersAreaChartProps): JSX.Element {
  const chartData = points.map((point) => ({
    date: formatDate(point.date),
    subscribers: point.subscribers
  }));

  return (
    <section className="glass h-[360px] rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Trajectoire abonnés</h2>
          <p className="mt-1 text-xs text-text-2">Evolution cumulée des abonnés sur la période.</p>
        </div>
        <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text-2">
          Série temporelle
        </span>
      </div>
      <ResponsiveContainer width="100%" height="86%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="subsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--danger)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="subscribers"
            stroke="var(--danger)"
            fill="url(#subsGradient)"
            strokeWidth={2.25}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
