import { Injectable } from "@nestjs/common";

@Injectable()
export class DigestService {
  async generateWeeklyDigest(): Promise<string> {
    return "Digest hebdomadaire indisponible pour le moment. Brancher OpenAI pour activer cette fonctionnalité.";
  }
}
