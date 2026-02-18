import Link from "next/link";
import { redirect } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { SessionsAreaChart } from "@/features/analytics/components/SessionsAreaChart";
import { TopPagesTable } from "@/features/analytics/components/TopPagesTable";
import { TrafficSourcesDonut } from "@/features/analytics/components/TrafficSourcesDonut";
import { WorldTrafficMap } from "@/features/analytics/components/WorldTrafficMap";
import { getGa4Stats, parsePeriod, toSessionsChartData, type Ga4StatsData, type Period } from "@/lib/api/analytics";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/formatNumber";

const PERIODS: Period[] = ["7d", "30d", "90d"];

function formatDelta(delta: number): string {
  return delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;
}

function formatPercentage(value: number): string {
  const normalized = value <= 1 ? value * 100 : value;
  return `${normalized.toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return `${minutes}m ${String(remaining).padStart(2, "0")}s`;
}

export default async function AnalyticsPage({
  searchParams
}: {
  searchParams?: { period?: string };
}): Promise<JSX.Element> {
  const period = parsePeriod(searchParams?.period);
  let stats: Ga4StatsData | null = null;
  let setupRequired = false;

  try {
    stats = await getGa4Stats(period);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      redirect("/login");
    }
    if (error instanceof Error && error.message === "GA4_NOT_CONFIGURED") {
      setupRequired = true;
    } else {
      throw error;
    }
  }

  if (!stats) {
    if (!setupRequired) {
      redirect("/login");
    }

    return (
      <PageWrapper title="Web Analytics (GA4)">
        <section className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-text2">
            Aucun `GA4 Property ID` détecté. Reconnecte Google avec ton identifiant de propriété GA4 pour activer cette vue.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-md border border-accent bg-accent/20 px-4 py-2 text-sm text-text transition hover:bg-accent/30"
          >
            Reconnecter Google
          </Link>
        </section>
      </PageWrapper>
    );
  }

  const sessionsChartData = toSessionsChartData(stats);

  return (
    <PageWrapper title="Web Analytics (GA4)">
      <section className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {PERIODS.map((periodOption) => (
            <Link
              key={periodOption}
              href={`/analytics?period=${periodOption}`}
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-border bg-surface p-4" style={{ borderTop: "2px solid #34D399" }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">Sessions ({period.toUpperCase()})</p>
          <p className="mt-2 font-mono text-3xl text-text">{formatNumber(stats.sessions)}</p>
          <p className={`mt-2 text-xs ${stats.sessionsDelta >= 0 ? "text-ga" : "text-youtube"}`}>{formatDelta(stats.sessionsDelta)}</p>
        </article>

        <article className="rounded-xl border border-border bg-surface p-4" style={{ borderTop: "2px solid #A855F7" }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">Nouveaux utilisateurs</p>
          <p className="mt-2 font-mono text-3xl text-text">{formatNumber(stats.newUsers)}</p>
          <p className={`mt-2 text-xs ${stats.newUsersDelta >= 0 ? "text-ga" : "text-youtube"}`}>{formatDelta(stats.newUsersDelta)}</p>
        </article>

        <article className="rounded-xl border border-border bg-surface p-4" style={{ borderTop: "2px solid #A855F7" }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">Taux de rebond</p>
          <p className="mt-2 font-mono text-3xl text-text">{formatPercentage(stats.bounceRate)}</p>
          <p className={`mt-2 text-xs ${stats.bounceRateDelta <= 0 ? "text-ga" : "text-youtube"}`}>{formatDelta(stats.bounceRateDelta)}</p>
        </article>

        <article className="rounded-xl border border-border bg-surface p-4" style={{ borderTop: "2px solid #A855F7" }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">Durée session moyenne</p>
          <p className="mt-2 font-mono text-3xl text-text">{formatDuration(stats.averageSessionDuration)}</p>
          <p className={`mt-2 text-xs ${stats.averageSessionDurationDelta >= 0 ? "text-ga" : "text-youtube"}`}>
            {formatDelta(stats.averageSessionDurationDelta)}
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <SessionsAreaChart data={sessionsChartData} />
        <TrafficSourcesDonut sources={stats.trafficSources} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <TopPagesTable pages={stats.topPages} />
        <WorldTrafficMap countries={stats.countries} />
      </section>
    </PageWrapper>
  );
}
