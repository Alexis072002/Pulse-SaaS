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
    <section className="h-[380px] rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-syne text-xl font-bold text-text">YouTube vs Web (double axe)</h2>
      <ResponsiveContainer width="100%" height="86%">
        <LineChart data={data}>
          <CartesianGrid vertical={false} stroke="#1C1C2E" strokeDasharray="4 4" />
          <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} tick={{ fill: "#4A4A6A", fontSize: 11 }} />
          <YAxis
            yAxisId="youtube"
            orientation="left"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#4A4A6A", fontSize: 11 }}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <YAxis
            yAxisId="web"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#4A4A6A", fontSize: 11 }}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatNumber(value),
              name === "youtubeViews" ? "YouTube" : "Web"
            ]}
            contentStyle={{
              backgroundColor: "rgba(14,14,26,0.95)",
              border: "1px solid #252538",
              borderRadius: 8,
              padding: 12
            }}
          />

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
                stroke="#A855F7"
                strokeDasharray="4 4"
                label={{
                  value: event.label,
                  position: "insideTopRight",
                  fill: "#A855F7",
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
            activeDot={{ r: 4, fill: "#FF4444", stroke: "#07070E", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={800}
          />
          <Line
            yAxisId="web"
            type="monotone"
            dataKey="webSessions"
            stroke="#34D399"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#34D399", stroke: "#07070E", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
