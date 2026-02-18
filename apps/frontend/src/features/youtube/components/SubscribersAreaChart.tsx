"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { YoutubeSubscriberPoint } from "@/lib/api/youtube";
import { formatDate } from "@/lib/utils/formatDate";

interface SubscribersAreaChartProps {
  points: YoutubeSubscriberPoint[];
}

export function SubscribersAreaChart({ points }: SubscribersAreaChartProps): JSX.Element {
  const chartData = points.map((point) => ({
    date: formatDate(point.date),
    subscribers: point.subscribers
  }));

  return (
    <section className="h-[320px] rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-syne text-xl font-bold text-text">Evolution abonnés</h2>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="subsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4444" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#FF4444" stopOpacity={0} />
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
            dataKey="subscribers"
            stroke="#FF4444"
            fill="url(#subsGradient)"
            strokeWidth={2}
            isAnimationActive
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
