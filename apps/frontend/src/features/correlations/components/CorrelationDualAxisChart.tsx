"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { CorrelationEvent } from "@/lib/api/correlations";
import { formatNumber } from "@/lib/utils/formatNumber";
import { ChartTooltip } from "@/components/charts/ChartTooltip";

interface CorrelationDualAxisChartProps {
  data: Array<{
    date: string;
    dateLabel: string;
    youtubeViews: number;
    webSessions: number;
  }>;
  events: CorrelationEvent[];
}

export function CorrelationDualAxisChart({ data, events }: CorrelationDualAxisChartProps): JSX.Element {
  const eventDateLabels = new Map(data.map((point) => [point.date, point.dateLabel]));

  return (
    <section className="glass h-[380px] rounded-2xl p-5">
      <h2 className="mb-3 text-base font-semibold text-text">YouTube vs Web (double axe)</h2>
      <ResponsiveContainer width="100%" height="86%">
        <LineChart data={data}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 4" />
          <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
          <YAxis
            yAxisId="youtube"
            orientation="left"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <YAxis
            yAxisId="web"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <Tooltip content={<ChartTooltip />} />

          {events.map((event) => {
            const dateLabel = eventDateLabels.get(event.date);
            if (!dateLabel) {
              return null;
            }

            return (
              <ReferenceLine
                key={`${event.date}-${event.label}`}
                x={dateLabel}
                yAxisId="youtube"
                stroke="#D97706"
                strokeDasharray="4 4"
                label={{
                  value: event.label,
                  position: "insideTopRight",
                  fill: "#D97706",
                  fontSize: 10
                }}
              />
            );
          })}

          <Line
            yAxisId="youtube"
            type="monotone"
            dataKey="youtubeViews"
            stroke="#FF4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#FF4444", stroke: "var(--bg)", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={1500} // Slower for complex line chart
            animationEasing="ease-out"
          />
          <Line
            yAxisId="web"
            type="monotone"
            dataKey="webSessions"
            stroke="#34D399"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#34D399", stroke: "var(--bg)", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
