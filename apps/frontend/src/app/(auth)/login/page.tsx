import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
        <h1 className="font-syne text-3xl font-extrabold">Connexion</h1>
        <p className="mt-2 text-sm text-text2">Connecte ton compte Pulse pour accéder au dashboard.</p>
        <form className="mt-6 space-y-4">
          <Input placeholder="Email" type="email" />
          <Input placeholder="Mot de passe" type="password" />
          <Button className="w-full">Continuer</Button>
        </form>
      </section>
    </main>
  );
}
