import { FileText } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";

export default function ReportsPage(): JSX.Element {
  return (
    <PageWrapper title="Rapports">
      <div className="glass flex flex-col items-center justify-center rounded-2xl py-16 text-center">
        <div className="mb-4 rounded-2xl bg-accent-muted p-4 text-accent">
          <FileText size={32} />
        </div>
        <h2 className="text-lg font-semibold text-text">Rapports — Bientôt disponible</h2>
        <p className="mt-2 max-w-md text-sm text-text-2">
          Génère et télécharge des rapports PDF détaillés de tes performances YouTube et GA4.
          Cette fonctionnalité est en cours de développement.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-muted px-4 py-2 text-xs font-semibold text-accent">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-accent" />
          En développement
        </div>
      </div>
    </PageWrapper>
  );
}
