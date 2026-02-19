import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Activity, CalendarClock, Gauge, TrendingUp, Users, Video } from "lucide-react";
import { ChartPanelSkeleton } from "@/components/charts/ChartPanelSkeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { HeatmapCalendar } from "@/features/youtube/components/HeatmapCalendar";
import { TopVideosList } from "@/features/youtube/components/TopVideosList";
import { getYoutubeStats, parsePeriod, type Period, type YoutubeStatsData } from "@/lib/api/youtube";
import { formatNumber } from "@/lib/utils/formatNumber";
import { cn } from "@/lib/utils/cn";


const PERIODS: Period[] = ["7d", "30d", "90d"];

const SubscribersAreaChart = dynamic(
  () => import("@/features/youtube/components/SubscribersAreaChart").then((module) => module.SubscribersAreaChart),
  {
    ssr: false,
    loading: () => <ChartPanelSkeleton heightClass="h-[360px]" />
  }
);

const RetentionGauge = dynamic(
  () => import("@/features/youtube/components/RetentionGauge").then((module) => module.RetentionGauge),
  {
    ssr: false,
    loading: () => <ChartPanelSkeleton heightClass="h-[360px]" />
  }
);

interface MetricTileProps {
  label: string;
  value: string;
  hint: string;
  icon: JSX.Element;
}

function MetricTile({ label, value, hint, icon }: MetricTileProps): JSX.Element {
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface/80 p-4 backdrop-blur-sm transition-colors hover:bg-surface-hover">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-[13ch] text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-text-muted">
          {label}
        </p>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-youtube">
        {icon}
        </span>
      </div>
      <p className="mt-3 font-mono text-[2.15rem] font-semibold leading-none text-text">{value}</p>
      <p className="mt-2 max-w-[22ch] text-[13px] leading-snug text-text-2">{hint}</p>
    </article>
  );
}

export default async function YoutubePage({
  searchParams
}: {
  searchParams?: { period?: string };
}): Promise<JSX.Element> {
  const period = parsePeriod(searchParams?.period);
  let stats: YoutubeStatsData;
  try {
    stats = await getYoutubeStats(period);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      redirect("/login");
    }
    throw error;
  }

  if (!stats) {
    redirect("/login");
  }

  const topVideo = stats.topVideos[0] ?? null;
  const totalTopVideoViews = stats.topVideos.reduce((sum, video) => sum + video.views, 0);
  const topRetention = stats.topVideos.reduce((max, video) => Math.max(max, video.retentionRate), 0);
  const periodLabel = period.toUpperCase();
  const periodDays = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  return (
    <PageWrapper title="YouTube Analytics">
      <section className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {PERIODS.map((periodOption) => (
            <Link
              key={periodOption}
              href={`/youtube?period=${periodOption}`}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200",
                periodOption === period
                  ? "border-accent bg-accent-muted text-accent shadow-glow-sm"
                  : "border-border bg-surface text-text-2 hover:border-border-2 hover:text-text"
              )}
            >
              {periodOption.toUpperCase()}
            </Link>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          Dernière synchro: {new Date(stats.lastUpdatedAt).toLocaleString("fr-FR")}
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <article className="glass min-w-0 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Vue d&apos;ensemble</p>
              <h2 className="mt-2 text-xl font-semibold text-text">Performance chaîne ({periodLabel})</h2>
            </div>
            <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-2">
              Fenêtre: {periodDays} jours
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <MetricTile
              label="Abonnés totaux"
              value={formatNumber(stats.subscribersTotal)}
              hint="Base actuelle"
              icon={<Users size={16} />}
            />
            <MetricTile
              label={`Abonnés gagnés (${periodLabel})`}
              value={formatNumber(stats.subscribersGained)}
              hint="Croissance nette"
              icon={<TrendingUp size={16} />}
            />
            <MetricTile
              label="Rétention moyenne"
              value={`${stats.averageRetention.toFixed(1)}%`}
              hint="Watch time moyen"
              icon={<Gauge size={16} />}
            />
            <MetricTile
              label="Vues top vidéos"
              value={formatNumber(totalTopVideoViews)}
              hint="Cumul top contenus"
              icon={<Activity size={16} />}
            />
          </div>
        </article>

        <article className="glass min-w-0 rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Spotlight vidéo</p>
          {topVideo ? (
            <div className="mt-3 space-y-3">
              <Image
                src={topVideo.thumbnailUrl}
                alt={topVideo.title}
                width={640}
                height={360}
                className="h-40 w-full rounded-xl border border-border object-cover"
                sizes="(max-width: 640px) 100vw, 42vw"
                loading="lazy"
              />
              <h3 className="max-h-[3rem] overflow-hidden text-base font-semibold leading-snug text-text">{topVideo.title}</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
                  <p className="text-text-muted">Vues</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-text">{formatNumber(topVideo.views)}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
                  <p className="text-text-muted">Rétention max</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-text">{topRetention.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-2">Aucune vidéo disponible pour cette période.</p>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SubscribersAreaChart points={stats.subscribersSeries} />
        </div>
        <div className="min-w-0">
          <RetentionGauge retention={stats.averageRetention} delta={stats.averageRetentionDelta} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <TopVideosList videos={stats.topVideos} />
        </div>
        <div className="min-w-0">
          <HeatmapCalendar cells={stats.heatmap} />
        </div>
      </section>

      <section className="glass rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-2">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock size={14} className="text-youtube" />
            Période active: {periodDays} jours
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Video size={14} className="text-youtube" />
            {formatNumber(stats.topVideos.length)} vidéos classées
          </span>
          <span>Comparaison basée sur les snapshots YouTube synchronisés.</span>
        </div>
      </section>
    </PageWrapper>
  );
}
