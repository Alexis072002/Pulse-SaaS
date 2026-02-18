import Link from "next/link";
import { redirect } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { CorrelationDualAxisChart } from "@/features/correlations/components/CorrelationDualAxisChart";
import { getCorrelations, parsePeriod, toChartData, type CorrelationData, type Period } from "@/lib/api/correlations";
import { cn } from "@/lib/utils/cn";

const PERIODS: Period[] = ["7d", "30d", "90d"];

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

  return (
    <PageWrapper title="Corrélations">
      <section className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
        <p className="text-xs text-text-muted">
          Dernière synchro: {new Date(data.lastUpdatedAt).toLocaleString("fr-FR")}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="glass group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
          <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-accent" />
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Score corrélation (Pearson)</p>
          <p className={`mt-3 font-mono text-3xl font-semibold ${getScoreTone(data.score)}`}>{data.score.toFixed(3)}</p>
        </article>
        <article className="glass group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
          <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-accent" />
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Décalage estimé</p>
          <p className="mt-3 font-mono text-3xl font-semibold text-text">{data.lagDays} j</p>
        </article>
        <article className="glass group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
          <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-accent" />
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Score avec décalage</p>
          <p className={`mt-3 font-mono text-3xl font-semibold ${getScoreTone(data.laggedScore)}`}>{data.laggedScore.toFixed(3)}</p>
        </article>
      </section>

      <section className="glass rounded-2xl p-5">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted">Insight automatique</p>
        <p className="mt-2 text-sm leading-relaxed text-text-2">{data.insight}</p>
      </section>

      <CorrelationDualAxisChart data={chartData} events={data.events} />
    </PageWrapper>
  );
}
