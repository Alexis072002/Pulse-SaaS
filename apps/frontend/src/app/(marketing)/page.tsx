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
  Shield,
  Sparkles,
  Zap,
  type LucideIcon
} from "lucide-react";
import { InteractiveSignalMesh } from "@/components/marketing/InteractiveSignalMesh";
import { Button } from "@/components/ui/Button";

interface FeatureItem {
  icon: LucideIcon;
  day: string;
  title: string;
  context: string;
  insight: string;
  decision: string;
  impact: string;
  tags: string[];
}

interface StatItem {
  label: string;
  end: number;
  start?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

interface JourneyStep {
  title: string;
  description: string;
}

interface TrustPillar {
  icon: LucideIcon;
  title: string;
  description: string;
  proof: string;
}

const features: FeatureItem[] = [
  {
    icon: Globe2,
    day: "Jour 1",
    title: "Tu connectes tes sources",
    context: "Connexion OAuth Google et choix de la propriété GA4 en quelques minutes.",
    insight: "Pulse consolide YouTube + GA4 dans une base de lecture unique.",
    decision: "Tu identifies immédiatement les indicateurs utiles au lieu de naviguer entre outils.",
    impact: "Setup terminé, cockpit prêt à l’usage dès la première session.",
    tags: ["OAuth sécurisé", "YouTube", "GA4"]
  },
  {
    icon: BarChart3,
    day: "Jour 3",
    title: "Tu lis les signaux qui comptent",
    context: "Les dashboards font ressortir la performance contenu + trafic sans bruit visuel.",
    insight: "Les corrélations montrent l’impact d’une vidéo sur les sessions web avec délai estimé.",
    decision: "Tu ajustes format, timing de publication et canaux d’acquisition sur des faits.",
    impact: "Des arbitrages rapides et argumentés, pas des intuitions.",
    tags: ["KPIs unifiés", "Corrélations IA", "Top vidéos/pages"]
  },
  {
    icon: BrainCircuit,
    day: "Jour 7",
    title: "Tu industrialises ton pilotage",
    context: "Rapports PDF, historique et workflows d’équipe centralisés dans Pulse.",
    insight: "Tu partages une lecture commune avec ton équipe ou tes clients.",
    decision: "Tu priorises les actions à plus fort levier pour la semaine suivante.",
    impact: "Un rythme de croissance plus fiable, basé sur des boucles courtes.",
    tags: ["Rapports PDF", "Historique", "Pilotage hebdo"]
  }
];

const stats: StatItem[] = [
  { end: 10, suffix: "K+", label: "Métriques analysées" },
  { end: 99.9, suffix: "%", decimals: 1, label: "Uptime garanti" },
  { start: 4, end: 1, prefix: "<", suffix: "s", label: "Temps de chargement" },
  { end: 256, suffix: "-bit", label: "Chiffrement" }
];

const journeySteps: JourneyStep[] = [
  {
    title: "Connecte Google en 2 minutes",
    description: "OAuth sécurisé pour lier YouTube et GA4 sans manipulation complexe."
  },
  {
    title: "Pulse synchronise et consolide",
    description: "Les données sont normalisées dans un seul cockpit lisible."
  },
  {
    title: "Tu prends des décisions actionnables",
    description: "KPIs, corrélations et rapports PDF pour exécuter, pas juste observer."
  }
];

const trustPillars: TrustPillar[] = [
  {
    icon: Shield,
    title: "Accès sécurisé par défaut",
    description: "Connexion OAuth Google, session contrôlée et révocation rapide.",
    proof: "Scopes explicites et minimisés"
  },
  {
    icon: BrainCircuit,
    title: "Données exploitables, pas du bruit",
    description: "Des vues construites pour la décision produit, sans vanity metrics.",
    proof: "KPIs orientés action"
  },
  {
    icon: Zap,
    title: "Workflow orienté exécution",
    description: "Rapports, historiques et relances pour garder ton rythme d’itération.",
    proof: "Automatisation intégrée"
  }
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
        <InteractiveSignalMesh className="opacity-[0.82]" />

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

      <section id="features" className="relative z-10 py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-start gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
            <motion.aside
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="lg:sticky lg:top-28"
            >
              <div className="rounded-3xl border border-border bg-surface/75 p-7 backdrop-blur-sm md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                  Transformation en 7 jours
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-text md:text-[2.7rem]">
                  Tout ce dont tu as besoin pour passer de la data a la decision
                </h2>
                <p className="mt-5 text-base leading-relaxed text-text-2">
                  Pulse ne te montre pas juste des graphiques. Il structure une progression claire: connecter, comprendre,
                  executer.
                </p>

                <div className="mt-8 space-y-3">
                  {features.map((step, index) => (
                    <div key={step.day} className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 font-mono text-xs font-semibold text-accent">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm font-medium text-text">
                        {step.day}: {step.title}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link href="/login">
                    <Button size="lg" className="h-14 w-full text-[15px] shadow-glow-accent">
                      Commencer gratuitement
                      <ArrowRight size={18} />
                    </Button>
                  </Link>
                  <Link href="/overview">
                    <Button variant="ghost" size="lg" className="h-14 w-full text-[15px]">
                      Voir le dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.aside>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={container}
              className="relative"
            >
              <div className="pointer-events-none absolute left-5 top-8 hidden h-[calc(100%-4rem)] w-px bg-border lg:block" />
              <div className="space-y-6">
                {features.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <motion.article
                      key={feature.day}
                      variants={reveal}
                      className="group relative overflow-hidden rounded-3xl border border-border bg-surface/75 p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:bg-surface-hover hover:shadow-glow-sm md:p-8"
                    >
                      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/15 blur-3xl" />
                      <span className="absolute left-[18px] top-10 hidden h-3 w-3 rounded-full bg-accent ring-4 ring-accent/20 lg:block" />

                      <div className="relative lg:pl-8">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{feature.day}</p>
                            <h3 className="mt-3 text-2xl font-semibold leading-tight text-text">{feature.title}</h3>
                          </div>
                          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-2 text-accent">
                            <Icon size={20} />
                          </span>
                        </div>

                        <p className="mt-4 text-[15px] leading-relaxed text-text-2">{feature.context}</p>

                        <div className="mt-6 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-border bg-surface-2/70 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Insight obtenu</p>
                            <p className="mt-2 text-sm leading-relaxed text-text">{feature.insight}</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-surface-2/70 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Decision prise</p>
                            <p className="mt-2 text-sm leading-relaxed text-text">{feature.decision}</p>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">Resultat attendu</p>
                          <p className="mt-2 text-sm leading-relaxed text-text">{feature.impact}</p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {feature.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-border bg-surface-2/75 px-2.5 py-1 text-[11px] text-text-2"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-8">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Avant / apres</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text md:text-5xl">
              Ce qui change avec Pulse
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={container}
            className="mt-12 grid items-stretch gap-5 lg:grid-cols-[1fr_88px_1fr]"
          >
            <motion.article
              variants={reveal}
              className="rounded-3xl border border-border bg-surface/70 p-7 backdrop-blur-sm md:p-8"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Sans Pulse</p>
              <h3 className="mt-3 text-2xl font-semibold text-text">Tu jongles entre outils</h3>
              <p className="mt-4 text-sm leading-relaxed text-text-2">
                Les donnees existent, mais elles sont fragmentees. Le temps part en collecte au lieu d&apos;aller dans
                l&apos;action.
              </p>
              <div className="mt-6 space-y-3">
                <p className="text-sm text-text-2">- Visibilite partielle sur la performance reelle</p>
                <p className="text-sm text-text-2">- Difficultes a relier publication et impact business</p>
                <p className="text-sm text-text-2">- Decisions retardees faute de synthese claire</p>
              </div>
            </motion.article>

            <motion.div variants={reveal} className="hidden items-center justify-center lg:flex">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                <ArrowRight size={26} />
              </div>
            </motion.div>

            <motion.article
              variants={reveal}
              className="rounded-3xl border border-border bg-surface/70 p-7 backdrop-blur-sm md:p-8"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">Avec Pulse</p>
              <h3 className="mt-3 text-2xl font-semibold text-text">Tu pilotes en continu</h3>
              <p className="mt-4 text-sm leading-relaxed text-text-2">
                YouTube et GA4 dans un seul dashboard. Tu vois, tu comprends, puis tu executes.
              </p>
              <div className="mt-6 space-y-3">
                <p className="inline-flex items-start gap-2 text-sm text-text">
                  <CheckCircle2 size={15} className="mt-[1px] shrink-0 text-accent" />
                  <span>Lecture immediate des KPIs qui comptent</span>
                </p>
                <p className="inline-flex items-start gap-2 text-sm text-text">
                  <CheckCircle2 size={15} className="mt-[1px] shrink-0 text-accent" />
                  <span>Corrélations claires entre contenu et trafic</span>
                </p>
                <p className="inline-flex items-start gap-2 text-sm text-text">
                  <CheckCircle2 size={15} className="mt-[1px] shrink-0 text-accent" />
                  <span>Rapports prêts à partager avec ton équipe</span>
                </p>
              </div>
            </motion.article>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Onboarding</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text md:text-5xl">Comment ca marche</h2>
            <p className="mt-5 text-base leading-relaxed text-text-2 md:text-lg">
              Trois etapes pour passer de la connexion a une vue decisionnelle complete.
            </p>
          </motion.div>

          <motion.ol
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={container}
            className="mt-14 grid gap-6 md:grid-cols-3"
          >
            {journeySteps.map((step, index) => (
              <motion.li
                key={step.title}
                variants={reveal}
                className="rounded-3xl border border-border bg-surface/70 p-7 backdrop-blur-sm md:p-8"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 font-mono text-sm font-semibold text-accent">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-text">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-2">{step.description}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      <section className="relative z-10 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Reassurance</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text md:text-5xl">
              Pourquoi tu peux faire confiance a Pulse
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={container}
            className="mt-12 grid gap-5 md:grid-cols-3"
          >
            {trustPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <motion.article
                  key={pillar.title}
                  variants={reveal}
                  className="rounded-3xl border border-border bg-surface/70 p-7 backdrop-blur-sm md:p-8"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface-2 text-accent">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-text">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-2">{pillar.description}</p>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                    {pillar.proof}
                  </p>
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
