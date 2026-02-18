import { Module } from "@nestjs/common";
import { IngestionProcessor } from "~/modules/queue/processors/ingestion.processor";

@Module({
  providers: [IngestionProcessor],
  exports: [IngestionProcessor]
})
export class QueueModule {}
