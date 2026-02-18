"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

interface SessionsAreaChartProps {
  data: Array<{ date: string; sessions: number }>;
}

export function SessionsAreaChart({ data }: SessionsAreaChartProps): JSX.Element {
  return (
    <section className="glass h-[320px] rounded-2xl p-5">
      <h2 className="mb-3 text-base font-semibold text-text">Evolution sessions</h2>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gaSessionsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
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
            strokeWidth={2}
            isAnimationActive
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
