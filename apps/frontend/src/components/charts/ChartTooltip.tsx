"use client";

import type { TooltipProps } from "recharts";

export function ChartTooltip({
    active,
    payload,
    label
}: TooltipProps<number, string>): JSX.Element | null {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="glass-strong rounded-xl px-4 py-3 shadow-glass-lg">
            <p className="mb-2 text-xs font-medium text-text-muted">{label}</p>
            {payload.map((entry) => (
                <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                    <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-text-2">{entry.name ?? entry.dataKey}:</span>
                    <span className="font-mono font-medium text-text">{entry.value?.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}
