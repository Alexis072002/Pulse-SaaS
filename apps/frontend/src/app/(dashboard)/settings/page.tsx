"use client";

import { useEffect, useState } from "react";
import { BellRing, LayoutTemplate, Palette, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/Button";
import { useUiStore, type Period, type ThemeMode } from "@/store/ui-store";

const STORAGE_KEYS = {
  animations: "pulse-settings-animations",
  emailDigest: "pulse-settings-email-digest",
  insights: "pulse-settings-insights"
} as const;

function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return fallback;
  }
  return raw === "true";
}

function writeStoredBoolean(key: string, value: boolean): void {
  window.localStorage.setItem(key, value ? "true" : "false");
}

export default function SettingsPage(): JSX.Element {
  const { selectedPeriod, setSelectedPeriod, theme, setTheme } = useUiStore();
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(true);
  const [insightAlertsEnabled, setInsightAlertsEnabled] = useState(true);

  useEffect(() => {
    setAnimationsEnabled(readStoredBoolean(STORAGE_KEYS.animations, true));
    setEmailDigestEnabled(readStoredBoolean(STORAGE_KEYS.emailDigest, true));
    setInsightAlertsEnabled(readStoredBoolean(STORAGE_KEYS.insights, true));
  }, []);

  const updateTheme = (nextTheme: ThemeMode): void => {
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem("pulse-theme", nextTheme);
  };

  const updatePeriod = (period: Period): void => {
    setSelectedPeriod(period);
  };

  const toggleAnimations = (): void => {
    const next = !animationsEnabled;
    setAnimationsEnabled(next);
    writeStoredBoolean(STORAGE_KEYS.animations, next);
  };

  const toggleEmailDigest = (): void => {
    const next = !emailDigestEnabled;
    setEmailDigestEnabled(next);
    writeStoredBoolean(STORAGE_KEYS.emailDigest, next);
  };

  const toggleInsightAlerts = (): void => {
    const next = !insightAlertsEnabled;
    setInsightAlertsEnabled(next);
    writeStoredBoolean(STORAGE_KEYS.insights, next);
  };

  return (
    <PageWrapper title="Paramètres">
      <section className="grid gap-4 xl:grid-cols-3">
        <article className="glass rounded-2xl p-5 xl:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Personnalisation</p>
          <h2 className="mt-2 text-xl font-semibold text-text">Préférences d&apos;interface</h2>
          <p className="mt-2 text-sm text-text-2">
            Paramètres locaux du dashboard. Ces options préparent la future configuration workspace partagée.
          </p>
        </article>

        <article className="glass rounded-2xl p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">État V1</p>
          <p className="mt-2 text-sm text-text-2">
            Les paramètres sont stockés en local. La persistance serveur arrive avec la gestion d&apos;équipe complète.
          </p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-accent" />
            <h3 className="text-base font-semibold text-text">Thème visuel</h3>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant={theme === "dark" ? "primary" : "outline"}
              size="sm"
              onClick={() => updateTheme("dark")}
            >
              Dark
            </Button>
            <Button
              variant={theme === "light" ? "primary" : "outline"}
              size="sm"
              onClick={() => updateTheme("light")}
            >
              Light
            </Button>
          </div>
        </article>

        <article className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={16} className="text-accent" />
            <h3 className="text-base font-semibold text-text">Fenêtre analytics par défaut</h3>
          </div>
          <div className="mt-4 flex gap-2">
            {(["7d", "30d", "90d"] as Period[]).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "primary" : "outline"}
                size="sm"
                onClick={() => updatePeriod(period)}
              >
                {period.toUpperCase()}
              </Button>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <h3 className="text-base font-semibold text-text">Animations</h3>
          </div>
          <p className="mt-2 text-sm text-text-2">Activer les animations et transitions UI.</p>
          <Button variant={animationsEnabled ? "primary" : "outline"} size="sm" className="mt-4" onClick={toggleAnimations}>
            {animationsEnabled ? "Activées" : "Désactivées"}
          </Button>
        </article>

        <article className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <BellRing size={16} className="text-accent" />
            <h3 className="text-base font-semibold text-text">Digest email</h3>
          </div>
          <p className="mt-2 text-sm text-text-2">Recevoir un récapitulatif email des rapports.</p>
          <Button variant={emailDigestEnabled ? "primary" : "outline"} size="sm" className="mt-4" onClick={toggleEmailDigest}>
            {emailDigestEnabled ? "Activé" : "Désactivé"}
          </Button>
        </article>

        <article className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <BellRing size={16} className="text-accent" />
            <h3 className="text-base font-semibold text-text">Alertes insight</h3>
          </div>
          <p className="mt-2 text-sm text-text-2">Notifier quand une anomalie ou corrélation forte est détectée.</p>
          <Button variant={insightAlertsEnabled ? "primary" : "outline"} size="sm" className="mt-4" onClick={toggleInsightAlerts}>
            {insightAlertsEnabled ? "Activées" : "Désactivées"}
          </Button>
        </article>
      </section>
    </PageWrapper>
  );
}
