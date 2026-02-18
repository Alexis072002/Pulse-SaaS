import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, Clock3, FileText, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { GenerateReportButtons, ReportRowActions } from "@/features/reports";
import {
  getReports,
  parseReportStatus,
  parseReportType,
  type ReportItem,
  type ReportStatus,
  type ReportType
} from "@/lib/api/reports";
import { cn } from "@/lib/utils/cn";

const REPORT_TYPES: Array<{ label: string; value?: ReportType }> = [
  { label: "Tous les types" },
  { label: "Hebdo", value: "WEEKLY" },
  { label: "Mensuel", value: "MONTHLY" }
];

const REPORT_STATUSES: Array<{ label: string; value?: ReportStatus }> = [
  { label: "Tous statuts" },
  { label: "Pending", value: "PENDING" },
  { label: "Done", value: "DONE" },
  { label: "Failed", value: "FAILED" }
];

function statusTone(status: ReportStatus): "neutral" | "positive" | "negative" | "accent" {
  if (status === "DONE") {
    return "positive";
  }
  if (status === "FAILED") {
    return "negative";
  }
  return "accent";
}

function statusIcon(status: ReportStatus): JSX.Element {
  if (status === "DONE") {
    return <CheckCircle2 size={14} className="text-ga" />;
  }
  if (status === "FAILED") {
    return <XCircle size={14} className="text-youtube" />;
  }
  return <Clock3 size={14} className="text-accent" />;
}

function countByStatus(items: ReportItem[], status: ReportStatus): number {
  return items.filter((item) => item.status === status).length;
}

function toFrenchType(type: ReportType): string {
  return type === "WEEKLY" ? "Hebdo" : "Mensuel";
}

function withFilters(type: ReportType | undefined, status: ReportStatus | undefined): string {
  const params = new URLSearchParams();
  if (type) {
    params.set("type", type);
  }
  if (status) {
    params.set("status", status);
  }
  const query = params.toString();
  return `/reports${query ? `?${query}` : ""}`;
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams?: { type?: string; status?: string };
}): Promise<JSX.Element> {
  const selectedType = parseReportType(searchParams?.type);
  const selectedStatus = parseReportStatus(searchParams?.status);

  let reports: ReportItem[];
  try {
    reports = await getReports({
      type: selectedType,
      status: selectedStatus
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      redirect("/login");
    }
    throw error;
  }

  const pendingCount = countByStatus(reports, "PENDING");
  const doneCount = countByStatus(reports, "DONE");
  const failedCount = countByStatus(reports, "FAILED");

  return (
    <PageWrapper title="Rapports">
      <section className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Automation center</p>
            <h2 className="mt-2 text-2xl font-semibold text-text">Rapports automatiques</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-2">
              Génère des rapports hebdo/mensuels avec KPIs consolidés, AI digest, et export PDF.
            </p>
          </div>
          <GenerateReportButtons defaultType={selectedType ?? "WEEKLY"} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {REPORT_TYPES.map((option) => (
            <Link
              key={`type-${option.value ?? "ALL"}`}
              href={withFilters(option.value, selectedStatus) as Route}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200",
                option.value === selectedType || (!option.value && !selectedType)
                  ? "border-accent bg-accent-muted text-accent shadow-glow-sm"
                  : "border-border bg-surface text-text-2 hover:border-border-2 hover:text-text"
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {REPORT_STATUSES.map((option) => (
            <Link
              key={`status-${option.value ?? "ALL"}`}
              href={withFilters(selectedType, option.value) as Route}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200",
                option.value === selectedStatus || (!option.value && !selectedStatus)
                  ? "border-accent bg-accent-muted text-accent shadow-glow-sm"
                  : "border-border bg-surface text-text-2 hover:border-border-2 hover:text-text"
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-border bg-surface/80 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Pending</p>
          <p className="mt-3 font-mono text-4xl font-semibold text-accent">{pendingCount}</p>
        </article>
        <article className="rounded-2xl border border-border bg-surface/80 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Done</p>
          <p className="mt-3 font-mono text-4xl font-semibold text-ga">{doneCount}</p>
        </article>
        <article className="rounded-2xl border border-border bg-surface/80 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Failed</p>
          <p className="mt-3 font-mono text-4xl font-semibold text-youtube">{failedCount}</p>
        </article>
      </section>

      <section className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border/80">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Période</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Type</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Statut</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Créé le</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center">
                      <div className="rounded-2xl border border-accent/20 bg-accent-muted p-3 text-accent">
                        <FileText size={24} />
                      </div>
                      <p className="mt-4 text-base font-semibold text-text">Aucun rapport pour ce filtre</p>
                      <p className="mt-1 text-sm text-text-2">
                        Lance une génération hebdo ou mensuelle pour remplir cette section.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-medium text-text">
                        {new Date(report.periodStart).toLocaleDateString("fr-FR")} → {new Date(report.periodEnd).toLocaleDateString("fr-FR")}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-text-muted">
                        <CalendarClock size={12} className="text-accent" />
                        MAJ {new Date(report.updatedAt).toLocaleString("fr-FR")}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm text-text">{toFrenchType(report.type)}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="inline-flex items-center gap-2">
                        {statusIcon(report.status)}
                        <Badge tone={statusTone(report.status)}>{report.status}</Badge>
                      </div>
                      {report.errorMsg ? <p className="mt-1 max-w-xs text-xs text-youtube">{report.errorMsg}</p> : null}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-text-2">
                      {new Date(report.createdAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <ReportRowActions reportId={report.id} reportStatus={report.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageWrapper>
  );
}
