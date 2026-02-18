import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card } from "@/components/ui/Card";

export default function YoutubePage(): JSX.Element {
  return (
    <PageWrapper title="YouTube Deep Dive">
      <Card>
        <p className="text-text2">Heatmap, top vidéos, sparklines et gauge à implémenter selon le CDC.</p>
      </Card>
    </PageWrapper>
  );
}
