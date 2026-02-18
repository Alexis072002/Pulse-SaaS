import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { PrismaService } from "~/prisma/prisma.service";
import { TokenCryptoService } from "~/common/security/token-crypto.service";

export interface GoogleTokenSet {
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  tokenType?: string;
  expiresAt: number;
}

export interface UserSession {
  userId: string;
  email: string;
  gaPropertyId?: string;
  tokens: GoogleTokenSet;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
}

interface OAuthStatePayload {
  nonce: string;
  gaPropertyId?: string;
  rememberMe?: boolean;
}

@Injectable()
export class AuthService {
  private readonly googleScopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/analytics.readonly"
  ] as const;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly tokenCryptoService: TokenCryptoService
  ) {}

  getGoogleAuthUrl(gaPropertyId?: string, rememberMe = false): string {
    const normalizedGaPropertyId = this.normalizeGaPropertyId(gaPropertyId);
    const state = this.encodeState({
      nonce: randomUUID(),
      gaPropertyId: normalizedGaPropertyId || this.normalizeGaPropertyId(this.configService.get<string>("GOOGLE_GA4_PROPERTY_ID")),
      rememberMe
    });

    const params = new URLSearchParams({
      client_id: this.getRequiredEnv("GOOGLE_CLIENT_ID"),
      redirect_uri: this.getRequiredEnv("GOOGLE_CALLBACK_URL"),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: this.googleScopes.join(" "),
      state
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(
    code: string | undefined,
    state: string | undefined
  ): Promise<{ jwt: string; userId: string; email: string; rememberMe: boolean }> {
    if (!code) {
      throw new BadRequestException("Missing OAuth code.");
    }

    const statePayload = this.decodeState(state);
    const tokenResponse = await this.exchangeCodeForTokens(code);
    const profile = await this.getGoogleUserInfo(tokenResponse.access_token);

    const existingSession = await this.getSession(profile.id);

    const tokens: GoogleTokenSet = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? existingSession?.tokens.refreshToken,
      scope: tokenResponse.scope,
      tokenType: tokenResponse.token_type,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000 - 30_000
    };

    const session: UserSession = {
      userId: profile.id,
      email: profile.email,
      gaPropertyId: this.normalizeGaPropertyId(statePayload?.gaPropertyId) || existingSession?.gaPropertyId,
      tokens
    };

    await this.persistSession(session);

    const jwt = this.jwtService.sign({
      sub: profile.id,
      email: profile.email
    });

    return {
      jwt,
      userId: profile.id,
      email: profile.email,
      rememberMe: statePayload?.rememberMe === true
    };
  }

  async getSession(userId: string): Promise<UserSession | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId }
    });

    if (!user?.googleTokens) {
      return null;
    }

    const decrypted = this.tokenCryptoService.decrypt(user.googleTokens);
    const tokens = this.parseStoredTokenSet(decrypted);

    return {
      userId: user.id,
      email: user.email,
      gaPropertyId: user.gaPropertyId ?? undefined,
      tokens
    };
  }

  async clearSession(userId: string): Promise<void> {
    await this.prismaService.user.updateMany({
      where: { id: userId },
      data: {
        googleTokens: Prisma.DbNull
      }
    });
  }

  async setGaPropertyId(userId: string, gaPropertyId: string): Promise<void> {
    const normalizedGaPropertyId = this.normalizeGaPropertyId(gaPropertyId);
    if (!normalizedGaPropertyId) {
      throw new BadRequestException("Invalid GA4 property id.");
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        gaPropertyId: normalizedGaPropertyId
      }
    });
  }

  async getValidGoogleAccessToken(userId: string): Promise<string> {
    const session = await this.getSession(userId);
    if (!session) {
      throw new UnauthorizedException("No Google session found. Please login again.");
    }

    if (Date.now() < session.tokens.expiresAt) {
      return session.tokens.accessToken;
    }

    const refreshed = await this.refreshGoogleAccessToken(userId);
    return refreshed.accessToken;
  }

  async refreshGoogleAccessToken(userId: string): Promise<GoogleTokenSet> {
    const session = await this.getSession(userId);
    if (!session?.tokens.refreshToken) {
      throw new UnauthorizedException("Google refresh token missing. Please reconnect your Google account.");
    }

    const params = new URLSearchParams({
      client_id: this.getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: this.getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: session.tokens.refreshToken
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new UnauthorizedException("Unable to refresh Google access token.");
    }

    const tokenResponse = (await response.json()) as GoogleTokenResponse;

    const updatedTokens: GoogleTokenSet = {
      accessToken: tokenResponse.access_token,
      refreshToken: session.tokens.refreshToken,
      scope: tokenResponse.scope ?? session.tokens.scope,
      tokenType: tokenResponse.token_type ?? session.tokens.tokenType,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000 - 30_000
    };

    await this.persistSession({
      ...session,
      tokens: updatedTokens
    });

    return updatedTokens;
  }

  private async persistSession(session: UserSession): Promise<void> {
    const encryptedPayload = this.tokenCryptoService.encrypt(JSON.stringify(session.tokens));
    const storedTokens: Prisma.InputJsonValue = {
      v: encryptedPayload.v,
      iv: encryptedPayload.iv,
      tag: encryptedPayload.tag,
      ciphertext: encryptedPayload.ciphertext
    };

    await this.prismaService.user.upsert({
      where: {
        id: session.userId
      },
      create: {
        id: session.userId,
        email: session.email,
        gaPropertyId: session.gaPropertyId ?? null,
        googleTokens: storedTokens
      },
      update: {
        email: session.email,
        gaPropertyId: session.gaPropertyId ?? undefined,
        googleTokens: storedTokens
      }
    });
  }

  private parseStoredTokenSet(raw: string): GoogleTokenSet {
    const parsed = JSON.parse(raw) as Partial<GoogleTokenSet>;

    if (!parsed.accessToken || typeof parsed.expiresAt !== "number") {
      throw new InternalServerErrorException("Stored Google token payload is invalid.");
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      scope: parsed.scope,
      tokenType: parsed.tokenType,
      expiresAt: parsed.expiresAt
    };
  }

  private async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const params = new URLSearchParams({
      code,
      client_id: this.getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: this.getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: this.getRequiredEnv("GOOGLE_CALLBACK_URL"),
      grant_type: "authorization_code"
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new UnauthorizedException("Google OAuth token exchange failed.");
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new UnauthorizedException("Unable to fetch Google user profile.");
    }

    const profile = (await response.json()) as GoogleUserInfo;

    if (!profile.id || !profile.email) {
      throw new InternalServerErrorException("Invalid Google profile payload.");
    }

    return profile;
  }

  private encodeState(payload: OAuthStatePayload): string {
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  }

  private decodeState(rawState: string | undefined): OAuthStatePayload | undefined {
    if (!rawState) {
      return undefined;
    }

    try {
      return JSON.parse(Buffer.from(rawState, "base64url").toString("utf8")) as OAuthStatePayload;
    } catch {
      throw new BadRequestException("Invalid OAuth state.");
    }
  }

  private normalizeGaPropertyId(gaPropertyId: string | undefined): string | undefined {
    if (!gaPropertyId) {
      return undefined;
    }

    const trimmed = gaPropertyId.trim();
    if (!trimmed) {
      return undefined;
    }

    const unprefixed = trimmed.startsWith("properties/") ? trimmed.slice("properties/".length) : trimmed;
    if (!/^\d+$/.test(unprefixed)) {
      return undefined;
    }

    return unprefixed;
  }

  private getRequiredEnv(name: string): string {
    const value = this.configService.get<string>(name);
    if (!value) {
      throw new InternalServerErrorException(`Missing required environment variable: ${name}`);
    }
    return value;
  }
}
