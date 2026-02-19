import { redirect } from "next/navigation";
import { Activity, Database, HardDrive, HeartPulse, ShieldAlert, Timer, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { formatBytes, getOpsHealth, getOpsLogs, getOpsMetrics, type OpsLogEntry } from "@/lib/api/ops";

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}j ${hours}h ${minutes}m`;
}

function statusTone(ok: boolean): "positive" | "negative" {
  return ok ? "positive" : "negative";
}

function methodTone(method: string): string {
  if (method === "GET") {
    return "text-ga";
  }
  if (method === "POST") {
    return "text-accent";
  }
  return "text-text-2";
}

function statusBadge(statusCode: number): "positive" | "negative" | "accent" {
  if (statusCode >= 500) {
    return "negative";
  }
  if (statusCode >= 400) {
    return "accent";
  }
  return "positive";
}

export default async function OpsPage({
  searchParams
}: {
  searchParams?: { key?: string };
}): Promise<JSX.Element> {
  const panelKey = searchParams?.key;

  let health: Awaited<ReturnType<typeof getOpsHealth>>;
  let metrics: Awaited<ReturnType<typeof getOpsMetrics>>;
  let logs: OpsLogEntry[];

  try {
    [health, metrics, logs] = await Promise.all([
      getOpsHealth({ key: panelKey }),
      getOpsMetrics({ key: panelKey }),
      getOpsLogs(120, { key: panelKey })
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      redirect("/login");
    }

    if (error instanceof Error && error.message === "OPS_FORBIDDEN") {
      return (
        <PageWrapper title="Ops Panel">
          <section className="glass rounded-2xl border-youtube/25 p-6">
            <div className="flex items-center gap-3">
              <ShieldAlert size={20} className="text-youtube" />
              <h2 className="text-xl font-semibold text-text">Accès refusé</h2>
            </div>
            <p className="mt-3 text-sm text-text-2">
              Ce panneau est protégé par une clé. Ouvre l’URL avec <code className="rounded bg-surface px-1.5 py-0.5 text-xs text-accent">?key=...</code>.
            </p>
            <p className="mt-2 text-xs text-text-muted">
              Exemple: <code className="rounded bg-surface px-1.5 py-0.5 text-xs text-text">/internal/ops?key=ton_secret</code>
            </p>
          </section>
        </PageWrapper>
      );
    }

    throw error;
  }

  return (
    <PageWrapper title="Ops Panel">
      <section className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Hidden admin panel</p>
            <h2 className="mt-2 text-2xl font-semibold text-text">État de l’application</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-2">
              Vue technique interne pour suivre health, métriques runtime, activité des jobs et logs structurés.
            </p>
          </div>
          <div className="text-right text-xs text-text-muted">
            <p>Dernière mesure: {new Date(health.timestamp).toLocaleString("fr-FR")}</p>
            <p className="mt-1">Node: {health.nodeVersion}</p>
            <p className="mt-1">Env: {health.environment}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-border bg-surface/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Health</p>
            <HeartPulse size={16} className={health.status === "ok" ? "text-ga" : "text-youtube"} />
          </div>
          <p className="mt-3 text-2xl font-semibold text-text">{health.status === "ok" ? "OPERATIONAL" : "DEGRADED"}</p>
          <div className="mt-2">
            <Badge tone={statusTone(health.database.ok)}>DB {health.database.ok ? "UP" : "DOWN"}</Badge>
          </div>
        </article>
        <article className="rounded-2xl border border-border bg-surface/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Uptime</p>
            <Timer size={16} className="text-accent" />
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold text-text">{formatUptime(health.uptimeSeconds)}</p>
          <p className="mt-2 text-xs text-text-2">DB latency: {health.database.latencyMs} ms</p>
        </article>
        <article className="rounded-2xl border border-border bg-surface/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Queue Jobs</p>
            <Workflow size={16} className="text-accent" />
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold text-text">{health.queue.total}</p>
          <p className="mt-2 text-xs text-text-2">
            waiting {health.queue.waiting} · active {health.queue.active} · failed {health.queue.failed}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-surface/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Memory</p>
            <HardDrive size={16} className="text-accent" />
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold text-text">{formatBytes(health.memory.heapUsedBytes)}</p>
          <p className="mt-2 text-xs text-text-2">RSS {formatBytes(health.memory.rssBytes)}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-text">Métriques produit</h3>
            <Activity size={16} className="text-accent" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Users</p>
              <p className="mt-1 font-mono text-xl text-text">{metrics.counts.users}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Snapshots</p>
              <p className="mt-1 font-mono text-xl text-text">{metrics.counts.snapshots}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Reports</p>
              <p className="mt-1 font-mono text-xl text-text">{metrics.counts.reports}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Digests</p>
              <p className="mt-1 font-mono text-xl text-text">{metrics.counts.digests}</p>
            </div>
          </div>
        </article>

        <article className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-text">Traffic API</h3>
            <Database size={16} className="text-accent" />
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Total requêtes</p>
              <p className="mt-1 font-mono text-xl text-text">{metrics.requests.totalRequests}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Success rate</p>
              <p className="mt-1 font-mono text-xl text-text">{metrics.requests.successRate}%</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">Latence moyenne</p>
              <p className="mt-1 font-mono text-xl text-text">{metrics.requests.averageDurationMs} ms</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 px-3 py-2">
              <p className="text-xs text-text-muted">p95</p>
              <p className="mt-1 font-mono text-xl text-text">{metrics.requests.p95DurationMs} ms</p>
            </div>
          </div>
        </article>
      </section>

      <section className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold text-text">Logs structurés récents</h3>
          <span className="text-xs text-text-muted">{logs.length} lignes</span>
        </div>
        <div className="max-h-[460px] overflow-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border/80">
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Time</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Method</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">URL</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Status</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Durée</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Req ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={`${log.requestId}-${log.timestamp}`} className="border-b border-border/50 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-text-2">{new Date(log.timestamp).toLocaleTimeString("fr-FR")}</td>
                  <td className={`whitespace-nowrap px-3 py-2 text-xs font-semibold ${methodTone(log.method)}`}>{log.method}</td>
                  <td className="max-w-[520px] truncate px-3 py-2 text-xs text-text">{log.url}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge tone={statusBadge(log.statusCode)}>{log.statusCode}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-text">{log.durationMs} ms</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-text-muted">{log.requestId.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageWrapper>
  );
}
