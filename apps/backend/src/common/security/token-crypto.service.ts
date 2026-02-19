import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface EncryptedPayload {
  v: 1;
  kid?: string;
  iv: string;
  ciphertext: string;
  tag: string;
}

interface SecretKeyRecord {
  kid: string;
  rawSecret: string;
  key: Buffer;
}

@Injectable()
export class TokenCryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(plainText: string): EncryptedPayload {
    const iv = randomBytes(12);
    const activeKey = this.getActiveKey();
    const cipher = createCipheriv("aes-256-gcm", activeKey.key, iv);

    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      v: 1,
      kid: activeKey.kid,
      iv: iv.toString("base64"),
      ciphertext: encrypted.toString("base64"),
      tag: tag.toString("base64")
    };
  }

  decrypt(payload: unknown): string {
    if (!this.isEncryptedPayload(payload)) {
      throw new InternalServerErrorException("Invalid encrypted token payload format.");
    }

    const keys = this.getKeyRing();
    const preferredKeys = payload.kid
      ? this.sortKeysByKid(keys, payload.kid)
      : keys;

    for (const entry of preferredKeys) {
      try {
        const decipher = createDecipheriv("aes-256-gcm", entry.key, Buffer.from(payload.iv, "base64"));
        decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

        const decrypted = Buffer.concat([
          decipher.update(Buffer.from(payload.ciphertext, "base64")),
          decipher.final()
        ]);

        return decrypted.toString("utf8");
      } catch {
        // Try next key for rotation compatibility.
      }
    }

    throw new InternalServerErrorException("Unable to decrypt token payload with active key ring.");
  }

  getActiveKeyMetadata(): { kid: string; rawSecret: string } {
    const active = this.getActiveKey();
    return {
      kid: active.kid,
      rawSecret: active.rawSecret
    };
  }

  private getActiveKey(): SecretKeyRecord {
    const ring = this.getKeyRing();
    const active = ring[0];
    if (!active) {
      throw new InternalServerErrorException("No encryption secret configured.");
    }
    return active;
  }

  private getKeyRing(): SecretKeyRecord[] {
    const keyedSecretList = this.configService.get<string>("GOOGLE_TOKENS_ENCRYPTION_SECRETS");
    const legacySecret = this.configService.get<string>("GOOGLE_TOKENS_ENCRYPTION_SECRET");
    const fallbackSecret = this.configService.get<string>("JWT_SECRET");

    const entries: SecretKeyRecord[] = [];

    if (keyedSecretList && keyedSecretList.trim().length > 0) {
      const items = keyedSecretList.split(",").map((item) => item.trim()).filter(Boolean);
      for (const item of items) {
        const separatorIndex = item.indexOf(":");
        if (separatorIndex <= 0 || separatorIndex >= item.length - 1) {
          continue;
        }

        const kid = item.slice(0, separatorIndex).trim();
        const secret = item.slice(separatorIndex + 1).trim();
        if (!kid || !secret) {
          continue;
        }

        entries.push({
          kid,
          rawSecret: secret,
          key: createHash("sha256").update(secret).digest()
        });
      }
    }

    if (entries.length === 0) {
      const secret = legacySecret || fallbackSecret;
      if (!secret) {
        throw new InternalServerErrorException("No encryption secret configured.");
      }

      entries.push({
        kid: "legacy",
        rawSecret: secret,
        key: createHash("sha256").update(secret).digest()
      });
    }

    return entries;
  }

  private sortKeysByKid(keys: SecretKeyRecord[], kid: string): SecretKeyRecord[] {
    const preferred = keys.find((entry) => entry.kid === kid);
    if (!preferred) {
      return keys;
    }
    return [preferred, ...keys.filter((entry) => entry.kid !== kid)];
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
