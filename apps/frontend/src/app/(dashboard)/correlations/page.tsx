import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";

export default function CorrelationsPage(): JSX.Element {
  return (
    <PageWrapper title="Corrélations">
      <Card>
        <p className="text-text2">Vue double axe Y + événements annotés + badge score à brancher au service NestJS.</p>
      </Card>
    </PageWrapper>
  );
}
