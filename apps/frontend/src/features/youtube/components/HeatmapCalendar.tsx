import type { YoutubeHeatmapCell } from "@/lib/api/youtube";

interface HeatmapCalendarProps {
  cells: YoutubeHeatmapCell[];
}

function intensityClass(intensity: number): string {
  if (intensity <= 0) {
    return "bg-[#14141F]";
  }
  if (intensity === 1) {
    return "bg-[#2A1E45]";
  }
  if (intensity === 2) {
    return "bg-[#4A2A7A]";
  }
  if (intensity === 3) {
    return "bg-[#6A35AA]";
  }
  return "bg-[#A855F7]";
}

export function HeatmapCalendar({ cells }: HeatmapCalendarProps): JSX.Element {
  const weekCount = Math.ceil(cells.length / 7);
  const monthLabels = Array.from({ length: weekCount }, (_value, weekIndex) => {
    const sampleCell = cells[weekIndex * 7];
    if (!sampleCell) {
      return "";
    }

    const sampleDate = new Date(sampleCell.date);
    const isMonthStart = sampleDate.getDate() <= 7;
    return isMonthStart
      ? new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(sampleDate)
      : "";
  });

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-4 font-syne text-xl font-bold text-text">Heatmap Performance (12 mois)</h2>
      <div
        className="mb-2 grid gap-1 text-[10px] uppercase tracking-[0.08em] text-textMuted"
        style={{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }}
      >
        {monthLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-rows-7 gap-1" style={{ gridTemplateColumns: `repeat(${weekCount}, minmax(0, 1fr))` }}>
          {Array.from({ length: 7 }).map((_, rowIndex) =>
            Array.from({ length: weekCount }).map((_, weekIndex) => {
              const cellIndex = weekIndex * 7 + rowIndex;
              const cell = cells[cellIndex];

              if (!cell) {
                return <div key={`empty-${rowIndex}-${weekIndex}`} className="h-3 rounded-sm bg-transparent" />;
              }

              return (
                <div
                  key={cell.date}
                  className={`h-3 rounded-sm ${intensityClass(cell.intensity)}`}
                  title={`${cell.date} - ${cell.views} vues`}
                />
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
