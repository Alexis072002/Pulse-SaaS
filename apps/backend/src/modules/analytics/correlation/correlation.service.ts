import { Injectable } from "@nestjs/common";

interface TimeSeriesPoint {
  youtubeViews: number;
  webSessions: number;
}

@Injectable()
export class CorrelationService {
  compute(points: TimeSeriesPoint[]): number {
    if (points.length < 2) {
      return 0;
    }

    const youtubeValues = points.map((point) => point.youtubeViews);
    const webValues = points.map((point) => point.webSessions);

    const youtubeMean = this.mean(youtubeValues);
    const webMean = this.mean(webValues);

    let numerator = 0;
    let youtubeDenominator = 0;
    let webDenominator = 0;

    for (let index = 0; index < points.length; index += 1) {
      const ytCentered = youtubeValues[index] - youtubeMean;
      const webCentered = webValues[index] - webMean;

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

  private mean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
