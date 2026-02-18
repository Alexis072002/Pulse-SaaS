import { Module } from "@nestjs/common";
import { DigestService } from "~/modules/ai/digest/digest.service";

@Module({
  providers: [DigestService],
  exports: [DigestService]
})
export class AiModule {}
