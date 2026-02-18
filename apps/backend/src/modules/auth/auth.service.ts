import { Injectable } from "@nestjs/common";

@Injectable()
export class AuthService {
  async getGoogleAuthUrl(): Promise<{ url: string }> {
    return {
      url: "/auth/google/callback"
    };
  }
}
