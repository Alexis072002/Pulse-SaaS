import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Eye, Gauge, TrendingUp, Users, Zap, type LucideIcon } from "lucide-react";
import { CombinedPerformanceChart } from "@/components/charts/CombinedPerformanceChart";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Badge } from "@/components/ui/Badge";
import { getOverviewData, toChartData, type OverviewData, type Period } from "@/lib/api/overview";
import { formatNumber } from "@/lib/utils/formatNumber";
import { cn } from "@/lib/utils/cn";

const PERIODS: Period[] = ["7d", "30d", "90d"];

type Tone = "youtube" | "ga" | "accent";

interface OverviewMetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  hint: string;
  delta?: number;
}

interface DriverCardProps {
  label: string;
  value: string;
  helper: string;
  strength: number;
  tone: Tone;
}

function parsePeriod(period: string | undefined): Period {
  if (period === "7d" || period === "90d") {
    return period;
  }
  return "30d";
}

function toneStyles(tone: Tone): string {
  if (tone === "youtube") {
    return "text-youtube";
  }
  if (tone === "ga") {
    return "text-ga";
  }
  return "text-accent";
}

function deltaBadgeTone(delta: number): "positive" | "negative" {
  return delta >= 0 ? "positive" : "negative";
}

function formatDelta(delta: number): string {
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
}

function OverviewMetricCard({ label, value, icon: Icon, tone, hint, delta }: OverviewMetricCardProps): JSX.Element {
  return (
    <article className="group rounded-2xl border border-border bg-surface/80 p-4 backdrop-blur-sm transition-colors hover:bg-surface-hover">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</p>
        <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2", toneStyles(tone))}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 font-mono text-[2rem] font-semibold leading-none text-text">{value}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-text-2">{hint}</p>
        {typeof delta === "number" ? (
          <Badge tone={deltaBadgeTone(delta)}>{formatDelta(delta)}</Badge>
        ) : null}
      </div>
    </article>
  );
}

function DriverCard({ label, value, helper, strength, tone }: DriverCardProps): JSX.Element {
  return (
    <article className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-text">{label}</p>
        <p className={cn("font-mono text-sm", toneStyles(tone))}>{value}</p>
      </div>
      <p className="mt-2 text-xs text-text-2">{helper}</p>
      <div className="mt-3 h-1.5 rounded-full bg-border">
        <div
          className={cn("h-full rounded-full", tone === "youtube" ? "bg-youtube" : tone === "ga" ? "bg-ga" : "bg-accent")}
          style={{ width: `${Math.max(8, Math.min(strength, 100))}%` }}
        />
      </div>
    </article>
  );
}

export default async function OverviewPage({
  searchParams
}: {
  searchParams?: { period?: string };
}): Promise<JSX.Element> {
  const period = parsePeriod(searchParams?.period);
  let overview: OverviewData;
  try {
    overview = await getOverviewData(period);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      redirect("/login");
    }
    throw error;
  }

  if (!overview) {
    redirect("/login");
  }

  const chartData = toChartData(overview);
  const periodLabel = period.toUpperCase();
  const periodDays = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const subscriberYield = overview.youtubeViews > 0
    ? (overview.subscribersGained / overview.youtubeViews) * 100
    : 0;
  const maxVolume = Math.max(1, overview.youtubeViews, overview.webSessions);

  const signals = [
    { label: "YouTube views", delta: overview.youtubeViewsDelta },
    { label: "Sessions web", delta: overview.webSessionsDelta },
    { label: "Pulse score", delta: overview.pulseScoreDelta }
  ];

  const dominantSignal = [...signals].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? {
    label: "N/A",
    delta: 0
  };
  const riskSignal = [...signals]
    .filter((signal) => signal.delta < 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  const recommendation = riskSignal?.label === "Pulse score"
    ? "Priorise les contenus avec rétention stable et cadence régulière."
    : riskSignal?.label === "Sessions web"
      ? "Optimise les points de conversion web sur les sources qui performent."
      : riskSignal?.label === "YouTube views"
        ? "Relance les formats vidéo qui génèrent du reach organique."
        : "Momentum global positif. Maintiens le rythme de publication et de distribution.";

  return (
    <PageWrapper title="Overview">
      <section className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Executive summary</p>
            <h2 className="mt-2 text-2xl font-semibold text-text">Tableau de bord global ({periodLabel})</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-2">
              Signal dominant: <span className="font-medium text-text">{dominantSignal.label}</span> ({formatDelta(dominantSignal.delta)}).
              {riskSignal ? ` Point de vigilance: ${riskSignal.label} (${formatDelta(riskSignal.delta)}).` : " Aucun signal de risque majeur sur cette période."}
            </p>
          </div>

          <div className="text-right text-xs text-text-2">
            <p>Dernière synchro: {new Date(overview.lastUpdatedAt).toLocaleString("fr-FR")}</p>
            <p className="mt-1">Fenêtre active: {periodDays} jours</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {PERIODS.map((periodOption) => (
            <Link
              key={periodOption}
              href={`/overview?period=${periodOption}`}
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

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <OverviewMetricCard
          label={`Vues YouTube (${periodLabel})`}
          value={formatNumber(overview.youtubeViews)}
          icon={Eye}
          tone="youtube"
          hint="Volume d'audience vidéo"
          delta={overview.youtubeViewsDelta}
        />
        <OverviewMetricCard
          label={`Abonnés gagnés (${periodLabel})`}
          value={formatNumber(overview.subscribersGained)}
          icon={Users}
          tone="youtube"
          hint={`${subscriberYield.toFixed(2)}% de conversion vues→abonnés`}
        />
        <OverviewMetricCard
          label={`Sessions web (${periodLabel})`}
          value={formatNumber(overview.webSessions)}
          icon={TrendingUp}
          tone="ga"
          hint="Trafic web total"
          delta={overview.webSessionsDelta}
        />
        <OverviewMetricCard
          label="Pulse Score"
          value={formatNumber(overview.pulseScore)}
          icon={Zap}
          tone="accent"
          hint="Santé globale du funnel"
          delta={overview.pulseScoreDelta}
        />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <CombinedPerformanceChart data={chartData} title="Trajectoire multi-plateforme" subtitle="Comparaison dynamique YouTube vs Web" />
        </div>

        <aside className="glass min-w-0 rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Insights rapides</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Signal principal</p>
              <p className="mt-1 text-sm font-medium text-text">
                {dominantSignal.label} ({formatDelta(dominantSignal.delta)})
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Action recommandée</p>
              <p className="mt-1 text-sm text-text">{recommendation}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">État global</p>
              <div className="mt-1 flex items-center gap-2">
                <Gauge size={14} className="text-accent" />
                <span className="text-sm text-text">
                  Pulse score: <span className="font-semibold">{formatNumber(overview.pulseScore)}</span>
                </span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <DriverCard
          label="Driver YouTube"
          value={formatDelta(overview.youtubeViewsDelta)}
          helper={`${formatNumber(overview.youtubeViews)} vues sur la période`}
          strength={Math.round((overview.youtubeViews / maxVolume) * 100)}
          tone="youtube"
        />
        <DriverCard
          label="Driver Web"
          value={formatDelta(overview.webSessionsDelta)}
          helper={`${formatNumber(overview.webSessions)} sessions web`}
          strength={Math.round((overview.webSessions / maxVolume) * 100)}
          tone="ga"
        />
        <DriverCard
          label="Driver Pulse"
          value={formatDelta(overview.pulseScoreDelta)}
          helper={`Score global actuel: ${formatNumber(overview.pulseScore)}`}
          strength={Math.max(0, Math.min(100, overview.pulseScore))}
          tone="accent"
        />
      </section>

      <section className="glass rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-2">
          <span className="inline-flex items-center gap-1.5">
            <Activity size={14} className="text-accent" />
            Synthèse cross-canal YouTube + GA4
          </span>
          <span>Source: snapshots synchronisés automatiquement</span>
        </div>
      </section>
    </PageWrapper>
  );
}
