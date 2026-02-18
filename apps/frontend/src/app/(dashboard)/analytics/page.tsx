import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe2, MousePointerClick, Timer, UserPlus, Users } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Badge } from "@/components/ui/Badge";
import { SessionsAreaChart } from "@/features/analytics/components/SessionsAreaChart";
import { TopPagesTable } from "@/features/analytics/components/TopPagesTable";
import { TrafficSourcesDonut } from "@/features/analytics/components/TrafficSourcesDonut";
import { WorldTrafficMap } from "@/features/analytics/components/WorldTrafficMap";
import { getGa4Stats, parsePeriod, toSessionsChartData, type Ga4StatsData, type Period } from "@/lib/api/analytics";
import { formatNumber } from "@/lib/utils/formatNumber";
import { cn } from "@/lib/utils/cn";

const PERIODS: Period[] = ["7d", "30d", "90d"];

type Tone = "ga" | "accent" | "youtube";

interface AnalyticsMetricCardProps {
  label: string;
  value: string;
  hint: string;
  delta: number;
  tone: Tone;
  icon: JSX.Element;
}

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

function toneStyles(tone: Tone): string {
  if (tone === "ga") {
    return "text-ga";
  }
  if (tone === "youtube") {
    return "text-youtube";
  }
  return "text-accent";
}

function AnalyticsMetricCard({ label, value, hint, delta, tone, icon }: AnalyticsMetricCardProps): JSX.Element {
  const toneBadge = delta >= 0 ? "positive" : "negative";

  return (
    <article className="group rounded-2xl border border-border bg-surface/80 p-4 backdrop-blur-sm transition-colors hover:bg-surface-hover">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</p>
        <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2", toneStyles(tone))}>
          {icon}
        </span>
      </div>
      <p className="mt-3 font-mono text-[2rem] font-semibold leading-none text-text">{value}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-text-2">{hint}</p>
        <Badge tone={toneBadge}>{formatDelta(delta)}</Badge>
      </div>
    </article>
  );
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
  const periodLabel = period.toUpperCase();
  const periodDays = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const newUserShare = stats.sessions > 0 ? (stats.newUsers / stats.sessions) * 100 : 0;
  const countriesSorted = [...stats.countries].sort((a, b) => b.sessions - a.sessions);
  const topCountries = countriesSorted.slice(0, 6);
  const countryTotal = Math.max(1, countriesSorted.reduce((sum, item) => sum + item.sessions, 0));

  const signals = [
    { label: "Sessions", delta: stats.sessionsDelta, risk: stats.sessionsDelta < 0 },
    { label: "Nouveaux utilisateurs", delta: stats.newUsersDelta, risk: stats.newUsersDelta < 0 },
    { label: "Taux de rebond", delta: stats.bounceRateDelta, risk: stats.bounceRateDelta > 0 },
    { label: "Durée moyenne", delta: stats.averageSessionDurationDelta, risk: stats.averageSessionDurationDelta < 0 }
  ];

  const dominantSignal = [...signals].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? {
    label: "N/A",
    delta: 0,
    risk: false
  };

  const riskSignal = signals.find((signal) => signal.risk);
  const recommendation = riskSignal?.label === "Taux de rebond"
    ? "Optimise les pages d'entrée: proposition de valeur visible et CTA direct."
    : riskSignal?.label === "Sessions"
      ? "Renforce les canaux d'acquisition qui convertissent le mieux."
      : riskSignal?.label === "Nouveaux utilisateurs"
        ? "Travaille les landing pages orientées onboarding."
        : riskSignal?.label === "Durée moyenne"
          ? "Améliore la profondeur de lecture des pages clés."
          : "Momentum global positif. Continue sur les sources les plus efficaces.";

  return (
    <PageWrapper title="Web Analytics (GA4)">
      <section className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">GA4 executive panel</p>
            <h2 className="mt-2 text-2xl font-semibold text-text">Performance Web ({periodLabel})</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-2">
              Signal dominant: <span className="font-medium text-text">{dominantSignal.label}</span> ({formatDelta(dominantSignal.delta)}).
              {riskSignal ? ` Vigilance: ${riskSignal.label} (${formatDelta(riskSignal.delta)}).` : " Aucun risque majeur détecté sur cette période."}
            </p>
          </div>
          <div className="text-right text-xs text-text-muted">
            <p>Property ID: {stats.gaPropertyId}</p>
            <p className="mt-1">Dernière synchro: {new Date(stats.lastUpdatedAt).toLocaleString("fr-FR")}</p>
            <p className="mt-1">Fenêtre active: {periodDays} jours</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
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
      </section>

      {hasNoGaData ? (
        <section className="glass rounded-2xl border-youtube/20 p-4">
          <p className="text-sm text-youtube">
            Aucune donnée détectée sur la période pour la propriété GA4 {stats.gaPropertyId}.
            Vérifie que c&apos;est la bonne propriété et qu&apos;elle reçoit bien du trafic.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <AnalyticsMetricCard
          label={`Sessions (${periodLabel})`}
          value={formatNumber(stats.sessions)}
          hint="Volume total de trafic"
          delta={Number(stats.sessionsDelta.toFixed(1))}
          tone="ga"
          icon={<Users size={16} />}
        />
        <AnalyticsMetricCard
          label="Nouveaux utilisateurs"
          value={formatNumber(stats.newUsers)}
          hint={`${newUserShare.toFixed(1)}% des sessions`}
          delta={Number(stats.newUsersDelta.toFixed(1))}
          tone="ga"
          icon={<UserPlus size={16} />}
        />
        <AnalyticsMetricCard
          label="Taux de rebond"
          value={formatPercentage(stats.bounceRate)}
          hint="Plus bas = meilleure qualité"
          delta={Number(stats.bounceRateDelta.toFixed(1))}
          tone={stats.bounceRateDelta <= 0 ? "ga" : "youtube"}
          icon={<MousePointerClick size={16} />}
        />
        <AnalyticsMetricCard
          label="Durée session moyenne"
          value={formatDuration(stats.averageSessionDuration)}
          hint="Temps d'engagement par session"
          delta={Number(stats.averageSessionDurationDelta.toFixed(1))}
          tone={stats.averageSessionDurationDelta >= 0 ? "ga" : "youtube"}
          icon={<Timer size={16} />}
        />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <SessionsAreaChart data={sessionsChartData} />
        </div>
        <aside className="glass min-w-0 rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Traffic quality panel</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Acquisition</p>
              <p className="mt-1 text-sm font-medium text-text">{formatNumber(stats.sessions)} sessions</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Engagement</p>
              <p className="mt-1 text-sm font-medium text-text">{formatDuration(stats.averageSessionDuration)} moyenne</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Action recommandée</p>
              <p className="mt-1 text-sm text-text">{recommendation}</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <TrafficSourcesDonut sources={stats.trafficSources} totalSessions={stats.sessions} periodLabel={periodLabel} />
        </div>
        <div className="min-w-0">
          <TopPagesTable pages={stats.topPages} />
        </div>
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="min-w-0">
          <WorldTrafficMap countries={stats.countries} />
        </div>
        <aside className="glass min-w-0 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text">Top pays</h2>
            <span className="text-xs text-text-muted">Part des sessions</span>
          </div>
          {topCountries.length === 0 ? (
            <p className="mt-4 text-sm text-text-2">Aucun pays disponible pour cette période.</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {topCountries.map((country, index) => {
                const share = (country.sessions / countryTotal) * 100;
                return (
                  <article key={`${country.countryCode}-${index}`} className="rounded-xl border border-border bg-surface-2 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-text">{country.country}</p>
                      <p className="font-mono text-xs text-text-2">{share.toFixed(1)}%</p>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">{formatNumber(country.sessions)} sessions</p>
                    <div className="mt-2 h-1.5 rounded-full bg-border">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(6, share)}%` }} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </aside>
      </section>

      <section className="glass rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-2">
          <span className="inline-flex items-center gap-1.5">
            <Globe2 size={14} className="text-accent" />
            Données issues de la propriété GA4 {stats.gaPropertyId}
          </span>
          <span>Comparaison établie sur les snapshots synchronisés automatiquement.</span>
        </div>
      </section>
    </PageWrapper>
  );
}
