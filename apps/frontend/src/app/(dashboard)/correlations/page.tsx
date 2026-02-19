import Link from "next/link";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { Activity, BrainCircuit, CalendarClock, Timer, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ChartPanelSkeleton } from "@/components/charts/ChartPanelSkeleton";
import { getCorrelations, parsePeriod, toChartData, type CorrelationData, type Period } from "@/lib/api/correlations";
import { cn } from "@/lib/utils/cn";

const PERIODS: Period[] = ["7d", "30d", "90d"];

const CorrelationDualAxisChart = dynamic(
  () => import("@/features/correlations/components/CorrelationDualAxisChart").then((module) => module.CorrelationDualAxisChart),
  {
    ssr: false,
    loading: () => <ChartPanelSkeleton heightClass="h-[400px]" />
  }
);

interface CorrelationMetricCardProps {
  label: string;
  value: string;
  helper: string;
  icon: JSX.Element;
  tone?: "neutral" | "positive" | "negative" | "accent";
}

function getScoreTone(score: number): string {
  const absolute = Math.abs(score);
  if (absolute >= 0.7) {
    return "text-ga";
  }
  if (absolute >= 0.4) {
    return "text-accent";
  }
  return "text-text-2";
}

function getStrengthLabel(score: number): string {
  const absolute = Math.abs(score);
  if (absolute >= 0.7) {
    return "Corrélation forte";
  }
  if (absolute >= 0.4) {
    return "Corrélation modérée";
  }
  return "Corrélation faible";
}

function formatSigned(value: number, digits = 3): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function CorrelationMetricCard({
  label,
  value,
  helper,
  icon,
  tone = "neutral"
}: CorrelationMetricCardProps): JSX.Element {
  return (
    <article className="group rounded-2xl border border-border bg-surface/80 p-4 backdrop-blur-sm transition-colors hover:bg-surface-hover">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</p>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent">
          {icon}
        </span>
      </div>
      <p className="mt-3 font-mono text-[2rem] font-semibold leading-none text-text">{value}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-text-2">{helper}</p>
        <Badge tone={tone}>{tone === "neutral" ? "stable" : tone === "positive" ? "up" : tone === "negative" ? "risk" : "signal"}</Badge>
      </div>
    </article>
  );
}

export default async function CorrelationsPage({
  searchParams
}: {
  searchParams?: { period?: string };
}): Promise<JSX.Element> {
  const period = parsePeriod(searchParams?.period);
  let data: CorrelationData | null = null;
  let setupRequired = false;

  try {
    data = await getCorrelations(period);
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

  if (!data) {
    if (!setupRequired) {
      redirect("/login");
    }

    return (
      <PageWrapper title="Corrélations">
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

  const chartData = toChartData(data);
  const periodLabel = period.toUpperCase();
  const periodDays = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const lagGain = data.laggedScore - data.score;
  const directionLabel = data.laggedScore >= 0 ? "Relation positive" : "Relation inverse";
  const strengthLabel = getStrengthLabel(data.laggedScore);
  const eventsPreview = data.events.slice(0, 6);
  const recommendation = lagGain > 0.08
    ? "Le décalage améliore nettement le signal: synchronise publication et relais web sur une fenêtre de quelques jours."
    : Math.abs(data.laggedScore) < 0.3
      ? "Signal encore faible: augmente la granularité de contenu et vérifie la qualité des événements GA4."
      : "Signal exploitable: maintiens une cadence régulière et observe l'effet sur les sessions web.";

  return (
    <PageWrapper title="Corrélations">
      <section className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Correlation executive panel</p>
            <h2 className="mt-2 text-2xl font-semibold text-text">Corrélations YouTube ↔ Web ({periodLabel})</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-2">
              {strengthLabel}. {directionLabel}. Décalage optimal observé: {data.lagDays} jour{data.lagDays > 1 ? "s" : ""}.
            </p>
          </div>
          <div className="text-right text-xs text-text-muted">
            <p>Dernière synchro: {new Date(data.lastUpdatedAt).toLocaleString("fr-FR")}</p>
            <p className="mt-1">Fenêtre active: {periodDays} jours</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {PERIODS.map((periodOption) => (
            <Link
              key={periodOption}
              href={`/correlations?period=${periodOption}`}
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
        <CorrelationMetricCard
          label="Score Pearson"
          value={data.score.toFixed(3)}
          helper="Corrélation brute"
          icon={<BrainCircuit size={16} />}
          tone={Math.abs(data.score) >= 0.4 ? "accent" : "neutral"}
        />
        <CorrelationMetricCard
          label="Décalage optimal"
          value={`${data.lagDays} j`}
          helper="Offset détecté"
          icon={<Timer size={16} />}
          tone="neutral"
        />
        <CorrelationMetricCard
          label="Score laggé"
          value={data.laggedScore.toFixed(3)}
          helper={directionLabel}
          icon={<TrendingUp size={16} />}
          tone={Math.abs(data.laggedScore) >= Math.abs(data.score) ? "positive" : "negative"}
        />
        <CorrelationMetricCard
          label="Gain du lag"
          value={formatSigned(lagGain)}
          helper="Impact du décalage"
          icon={<Activity size={16} />}
          tone={lagGain >= 0 ? "positive" : "negative"}
        />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <CorrelationDualAxisChart
            data={chartData}
            events={data.events}
            title="Trajectoire multi-plateforme"
            subtitle="Comparaison dynamique YouTube vs sessions web"
          />
        </div>
        <aside className="glass min-w-0 rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Lecture opérateur</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Niveau de corrélation</p>
              <p className={cn("mt-1 text-sm font-medium", getScoreTone(data.laggedScore))}>{strengthLabel}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Direction</p>
              <p className="mt-1 text-sm text-text">{directionLabel}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Action recommandée</p>
              <p className="mt-1 text-sm text-text">{recommendation}</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <article className="glass rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Insight automatique</p>
          <p className="mt-2 text-sm leading-relaxed text-text-2">{data.insight}</p>
        </article>
        <aside className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text">Événements</h2>
            <span className="text-xs text-text-muted">{eventsPreview.length} affichés</span>
          </div>
          {eventsPreview.length === 0 ? (
            <p className="mt-3 text-sm text-text-2">Aucun événement détecté sur la période.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {eventsPreview.map((event, index) => (
                <article key={`${event.date}-${event.label}-${index}`} className="rounded-xl border border-border bg-surface-2 px-3 py-2">
                  <p className="text-sm font-medium text-text">{event.label}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock size={12} className="text-accent" />
                      {new Date(event.date).toLocaleDateString("fr-FR")}
                    </span>
                    <span>{event.type}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>

      <section className="glass rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-2">
          <span className="inline-flex items-center gap-1.5">
            <BrainCircuit size={14} className="text-accent" />
            Corrélation calculée sur snapshots YouTube + GA4
          </span>
          <span>Fenêtre: {periodDays} jours · Méthode: Pearson + recherche de lag</span>
        </div>
      </section>
    </PageWrapper>
  );
}
