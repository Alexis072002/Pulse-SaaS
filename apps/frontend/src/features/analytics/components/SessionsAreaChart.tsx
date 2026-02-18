"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

interface SessionsAreaChartProps {
  data: Array<{ date: string; sessions: number }>;
}

export function SessionsAreaChart({ data }: SessionsAreaChartProps): JSX.Element {
  return (
    <section className="glass h-[360px] rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Evolution sessions</h2>
          <p className="mt-1 text-xs text-text-2">Trajectoire journalière des sessions GA4.</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="86%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gaSessionsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#34D399" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="sessions"
            stroke="#34D399"
            fill="url(#gaSessionsGradient)"
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
