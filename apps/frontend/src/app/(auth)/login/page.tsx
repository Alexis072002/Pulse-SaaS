import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string };
}): JSX.Element {
  const hasOAuthError = searchParams?.error === "oauth_failed";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl border border-border bg-surface p-6">
        <h1 className="font-syne text-3xl font-extrabold">Connexion Google</h1>
        <p className="mt-2 text-sm text-text2">
          Connecte ton compte Google pour récupérer tes données YouTube et GA4 réelles.
        </p>

        {hasOAuthError ? (
          <p className="mt-3 rounded-md border border-youtube/30 bg-youtube/10 px-3 py-2 text-xs text-youtube">
            L'authentification Google a échoué. Réessaie après avoir vérifié tes variables OAuth.
          </p>
        ) : null}

        <form className="mt-6 space-y-4" action={`${API_URL}/auth/google`} method="GET">
          <Input
            placeholder="GA4 Property ID (optionnel, ex: 123456789)"
            name="gaPropertyId"
            type="text"
          />
          <Button className="w-full" type="submit">
            Continuer avec Google
          </Button>
        </form>
      </section>
    </main>
  );
}
