import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, MousePointerClick, UserPlus, Users } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { KpiCard } from "@/components/ui/KpiCard";
import { SessionsAreaChart } from "@/features/analytics/components/SessionsAreaChart";
import { TopPagesTable } from "@/features/analytics/components/TopPagesTable";
import { TrafficSourcesDonut } from "@/features/analytics/components/TrafficSourcesDonut";
import { WorldTrafficMap } from "@/features/analytics/components/WorldTrafficMap";
import { getGa4Stats, parsePeriod, toSessionsChartData, type Ga4StatsData, type Period } from "@/lib/api/analytics";
import { cn } from "@/lib/utils/cn";

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
        <section className="glass rounded-2xl p-6">
          <p className="text-sm text-text-2">
            Aucun <code className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-xs text-accent">GA4 Property ID</code> détecté. Reconnecte Google avec ton identifiant de propriété GA4 pour activer cette vue.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-glow-sm transition-all hover:bg-accent-hover hover:shadow-glow-accent"
          >
            Reconnecter Google
          </Link>
        </section>
      </PageWrapper>
    );
  }

  const sessionsChartData = toSessionsChartData(stats);
  const hasNoGaData = stats.sessions === 0 && stats.topPages.length === 0 && stats.trafficSources.length === 0;

  return (
    <PageWrapper title="Web Analytics (GA4)">
      <section className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {PERIODS.map((periodOption) => (
            <Link
              key={periodOption}
              href={`/analytics?period=${periodOption}`}
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
        <div className="text-right text-xs text-text-muted">
          <p>Property ID: {stats.gaPropertyId}</p>
          <p>Dernière synchro: {new Date(stats.lastUpdatedAt).toLocaleString("fr-FR")}</p>
        </div>
      </section>

      {hasNoGaData ? (
        <section className="glass rounded-2xl border-youtube/20 p-4">
          <p className="text-sm text-youtube">
            Aucune donnée détectée sur la période pour la propriété GA4 {stats.gaPropertyId}.
            Vérifie que c&apos;est la bonne propriété et qu&apos;elle reçoit bien du trafic.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`Sessions (${period.toUpperCase()})`}
          value={stats.sessions}
          delta={Number(stats.sessionsDelta.toFixed(1))}
          accent="ga"
          index={0}
          icon={<Users size={18} />}
        />
        <KpiCard
          label="Nouveaux utilisateurs"
          value={stats.newUsers}
          delta={Number(stats.newUsersDelta.toFixed(1))}
          accent="ga"
          index={1}
          icon={<UserPlus size={18} />}
        />
        <article className="glass group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
          <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-accent" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Taux de rebond</p>
              <p className="mt-3 font-mono text-3xl font-semibold text-text">{formatPercentage(stats.bounceRate)}</p>
              <p className={`mt-2 text-xs font-medium ${stats.bounceRateDelta <= 0 ? "text-ga" : "text-youtube"}`}>
                {formatDelta(stats.bounceRateDelta)}
              </p>
            </div>
            <div className="rounded-xl bg-accent-muted p-2 text-accent">
              <MousePointerClick size={18} />
            </div>
          </div>
        </article>
        <article className="glass group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
          <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-accent" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Durée session moyenne</p>
              <p className="mt-3 font-mono text-3xl font-semibold text-text">{formatDuration(stats.averageSessionDuration)}</p>
              <p className={`mt-2 text-xs font-medium ${stats.averageSessionDurationDelta >= 0 ? "text-ga" : "text-youtube"}`}>
                {formatDelta(stats.averageSessionDurationDelta)}
              </p>
            </div>
            <div className="rounded-xl bg-accent-muted p-2 text-accent">
              <Clock size={18} />
            </div>
          </div>
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
