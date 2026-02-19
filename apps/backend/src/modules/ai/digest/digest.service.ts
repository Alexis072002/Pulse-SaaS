import { Injectable } from "@nestjs/common";
import { ReportType } from "@prisma/client";

@Injectable()
export class DigestService {
  async generateWeeklyDigest(): Promise<string> {
    return "Digest hebdomadaire local actif. Configure OpenAI plus tard si tu veux une version LLM.";
  }

  generateHeuristicDigest(input: {
    reportType: ReportType;
    youtubeViews: number;
    webSessions: number;
    pulseScore: number;
    youtubeDelta: number;
    sessionsDelta: number;
  }): string {
    const scope = input.reportType === ReportType.WEEKLY ? "hebdomadaire" : "mensuel";

    const youtubeTrend = input.youtubeDelta >= 0 ? "en hausse" : "en baisse";
    const webTrend = input.sessionsDelta >= 0 ? "en hausse" : "en baisse";

    const strongestChannel = Math.abs(input.youtubeDelta) >= Math.abs(input.sessionsDelta)
      ? "YouTube"
      : "le web";

    const action = input.youtubeDelta < 0 && input.sessionsDelta < 0
      ? "Priorise un contenu à forte rétention et relance la distribution sur les pages les plus performantes."
      : input.youtubeDelta < 0
        ? "Teste de nouveaux hooks vidéo et republie tes meilleurs formats."
        : input.sessionsDelta < 0
          ? "Optimise les pages d'atterrissage et les CTA sur les sources actives."
          : "Le momentum est positif, maintiens le rythme et capitalise sur les thèmes qui convertissent.";

    return [
      `Sur cette période ${scope}, YouTube est ${youtubeTrend} (${input.youtubeViews} vues) et le trafic web est ${webTrend} (${input.webSessions} sessions).`,
      `Le Pulse Score est à ${input.pulseScore}, avec un signal dominant sur ${strongestChannel}.`,
      action
    ].join(" ");
  }
}
