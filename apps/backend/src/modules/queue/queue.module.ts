import { Module } from "@nestjs/common";
import { IngestionProcessor } from "~/modules/queue/processors/ingestion.processor";
import { QueueService } from "~/modules/queue/queue.service";

@Module({
  providers: [IngestionProcessor, QueueService],
  exports: [IngestionProcessor, QueueService]
})
export class QueueModule {}
