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
  title?: string;
  subtitle?: string;
}

export function CorrelationDualAxisChart({
  data,
  events,
  title = "YouTube vs Web (double axe)",
  subtitle = "Evolution comparative des signaux multi-plateforme"
}: CorrelationDualAxisChartProps): JSX.Element {
  const eventDateLabels = new Map(data.map((point) => [point.date, point.dateLabel]));
  const labelledEventKeys = new Set(events.slice(0, 2).map((event) => `${event.date}-${event.label}`));

  return (
    <section className="glass h-[400px] rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">{title}</h2>
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
                label={labelledEventKeys.has(`${event.date}-${event.label}`) ? {
                  value: event.label,
                  position: "insideTopRight",
                  fill: "#D97706",
                  fontSize: 10
                } : undefined}
              />
            );
          })}

          <Line
            yAxisId="youtube"
            type="monotone"
            dataKey="youtubeViews"
            stroke="#FF4444"
            strokeWidth={2.25}
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
            strokeWidth={2.25}
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
