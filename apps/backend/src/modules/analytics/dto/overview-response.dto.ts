import { Expose } from "class-transformer";

export class TimeSeriesPointDto {
  @Expose()
  date!: string;

  @Expose()
  youtubeViews!: number;

  @Expose()
  webSessions!: number;
}

export class OverviewDto {
  @Expose()
  youtubeViews!: number;

  @Expose()
  youtubeViewsDelta!: number;

  @Expose()
  subscribersGained!: number;

  @Expose()
  webSessions!: number;

  @Expose()
  webSessionsDelta!: number;

  @Expose()
  pulseScore!: number;

  @Expose()
  pulseScoreDelta!: number;

  @Expose()
  timeSeries!: TimeSeriesPointDto[];

  @Expose()
  lastUpdatedAt!: Date;
}
