import { ReportStatus, ReportType } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class ListReportsDto {
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
