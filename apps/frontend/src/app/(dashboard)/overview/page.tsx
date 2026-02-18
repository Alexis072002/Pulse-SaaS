import { CombinedPerformanceChart } from "@/components/charts/CombinedPerformanceChart";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { KpiCard } from "@/components/ui/KpiCard";

const kpis = [
  { label: "VUES YOUTUBE (30J)", value: 28400, delta: 18.4, accent: "youtube" as const },
  { label: "ABONNÉS GAGNÉS (30J)", value: 1120, delta: 11.2, accent: "youtube" as const },
  { label: "SESSIONS WEB (30J)", value: 9120, delta: -7.2, accent: "ga" as const },
  { label: "PULSE SCORE", value: 847, delta: -2, accent: "accent" as const }
];

const chartData = [
  { date: "01/01", youtube: 320, ga: 110 },
  { date: "02/01", youtube: 500, ga: 170 },
  { date: "03/01", youtube: 430, ga: 160 },
  { date: "04/01", youtube: 620, ga: 230 },
  { date: "05/01", youtube: 700, ga: 280 },
  { date: "06/01", youtube: 540, ga: 245 },
  { date: "07/01", youtube: 810, ga: 330 }
];

export default function OverviewPage(): JSX.Element {
  return (
    <PageWrapper title="Overview">
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
