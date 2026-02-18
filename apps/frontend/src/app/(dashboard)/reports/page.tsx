import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";

export default function ReportsPage(): JSX.Element {
  return (
    <PageWrapper title="Rapports">
      <Card>
        <p className="text-text2">Liste des rapports PDF (Pending / Done / Failed) et téléchargement.</p>
      </Card>
    </PageWrapper>
  );
}
