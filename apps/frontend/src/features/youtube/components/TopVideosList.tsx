import type { YoutubeTopVideo } from "@/lib/api/youtube";
import { formatNumber } from "@/lib/utils/formatNumber";

function Sparkline({ points }: { points: number[] }): JSX.Element {
  const width = 120;
  const height = 36;
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
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="rounded bg-surface2">
      <polyline
        fill="none"
        stroke="#A855F7"
        strokeWidth="2"
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
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-4 font-syne text-xl font-bold text-text">Top vidéos</h2>
      <div className="space-y-3">
        {videos.map((video) => (
          <article
            key={video.videoId}
            className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface2 p-3 lg:grid-cols-[112px_1fr_auto] lg:items-center"
          >
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="h-16 w-28 rounded-md border border-border object-cover"
              loading="lazy"
            />
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium text-text">{video.title}</p>
              <p className="font-mono text-xs text-text2">{formatNumber(video.views)} vues</p>
            </div>
            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <Sparkline points={video.sparkline} />
              <span
                className={`rounded-md border px-2 py-1 text-xs ${
                  video.retentionRate >= 60
                    ? "border-ga/30 bg-ga/10 text-ga"
                    : "border-youtube/30 bg-youtube/10 text-youtube"
                }`}
              >
                {video.retentionRate.toFixed(1)}% rétention
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
