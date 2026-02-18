import { Expose } from "class-transformer";
import { Period } from "~/modules/analytics/dto/get-overview.dto";

export class CorrelationPointDto {
  @Expose()
  date!: string;

  @Expose()
  youtubeViews!: number;

  @Expose()
  webSessions!: number;

  @Expose()
  youtubeNormalized!: number;

  @Expose()
  webSessionsNormalized!: number;
}

export class CorrelationEventDto {
  @Expose()
  date!: string;

  @Expose()
  label!: string;

  @Expose()
  type!: string;
}

export class CorrelationDto {
  @Expose()
  period!: Period;

  @Expose()
  score!: number;

  @Expose()
  lagDays!: number;

  @Expose()
  laggedScore!: number;

  @Expose()
  insight!: string;

  @Expose()
  points!: CorrelationPointDto[];

  @Expose()
  events!: CorrelationEventDto[];

  @Expose()
  lastUpdatedAt!: Date;
}
