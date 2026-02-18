import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class IngestionProcessor {
  private readonly logger = new Logger(IngestionProcessor.name);

  async handle(userId: string): Promise<void> {
    this.logger.log(`Ingestion demandée pour ${userId}`);
  }
}
