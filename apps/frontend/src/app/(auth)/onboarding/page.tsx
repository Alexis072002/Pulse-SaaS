import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const steps = [
  "Création du compte",
  "Connexion YouTube (OAuth2)",
  "Connexion Google Analytics"
] as const;

export default function OnboardingPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-2 w-full rounded-full bg-surface2">
          <div className="h-full w-1/3 rounded-full bg-accent" />
        </div>
        {steps.map((step, index) => (
          <Card key={step} className="flex items-center justify-between">
            <span>{`${index + 1}. ${step}`}</span>
            <Button variant="ghost">Connecter</Button>
          </Card>
        ))}
      </div>
    </main>
  );
}
