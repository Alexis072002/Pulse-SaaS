import { IsEnum } from "class-validator";

export enum Period {
  SEVEN_DAYS = "7d",
  THIRTY_DAYS = "30d",
  NINETY_DAYS = "90d"
}

export class GetOverviewDto {
  @IsEnum(Period)
  period!: Period;
}
