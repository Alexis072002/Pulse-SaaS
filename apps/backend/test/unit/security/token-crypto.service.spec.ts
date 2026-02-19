import { ConfigService } from "@nestjs/config";
import { TokenCryptoService } from "~/common/security/token-crypto.service";

describe("TokenCryptoService", () => {
  it("should encrypt with the active keyed secret", () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === "GOOGLE_TOKENS_ENCRYPTION_SECRETS") {
          return "k2:new-secret-material-1234567890,k1:old-secret-material-1234567890";
        }
        if (key === "GOOGLE_TOKENS_ENCRYPTION_SECRET") {
          return "";
        }
        if (key === "JWT_SECRET") {
          return "jwt-fallback-secret-1234567890";
        }
        return undefined;
      })
    } as unknown as ConfigService;

    const service = new TokenCryptoService(configService);
    const encrypted = service.encrypt("hello");
    const decrypted = service.decrypt(encrypted);

    expect(encrypted.kid).toBe("k2");
    expect(decrypted).toBe("hello");
  });

  it("should decrypt payload encrypted with a previous key in the ring", () => {
    const oldConfig = {
      get: jest.fn((key: string) => {
        if (key === "GOOGLE_TOKENS_ENCRYPTION_SECRETS") {
          return "k1:old-secret-material-1234567890";
        }
        if (key === "GOOGLE_TOKENS_ENCRYPTION_SECRET") {
          return "";
        }
        if (key === "JWT_SECRET") {
          return "jwt-fallback-secret-1234567890";
        }
        return undefined;
      })
    } as unknown as ConfigService;

    const rotatedConfig = {
      get: jest.fn((key: string) => {
        if (key === "GOOGLE_TOKENS_ENCRYPTION_SECRETS") {
          return "k2:new-secret-material-1234567890,k1:old-secret-material-1234567890";
        }
        if (key === "GOOGLE_TOKENS_ENCRYPTION_SECRET") {
          return "";
        }
        if (key === "JWT_SECRET") {
          return "jwt-fallback-secret-1234567890";
        }
        return undefined;
      })
    } as unknown as ConfigService;

    const oldService = new TokenCryptoService(oldConfig);
    const rotatedService = new TokenCryptoService(rotatedConfig);

    const encryptedWithOld = oldService.encrypt("payload-v1");
    const decrypted = rotatedService.decrypt(encryptedWithOld);

    expect(decrypted).toBe("payload-v1");
  });
});
