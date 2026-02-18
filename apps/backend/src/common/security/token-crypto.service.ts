import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface EncryptedPayload {
  v: 1;
  iv: string;
  ciphertext: string;
  tag: string;
}

@Injectable()
export class TokenCryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(plainText: string): EncryptedPayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.getKey(), iv);

    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      v: 1,
      iv: iv.toString("base64"),
      ciphertext: encrypted.toString("base64"),
      tag: tag.toString("base64")
    };
  }

  decrypt(payload: unknown): string {
    if (!this.isEncryptedPayload(payload)) {
      throw new InternalServerErrorException("Invalid encrypted token payload format.");
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.getKey(),
      Buffer.from(payload.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64")),
      decipher.final()
    ]);

    return decrypted.toString("utf8");
  }

  private getKey(): Buffer {
    const explicitSecret = this.configService.get<string>("GOOGLE_TOKENS_ENCRYPTION_SECRET");
    const fallbackSecret = this.configService.get<string>("JWT_SECRET");
    const secret = explicitSecret || fallbackSecret;

    if (!secret) {
      throw new InternalServerErrorException("No encryption secret configured.");
    }

    return createHash("sha256").update(secret).digest();
  }

  private isEncryptedPayload(payload: unknown): payload is EncryptedPayload {
    if (typeof payload !== "object" || payload === null) {
      return false;
    }

    const candidate = payload as Record<string, unknown>;
    return (
      candidate.v === 1 &&
      typeof candidate.iv === "string" &&
      typeof candidate.ciphertext === "string" &&
      typeof candidate.tag === "string"
    );
  }
}
