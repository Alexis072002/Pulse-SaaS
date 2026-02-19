import { Module } from "@nestjs/common";
import { AuditService } from "~/modules/audit/audit.service";
import { PrismaService } from "~/prisma/prisma.service";

@Module({
  providers: [AuditService, PrismaService],
  exports: [AuditService]
})
export class AuditModule {}
