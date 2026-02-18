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
    <div className="h-[320px] rounded-xl border border-border bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="ytGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4444" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#FF4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#1C1C2E" strokeDasharray="4 4" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#4A4A6A", fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#4A4A6A", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(14,14,26,0.95)",
              border: "1px solid #252538",
              borderRadius: 8,
              padding: 12
            }}
          />
          <Area
            type="monotone"
            dataKey="youtube"
            stroke="#FF4444"
            fill="url(#ytGradient)"
            strokeWidth={2}
            isAnimationActive
            animationDuration={800}
          />
          <Area
            type="monotone"
            dataKey="ga"
            stroke="#34D399"
            fill="url(#gaGradient)"
            strokeWidth={2}
            isAnimationActive
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
