import type { YoutubeHeatmapCell } from "@/lib/api/youtube";

interface HeatmapCalendarProps {
  cells: YoutubeHeatmapCell[];
}

function intensityClass(intensity: number): string {
  if (intensity <= 0) {
    return "bg-surface";
  }
  if (intensity === 1) {
    return "bg-youtube/15";
  }
  if (intensity === 2) {
    return "bg-youtube/30";
  }
  if (intensity === 3) {
    return "bg-youtube/55";
  }
  return "bg-youtube/80";
}

export function HeatmapCalendar({ cells }: HeatmapCalendarProps): JSX.Element {
  if (cells.length === 0) {
    return (
      <section className="glass rounded-2xl p-5">
        <h2 className="text-base font-semibold text-text">Heatmap activité (12 mois)</h2>
        <p className="mt-2 text-sm text-text-2">
          Données insuffisantes pour afficher la heatmap. Synchronise YouTube ou change de période.
        </p>
      </section>
    );
  }

  const weekCount = Math.ceil(cells.length / 7);
  const dayLabels = ["L", "Ma", "Me", "J", "V", "S", "D"];

  const monthSegments: Array<{ key: string; label: string; start: number; span: number }> = [];
  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    const sampleCell = cells[weekIndex * 7];
    if (!sampleCell) {
      continue;
    }

    const sampleDate = new Date(sampleCell.date);
    const monthKey = `${sampleDate.getFullYear()}-${sampleDate.getMonth()}`;
    const label = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(sampleDate).replace(".", "").toUpperCase();
    const previous = monthSegments[monthSegments.length - 1];

    if (previous && previous.key === monthKey) {
      previous.span += 1;
      continue;
    }

    monthSegments.push({
      key: monthKey,
      label,
      start: weekIndex,
      span: 1
    });
  }

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Heatmap activité (12 mois)</h2>
          <p className="mt-1 text-xs text-text-2">Intensité journalière des vues par semaine.</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <span className="h-2.5 w-2.5 rounded-sm bg-youtube/15" />
          <span className="h-2.5 w-2.5 rounded-sm bg-youtube/30" />
          <span className="h-2.5 w-2.5 rounded-sm bg-youtube/55" />
          <span className="h-2.5 w-2.5 rounded-sm bg-youtube/80" />
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[740px]">
          <div
            className="mb-2 grid gap-1 text-[10px] uppercase tracking-[0.08em] text-text-muted"
            style={{ gridTemplateColumns: `36px repeat(${weekCount}, minmax(12px, 1fr))` }}
          >
            <span />
            {monthSegments.map((segment) => (
              <span
                key={segment.key}
                className="overflow-hidden whitespace-nowrap pr-1"
                style={{ gridColumn: `${segment.start + 2} / span ${segment.span}` }}
              >
                {segment.label}
              </span>
            ))}
          </div>

          <div
            className="grid grid-rows-7 gap-1"
            style={{ gridTemplateColumns: `36px repeat(${weekCount}, minmax(12px, 1fr))` }}
          >
            {Array.from({ length: 7 }).map((_, rowIndex) => (
              <div key={`day-${rowIndex}`} className="contents">
                <span className="flex items-center text-[10px] text-text-muted">{dayLabels[rowIndex]}</span>
                {Array.from({ length: weekCount }).map((_, weekIndex) => {
                  const cellIndex = weekIndex * 7 + rowIndex;
                  const cell = cells[cellIndex];

                  if (!cell) {
                    return <div key={`empty-${rowIndex}-${weekIndex}`} className="h-3 rounded-sm bg-transparent" />;
                  }

                  return (
                    <div
                      key={cell.date}
                      className={`h-3 rounded-sm transition-all hover:scale-125 hover:ring-1 hover:ring-border-2 ${intensityClass(cell.intensity)}`}
                      title={`${cell.date} - ${cell.views} vues`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
