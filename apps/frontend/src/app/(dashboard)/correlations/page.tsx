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
    return "text-accent2";
  }
  return "text-text2";
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
          Dernière synchro: {new Date(data.lastUpdatedAt).toLocaleString("fr-FR")}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">Score corrélation (Pearson)</p>
          <p className={`mt-2 font-mono text-3xl ${getScoreTone(data.score)}`}>{data.score.toFixed(3)}</p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">Décalage estimé</p>
          <p className="mt-2 font-mono text-3xl text-text">{data.lagDays} j</p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">Score avec décalage</p>
          <p className={`mt-2 font-mono text-3xl ${getScoreTone(data.laggedScore)}`}>{data.laggedScore.toFixed(3)}</p>
        </article>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-textMuted">Insight automatique</p>
        <p className="mt-2 text-sm text-text2">{data.insight}</p>
      </section>

      <CorrelationDualAxisChart data={chartData} events={data.events} />
    </PageWrapper>
  );
}
