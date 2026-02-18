import Link from "next/link";
import { redirect } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { HeatmapCalendar } from "@/features/youtube/components/HeatmapCalendar";
import { RetentionGauge } from "@/features/youtube/components/RetentionGauge";
import { SubscribersAreaChart } from "@/features/youtube/components/SubscribersAreaChart";
import { TopVideosList } from "@/features/youtube/components/TopVideosList";
import { getYoutubeStats, parsePeriod, type Period, type YoutubeStatsData } from "@/lib/api/youtube";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatNumber";

const PERIODS: Period[] = ["7d", "30d", "90d"];

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

  return (
    <PageWrapper title="YouTube Deep Dive">
      <section className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {PERIODS.map((periodOption) => (
            <Link
              key={periodOption}
              href={`/youtube?period=${periodOption}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
                periodOption === period
                  ? "border-accent bg-accent/20 text-text"
                  : "border-border bg-surface text-text2 hover:border-border2"
              )}
            >
              {periodOption.toUpperCase()}
            </Link>
          ))}
        </div>
        <p className="text-xs text-textMuted">
          Dernière synchro: {new Date(stats.lastUpdatedAt).toLocaleString("fr-FR")}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-border bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">Abonnés totaux</p>
          <p className="mt-2 font-mono text-3xl text-text">{formatNumber(stats.subscribersTotal)}</p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">
            Abonnés gagnés ({period.toUpperCase()})
          </p>
          <p className="mt-2 font-mono text-3xl text-text">{formatNumber(stats.subscribersGained)}</p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">Top performance vidéo</p>
          <p className="mt-2 truncate text-base text-text">{stats.topVideos[0]?.title ?? "Aucune donnée"}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <HeatmapCalendar cells={stats.heatmap} />
        <RetentionGauge retention={stats.averageRetention} delta={stats.averageRetentionDelta} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <SubscribersAreaChart points={stats.subscribersSeries} />
        <TopVideosList videos={stats.topVideos} />
      </section>
    </PageWrapper>
  );
}
