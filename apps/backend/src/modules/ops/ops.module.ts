import { Module } from "@nestjs/common";
import { OpsController } from "~/modules/ops/ops.controller";
import { OpsService } from "~/modules/ops/ops.service";
import { QueueModule } from "~/modules/queue/queue.module";
import { PrismaService } from "~/prisma/prisma.service";

@Module({
  imports: [QueueModule],
  controllers: [OpsController],
  providers: [OpsService, PrismaService]
})
export class OpsModule {}
