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
  title?: string;
  subtitle?: string;
}

export function CombinedPerformanceChart({
  data,
  title = "Performance combinée",
  subtitle = "Comparaison YouTube vs sessions web sur la période"
}: CombinedPerformanceChartProps): JSX.Element {
  return (
    <div className="glass h-[390px] rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">
            {title}
          </p>
          <p className="mt-1 text-xs text-text-2">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-text-2">
            <span className="h-2 w-2 rounded-full bg-youtube" />
            YouTube
          </span>
          <span className="inline-flex items-center gap-1.5 text-text-2">
            <span className="h-2 w-2 rounded-full bg-ga" />
            Web
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="87%">
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
