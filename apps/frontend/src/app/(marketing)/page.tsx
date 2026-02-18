"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Globe2,
  LineChart,
  Shield,
  Sparkles,
  Zap,
  type LucideIcon
} from "lucide-react";
import { InteractiveParticles } from "@/components/marketing/InteractiveParticles";
import { Button } from "@/components/ui/Button";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow: string;
  signal: string;
  outcomes: string[];
  bento: string;
}

interface StatItem {
  label: string;
  end: number;
  start?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

const features: FeatureItem[] = [
  {
    icon: Globe2,
    title: "Google Analytics (GA4)",
    description: "Sessions, acquisition, engagement et pages clés dans une lecture actionnable pour ton produit.",
    eyebrow: "Acquisition",
    signal: "Live data stream",
    outcomes: ["Sources qui convertissent", "Pages qui retiennent"],
    bento: "xl:col-span-7"
  },
  {
    icon: BarChart3,
    title: "YouTube Deep Dive",
    description: "Rétention, abonnements, et performance vidéo dans le même cockpit.",
    eyebrow: "Contenu",
    signal: "Creator intelligence",
    outcomes: ["Moments de drop", "Formats qui performent"],
    bento: "xl:col-span-5"
  },
  {
    icon: BrainCircuit,
    title: "Corrélations IA",
    description: "Détecte les signaux entre publication vidéo, trafic web et croissance.",
    eyebrow: "Intelligence",
    signal: "Cross-platform links",
    outcomes: ["Impact post-publication", "Lag estimé par période"],
    bento: "xl:col-span-4"
  },
  {
    icon: LineChart,
    title: "Tableaux de bord vivants",
    description: "Des vues qui restent lisibles en temps réel, sans bruit visuel.",
    eyebrow: "Pilotage",
    signal: "Clean operator UI",
    outcomes: ["Vue unique de pilotage", "Focus sur les KPI utiles"],
    bento: "xl:col-span-4"
  },
  {
    icon: Shield,
    title: "Sécurité production",
    description: "OAuth2, chiffrement et stockage robuste pour un workflow fiable.",
    eyebrow: "Confiance",
    signal: "Secure by default",
    outcomes: ["Tokens chiffrés", "Session contrôlée"],
    bento: "xl:col-span-4"
  },
  {
    icon: Zap,
    title: "Pipeline rapide",
    description: "Synchronisation continue pour prendre des décisions quand ça compte.",
    eyebrow: "Vitesse",
    signal: "High cadence refresh",
    outcomes: ["Insights quasi temps réel", "Boucle d’itération courte"],
    bento: "xl:col-span-12"
  }
];

const stats: StatItem[] = [
  { end: 10, suffix: "K+", label: "Métriques analysées" },
  { end: 99.9, suffix: "%", decimals: 1, label: "Uptime garanti" },
  { start: 4, end: 1, prefix: "<", suffix: "s", label: "Temps de chargement" },
  { end: 256, suffix: "-bit", label: "Chiffrement" }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.08 }
  }
};

const reveal = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
};

function formatStatValue(item: StatItem, value: number): string {
  const hasDecimals = typeof item.decimals === "number" && item.decimals > 0;
  const normalized = hasDecimals ? value.toFixed(item.decimals) : Math.round(value).toString();
  return `${item.prefix ?? ""}${normalized}${item.suffix ?? ""}`;
}

function AnimatedStat({ item, index }: { item: StatItem; index: number }): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-25% 0px" });
  const [value, setValue] = useState(item.start ?? 0);

  useEffect(() => {
    if (!isInView) {
      return;
    }

    const controls = animate(item.start ?? 0, item.end, {
      duration: 1.25,
      delay: index * 0.08,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setValue(latest)
    });

    return () => controls.stop();
  }, [index, isInView, item.end, item.start]);

  return (
    <motion.article
      ref={ref}
      variants={reveal}
      className="rounded-3xl border border-border bg-surface/75 p-6 text-center backdrop-blur-sm"
    >
      <p className="font-mono text-[34px] font-bold leading-none tracking-tight text-accent md:text-[42px]">
        {formatStatValue(item, value)}
      </p>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-2">
        {item.label}
      </p>
    </motion.article>
  );
}

export default function LandingPage(): JSX.Element {
  const { scrollY } = useScroll();
  const auraOffset = useTransform(scrollY, [0, 700], [0, 68]);

  return (
    <div className="relative min-h-screen bg-bg">
      <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-border bg-bg/80 px-6 py-4 backdrop-blur-md md:px-12">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <span className="text-sm font-bold text-accent">P</span>
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
          </div>
          <span className="text-lg font-bold text-text">
            puls<span className="text-accent">e</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="hover:bg-accent/5 hover:text-accent">
              Connexion
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="shadow-glow-sm hover:shadow-glow-accent">
              Commencer
              <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </nav>

      <section className="relative isolate flex min-h-[92vh] items-center overflow-hidden px-6 pb-16 pt-28 text-center md:pb-20">
        <motion.div
          style={{ y: auraOffset }}
          className="pointer-events-none absolute -left-12 top-10 h-[280px] w-[280px] rounded-full bg-accent/15 blur-[80px]"
        />
        <motion.div
          style={{ y: auraOffset }}
          className="pointer-events-none absolute -right-16 top-24 h-[340px] w-[340px] rounded-full bg-ga/15 blur-[95px]"
        />
        <InteractiveParticles
          className="opacity-95"
          density={7800}
          minSize={1.2}
          maxSize={3.8}
          alphaMin={0.34}
          alphaMax={0.94}
        />

        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="relative z-10 mx-auto w-full max-w-5xl"
        >
          <motion.div
            variants={reveal}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent"
          >
            <Sparkles size={12} />
            SaaS Analytics Product-Led
          </motion.div>

          <motion.h1
            variants={reveal}
            className="mx-auto max-w-4xl text-4xl font-extrabold leading-[0.95] tracking-[-0.03em] text-text sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Comprends ton audience.
            <span className="mt-2 block bg-gradient-to-r from-accent via-amber-200 to-accent bg-clip-text text-transparent">
              Amplifie ta croissance.
            </span>
          </motion.h1>

          <motion.p variants={reveal} className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-text-2 md:text-lg">
            Unifie YouTube et GA4 dans une interface construite pour la prise de décision, pas pour la déco.
            Des insights clairs, des corrélations utiles, et un pilotage concret de la performance.
          </motion.p>

          <motion.div variants={reveal} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="h-14 min-w-[258px] px-8 text-[15px] shadow-glow-accent">
                Commencer gratuitement
                <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="ghost" size="lg" className="h-14 min-w-[160px] px-6 text-[15px]">
                Voir le produit
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 border-y border-border bg-surface/60 py-14 backdrop-blur-sm">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={container}
          className="mx-auto grid max-w-6xl gap-4 px-6 md:grid-cols-4"
        >
          {stats.map((stat, index) => (
            <AnimatedStat key={stat.label} item={stat} index={index} />
          ))}
        </motion.div>
      </section>

      <section id="features" className="relative z-10 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Plateforme unifiée</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text md:text-5xl">Tout ce dont tu as besoin</h2>
            <p className="mt-5 text-base leading-relaxed text-text-2 md:text-lg">Une architecture pensée produit: chaque module répond à une décision concrète.</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={container}
            className="mt-14 grid auto-rows-[minmax(150px,auto)] gap-4 sm:grid-cols-2 xl:grid-cols-12"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const indicatorWidth = 46 + (index % 4) * 12;

              return (
                <motion.article
                  key={feature.title}
                  variants={reveal}
                  className={`${feature.bento} group relative overflow-hidden rounded-3xl border border-border bg-surface/75 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-surface-hover hover:shadow-glow-sm md:p-6`}
                >
                  <div className="pointer-events-none absolute -right-5 -top-6 h-16 w-16 rounded-full bg-accent/15 blur-2xl" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                          {feature.eyebrow}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold leading-tight text-text md:text-xl">{feature.title}</h3>
                      </div>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-2 text-accent transition-colors duration-300 group-hover:border-accent/30">
                        <Icon size={18} />
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-text-2">{feature.description}</p>

                    <div className="mt-4 rounded-xl border border-border bg-surface-2/70 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Signal</p>
                      <p className="mt-1 text-xs text-text">{feature.signal}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-border">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${indicatorWidth}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, delay: 0.08 * index }}
                          className="h-full rounded-full bg-accent"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {feature.outcomes.map((outcome) => (
                        <span
                          key={outcome}
                          className="rounded-full border border-border bg-surface-2/75 px-2.5 py-1 text-[11px] text-text-2"
                        >
                          {outcome}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 pb-28 pt-8">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[2.2rem] border border-border bg-surface/70 backdrop-blur-xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,var(--accent-muted),transparent_45%),radial-gradient(circle_at_90%_80%,rgba(52,211,153,0.1),transparent_42%)]" />
            <div className="relative grid md:grid-cols-[1.618fr_1fr]">
              <div className="px-7 py-10 md:px-12 md:py-14">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-accent">Passage en action</p>
                <h2 className="mt-3 max-w-[18ch] text-3xl font-bold leading-tight text-text md:text-5xl">
                  Prêt à booster ta <span className="text-accent">croissance</span> ?
                </h2>
                <p className="mt-5 max-w-[48ch] text-sm leading-relaxed text-text-2 md:text-base">
                  Connecte ton compte en quelques minutes, lance la première synchro, puis pilote YouTube et GA4 dans
                  une seule logique produit.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-4 text-xs text-text-2">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-ga" />
                    Setup guidé
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-ga" />
                    Connexion OAuth sécurisée
                  </span>
                </div>
              </div>

              <div className="border-t border-border px-7 py-10 md:border-l md:border-t-0 md:px-10 md:py-14">
                <p className="text-sm text-text-2">Commence maintenant et visualise tes premiers signaux en temps réel.</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row md:flex-col">
                  <Link href="/login" className="sm:basis-[61.8%] md:basis-auto">
                    <Button size="lg" className="h-14 w-full text-[15px] shadow-glow-accent">
                      Démarrer maintenant
                      <ArrowRight size={18} />
                    </Button>
                  </Link>
                  <Link href="#features" className="sm:basis-[38.2%] md:basis-auto">
                    <Button variant="ghost" size="lg" className="h-14 w-full text-[15px]">
                      Explorer les modules
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="relative flex h-6 w-6 items-center justify-center rounded bg-accent/10">
              <span className="text-[10px] font-bold text-accent">P</span>
            </div>
            <span className="text-sm font-semibold text-text">
              puls<span className="text-accent">e</span>
            </span>
          </div>
          <p className="text-sm text-text-muted">© {new Date().getFullYear()} Pulse Analytics. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
