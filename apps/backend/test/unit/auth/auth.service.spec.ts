import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "~/prisma/prisma.service";
import { TokenCryptoService } from "~/common/security/token-crypto.service";
import { AuditService } from "~/modules/audit/audit.service";
import { AuthService } from "~/modules/auth/auth.service";
import { WorkspaceService } from "~/modules/workspace/workspace.service";

interface StoredUser {
  id: string;
  email: string;
  gaPropertyId: string | null;
  googleTokens: unknown;
}

describe("AuthService", () => {
  const configValues: Record<string, string> = {
    GOOGLE_CLIENT_ID: "google-client-id",
    GOOGLE_CLIENT_SECRET: "google-client-secret",
    GOOGLE_CALLBACK_URL: "http://localhost:3001/auth/google/callback",
    GOOGLE_GA4_PROPERTY_ID: "123456789"
  };

  const configService = {
    get: jest.fn((key: string) => configValues[key])
  } as unknown as ConfigService;

  const jwtService = {
    sign: jest.fn(() => "signed-jwt")
  } as unknown as JwtService;

  const tokenCryptoService = {
    encrypt: jest.fn((plainText: string) => ({
      v: 1,
      iv: "iv",
      tag: "tag",
      ciphertext: Buffer.from(plainText, "utf8").toString("base64")
    })),
    decrypt: jest.fn((payload: unknown) => {
      const record = payload as { ciphertext: string };
      return Buffer.from(record.ciphertext, "base64").toString("utf8");
    })
  } as unknown as TokenCryptoService;

  const workspaceService = {
    ensureDefaultWorkspace: jest.fn(async () => ({
      workspaceId: "workspace-1",
      workspaceName: "Workspace 1",
      role: "OWNER"
    })),
    getActiveWorkspaceContext: jest.fn(async () => ({
      workspaceId: "workspace-1",
      workspaceName: "Workspace 1",
      role: "OWNER"
    }))
  } as unknown as WorkspaceService;

  const auditService = {
    logUserAction: jest.fn(async () => undefined)
  } as unknown as AuditService;

  let store: Map<string, StoredUser>;
  let prismaService: PrismaService;
  let service: AuthService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new Map<string, StoredUser>();

    prismaService = {
      user: {
        findUnique: jest.fn(async (args: { where: { id: string } }) => store.get(args.where.id) ?? null),
        upsert: jest.fn(
          async (args: {
            where: { id: string };
            create: { id: string; email: string; gaPropertyId: string | null; googleTokens: unknown };
            update: { email?: string; gaPropertyId?: string | undefined; googleTokens: unknown };
          }) => {
            const existing = store.get(args.where.id);

            const next: StoredUser = existing
              ? {
                  ...existing,
                  email: args.update.email ?? existing.email,
                  gaPropertyId:
                    args.update.gaPropertyId === undefined
                      ? existing.gaPropertyId
                      : (args.update.gaPropertyId ?? null),
                  googleTokens: args.update.googleTokens
                }
              : {
                  id: args.create.id,
                  email: args.create.email,
                  gaPropertyId: args.create.gaPropertyId,
                  googleTokens: args.create.googleTokens
                };

            store.set(args.where.id, next);
            return next;
          }
        ),
        updateMany: jest.fn(async (args: { where: { id: string }; data: { googleTokens: unknown } }) => {
          const user = store.get(args.where.id);
          if (!user) {
            return { count: 0 };
          }

          store.set(args.where.id, {
            ...user,
            googleTokens: null
          });

          return { count: 1 };
        })
      }
    } as unknown as PrismaService;

    service = new AuthService(
      configService,
      jwtService,
      prismaService,
      tokenCryptoService,
      workspaceService,
      auditService
    );
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should generate a Google OAuth URL with required scopes and state", () => {
    const url = service.getGoogleAuthUrl("987654321");
    const parsed = new URL(url);

    expect(parsed.origin).toBe("https://accounts.google.com");
    expect(parsed.pathname).toBe("/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe("google-client-id");

    const scope = parsed.searchParams.get("scope") ?? "";
    expect(scope).toContain("https://www.googleapis.com/auth/yt-analytics.readonly");
    expect(scope).toContain("https://www.googleapis.com/auth/analytics.readonly");

    const state = parsed.searchParams.get("state");
    expect(state).toBeTruthy();

    const decoded = JSON.parse(Buffer.from(state ?? "", "base64url").toString("utf8")) as {
      gaPropertyId: string;
      nonce: string;
    };

    expect(decoded.gaPropertyId).toBe("987654321");
    expect(decoded.nonce.length).toBeGreaterThan(10);
  });

  it("should exchange code, persist encrypted tokens and return jwt", async () => {
    const state = Buffer.from(
      JSON.stringify({ nonce: "abc", gaPropertyId: "999888777" }),
      "utf8"
    ).toString("base64url");

    global.fetch = jest.fn(async (input: string | URL | Request) => {
      const url = input.toString();

      if (url.includes("oauth2.googleapis.com/token")) {
        return {
          ok: true,
          json: async () => ({
            access_token: "google-access-token",
            refresh_token: "google-refresh-token",
            expires_in: 3600,
            scope: "scope-a",
            token_type: "Bearer"
          })
        } as Response;
      }

      if (url.includes("www.googleapis.com/oauth2/v2/userinfo")) {
        return {
          ok: true,
          json: async () => ({
            id: "google-user-id",
            email: "alexis@example.com"
          })
        } as Response;
      }

      throw new Error(`Unexpected URL in fetch mock: ${url}`);
    }) as typeof global.fetch;

    const result = await service.handleGoogleCallback("oauth-code", state);

    expect(result.jwt).toBe("signed-jwt");
    expect(result.userId).toBe("google-user-id");
    expect(result.email).toBe("alexis@example.com");

    const session = await service.getSession("google-user-id");
    expect(session?.gaPropertyId).toBe("999888777");
    expect(session?.tokens.accessToken).toBe("google-access-token");
    expect(session?.tokens.refreshToken).toBe("google-refresh-token");

    expect(tokenCryptoService.encrypt).toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: "google-user-id",
      email: "alexis@example.com"
    });
  });

  it("should clear persisted session tokens", async () => {
    store.set("u-1", {
      id: "u-1",
      email: "u-1@example.com",
      gaPropertyId: "123",
      googleTokens: { v: 1, iv: "i", tag: "t", ciphertext: "YQ==" }
    });

    await service.clearSession("u-1");

    const clearedUser = store.get("u-1");
    expect(clearedUser?.googleTokens).toBeNull();
  });
});
