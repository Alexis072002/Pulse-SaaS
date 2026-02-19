import Image from "next/image";
import type { YoutubeTopVideo } from "@/lib/api/youtube";
import { formatNumber } from "@/lib/utils/formatNumber";

function Sparkline({ points }: { points: number[] }): JSX.Element {
  const width = 96;
  const height = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);

  const polylinePoints = points
    .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="rounded-md bg-surface">
      <polyline
        fill="none"
        stroke="var(--danger)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polylinePoints}
      />
    </svg>
  );
}

interface TopVideosListProps {
  videos: YoutubeTopVideo[];
}

export function TopVideosList({ videos }: TopVideosListProps): JSX.Element {
  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">Top vidéos</h2>
          <p className="mt-1 text-xs text-text-2">Classement par vues avec indicateur de rétention.</p>
        </div>
      </div>
      <div className="space-y-3">
        {videos.length === 0 ? (
          <p className="text-sm text-text-2">Aucune vidéo disponible pour la période.</p>
        ) : null}
        {videos.map((video, index) => (
          <article
            key={video.videoId}
            className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface-hover p-3 transition-colors hover:bg-surface-2 md:grid-cols-[30px_96px_minmax(0,1fr)_126px] md:items-center"
          >
            <span className="font-mono text-xs text-text-muted md:text-sm">{String(index + 1).padStart(2, "0")}</span>
            <Image
              src={video.thumbnailUrl}
              alt={video.title}
              width={192}
              height={108}
              className="h-14 w-24 rounded-lg border border-border object-cover md:h-16 md:w-24"
              sizes="96px"
              loading="lazy"
            />
            <div className="min-w-0 space-y-1">
              <p className="max-h-[2.8rem] overflow-hidden text-sm font-medium leading-snug text-text">
                {video.title}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-2">
                <span className="font-mono">{formatNumber(video.views)} vues</span>
                <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text-muted">
                  {video.videoId.slice(0, 8)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:flex-col md:items-end md:justify-center">
              <span
                className={`rounded-lg border px-2 py-1 text-xs font-medium ${video.retentionRate >= 60
                    ? "border-ga/30 bg-ga/10 text-ga"
                    : "border-youtube/30 bg-youtube/10 text-youtube"
                  }`}
              >
                {video.retentionRate.toFixed(1)}% rétention
              </span>
              <Sparkline points={video.sparkline} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
