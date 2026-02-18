import { ReportType } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class CreateReportDto {
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;
}
