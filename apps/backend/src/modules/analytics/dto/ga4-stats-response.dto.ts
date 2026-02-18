import { Expose } from "class-transformer";
import { Period } from "~/modules/analytics/dto/get-overview.dto";

export class Ga4SessionPointDto {
  @Expose()
  date!: string;

  @Expose()
  sessions!: number;
}

export class Ga4TrafficSourceDto {
  @Expose()
  source!: string;

  @Expose()
  medium!: string;

  @Expose()
  sessions!: number;
}

export class Ga4TopPageDto {
  @Expose()
  pagePath!: string;

  @Expose()
  sessions!: number;

  @Expose()
  pageViews!: number;

  @Expose()
  averageSessionDuration!: number;
}

export class Ga4CountryDto {
  @Expose()
  countryCode!: string;

  @Expose()
  country!: string;

  @Expose()
  sessions!: number;
}

export class Ga4StatsDto {
  @Expose()
  period!: Period;

  @Expose()
  gaPropertyId!: string;

  @Expose()
  sessions!: number;

  @Expose()
  sessionsDelta!: number;

  @Expose()
  newUsers!: number;

  @Expose()
  newUsersDelta!: number;

  @Expose()
  bounceRate!: number;

  @Expose()
  bounceRateDelta!: number;

  @Expose()
  averageSessionDuration!: number;

  @Expose()
  averageSessionDurationDelta!: number;

  @Expose()
  trafficSources!: Ga4TrafficSourceDto[];

  @Expose()
  topPages!: Ga4TopPageDto[];

  @Expose()
  countries!: Ga4CountryDto[];

  @Expose()
  sessionsSeries!: Ga4SessionPointDto[];

  @Expose()
  lastUpdatedAt!: Date;
}
