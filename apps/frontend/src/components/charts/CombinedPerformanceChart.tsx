"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

interface ChartPoint {
  date: string;
  youtube: number;
  ga: number;
}

interface CombinedPerformanceChartProps {
  data: ChartPoint[];
}

export function CombinedPerformanceChart({ data }: CombinedPerformanceChartProps): JSX.Element {
  return (
    <div className="glass h-[360px] rounded-2xl p-5">
      <p className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">
        Performance combinée
      </p>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="ytGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4444" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#FF4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="youtube"
            stroke="#FF4444"
            fill="url(#ytGradient)"
            strokeWidth={2}
            isAnimationActive
            animationDuration={1000}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="ga"
            stroke="#34D399"
            fill="url(#gaGradient)"
            strokeWidth={2}
            isAnimationActive
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
