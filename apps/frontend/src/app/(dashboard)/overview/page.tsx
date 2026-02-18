import Link from "next/link";
import { CombinedPerformanceChart } from "@/components/charts/CombinedPerformanceChart";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { KpiCard } from "@/components/ui/KpiCard";
import { getOverviewData, toChartData, type Period } from "@/lib/api/overview";
import { cn } from "@/lib/utils/cn";

const PERIODS: Period[] = ["7d", "30d", "90d"];

function parsePeriod(period: string | undefined): Period {
  if (period === "7d" || period === "90d") {
    return period;
  }
  return "30d";
}

export default async function OverviewPage({
  searchParams
}: {
  searchParams?: { period?: string };
}): Promise<JSX.Element> {
  const period = parsePeriod(searchParams?.period);
  const overview = await getOverviewData(period);
  const chartData = toChartData(overview);
  const periodLabel = period.toUpperCase();

  const kpis = [
    {
      label: `VUES YOUTUBE (${periodLabel})`,
      value: overview.youtubeViews,
      delta: overview.youtubeViewsDelta,
      accent: "youtube" as const
    },
    {
      label: `ABONNÉS GAGNÉS (${periodLabel})`,
      value: overview.subscribersGained,
      delta: overview.youtubeViewsDelta,
      accent: "youtube" as const
    },
    {
      label: `SESSIONS WEB (${periodLabel})`,
      value: overview.webSessions,
      delta: overview.webSessionsDelta,
      accent: "ga" as const
    },
    {
      label: "PULSE SCORE",
      value: overview.pulseScore,
      delta: overview.pulseScoreDelta,
      accent: "accent" as const
    }
  ];

  return (
    <PageWrapper title="Overview">
      <section className="flex items-center gap-2">
        {PERIODS.map((periodOption) => (
          <Link
            key={periodOption}
            href={`/overview?period=${periodOption}`}
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
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            delta={kpi.delta}
            accent={kpi.accent}
            index={index}
          />
        ))}
      </section>
      <CombinedPerformanceChart data={chartData} />
    </PageWrapper>
  );
}
