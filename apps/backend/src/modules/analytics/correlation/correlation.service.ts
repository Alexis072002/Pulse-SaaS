import { Injectable } from "@nestjs/common";

interface TimeSeriesPoint {
  youtubeViews: number;
  webSessions: number;
}

interface LagCorrelationResult {
  lagDays: number;
  score: number;
}

@Injectable()
export class CorrelationService {
  compute(points: TimeSeriesPoint[]): number {
    return this.computeForLag(points, 0);
  }

  computeForLag(points: TimeSeriesPoint[], lagDays: number): number {
    if (points.length < 2) {
      return 0;
    }

    const youtubeValues: number[] = [];
    const webValues: number[] = [];

    for (const [index, point] of points.entries()) {
      const webIndex = index + lagDays;
      const shifted = points[webIndex];
      if (!shifted) {
        continue;
      }

      youtubeValues.push(point.youtubeViews);
      webValues.push(shifted.webSessions);
    }

    if (youtubeValues.length < 2 || webValues.length < 2) {
      return 0;
    }

    const youtubeMean = this.mean(youtubeValues);
    const webMean = this.mean(webValues);

    let numerator = 0;
    let youtubeDenominator = 0;
    let webDenominator = 0;

    for (const [index, youtubeValue] of youtubeValues.entries()) {
      const webValue = webValues[index] ?? 0;
      const ytCentered = youtubeValue - youtubeMean;
      const webCentered = webValue - webMean;

      numerator += ytCentered * webCentered;
      youtubeDenominator += ytCentered ** 2;
      webDenominator += webCentered ** 2;
    }

    const denominator = Math.sqrt(youtubeDenominator * webDenominator);
    if (denominator === 0) {
      return 0;
    }

    return Number((numerator / denominator).toFixed(3));
  }

  findBestLag(points: TimeSeriesPoint[], maxLagDays = 7): LagCorrelationResult {
    const initialScore = this.compute(points);
    let best: LagCorrelationResult = {
      lagDays: 0,
      score: initialScore
    };

    for (let lagDays = -maxLagDays; lagDays <= maxLagDays; lagDays += 1) {
      const score = this.computeForLag(points, lagDays);
      const absScore = Math.abs(score);
      const absBestScore = Math.abs(best.score);

      if (absScore > absBestScore) {
        best = { lagDays, score };
        continue;
      }

      if (absScore === absBestScore && Math.abs(lagDays) < Math.abs(best.lagDays)) {
        best = { lagDays, score };
      }
    }

    return {
      lagDays: best.lagDays,
      score: Number(best.score.toFixed(3))
    };
  }

  buildInsight(score: number, lagDays: number): string {
    const absolute = Math.abs(score);

    if (absolute < 0.2) {
      return "Corrélation faible sur la période: les signaux YouTube et Web évoluent de manière peu liée.";
    }

    if (score > 0) {
      if (lagDays > 0) {
        return `Les pics YouTube semblent précéder le trafic Web d'environ ${lagDays} jour(s).`;
      }
      if (lagDays < 0) {
        return `Le trafic Web semble précéder les pics YouTube d'environ ${Math.abs(lagDays)} jour(s).`;
      }
      return "Corrélation positive directe: la traction YouTube et les sessions Web évoluent ensemble.";
    }

    if (lagDays !== 0) {
      return `Corrélation inverse avec décalage (~${Math.abs(lagDays)} jour(s)): quand l'un monte, l'autre tend à baisser.`;
    }

    return "Corrélation inverse: les variations YouTube et Web évoluent en sens opposé.";
  }

  private mean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
