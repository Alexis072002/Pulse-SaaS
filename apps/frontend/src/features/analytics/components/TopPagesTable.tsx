import type { Ga4TopPage } from "@/lib/api/analytics";
import { formatNumber } from "@/lib/utils/formatNumber";

interface TopPagesTableProps {
  pages: Ga4TopPage[];
}

function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return `${minutes}m ${String(remaining).padStart(2, "0")}s`;
}

export function TopPagesTable({ pages }: TopPagesTableProps): JSX.Element {
  const maxSessions = Math.max(1, ...pages.map((page) => page.sessions));

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-4 font-syne text-xl font-bold text-text">Top pages</h2>
      {pages.length === 0 ? (
        <p className="text-sm text-text2">Aucune donnée page disponible pour la période sélectionnée.</p>
      ) : null}
      <div className="space-y-3">
        {pages.map((page, index) => {
          const ratio = (page.sessions / maxSessions) * 100;

          return (
            <article key={`${page.pagePath}-${index}`} className="rounded-lg border border-border bg-surface2 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate text-sm font-medium text-text">{page.pagePath}</p>
                <p className="shrink-0 font-mono text-xs text-text2">{formatNumber(page.sessions)} sessions</p>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-accent" style={{ width: `${ratio}%` }} />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-textMuted">
                <span>{formatNumber(page.pageViews)} pages vues</span>
                <span>{formatDuration(page.averageSessionDuration)} durée moyenne</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
