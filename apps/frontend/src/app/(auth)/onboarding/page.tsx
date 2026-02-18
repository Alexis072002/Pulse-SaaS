"use client";

import { motion } from "framer-motion";
import { Check, Globe2, Youtube } from "lucide-react";
import { Button } from "@/components/ui/Button";

const steps = [
  { label: "Création du compte", icon: Check, done: true },
  { label: "Connexion YouTube (OAuth2)", icon: Youtube, done: false },
  { label: "Connexion Google Analytics", icon: Globe2, done: false }
] as const;

export default function OnboardingPage(): JSX.Element {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* Animated orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-1/3 h-[400px] w-[400px] rounded-full bg-accent/[0.06] blur-[100px] animate-float" />
        <div className="absolute bottom-1/3 right-1/3 h-[350px] w-[350px] rounded-full bg-accent/[0.04] blur-[80px] animate-float-delayed" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text">Configuration</h1>
          <p className="mt-2 text-sm text-text-2">Connecte tes plateformes pour démarrer</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: "33%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="glass-strong flex items-center justify-between rounded-2xl p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${step.done ? "bg-ga/15 text-ga" : "bg-accent-muted text-accent"}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{`${index + 1}. ${step.label}`}</p>
                    {step.done && (
                      <p className="text-xs text-ga">Complété</p>
                    )}
                  </div>
                </div>
                {!step.done && (
                  <Button variant="outline" size="sm">
                    Connecter
                  </Button>
                )}
                {step.done && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ga/15 text-ga">
                    <Check size={14} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </main>
  );
}
