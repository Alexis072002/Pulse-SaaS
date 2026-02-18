import { Controller, Get, Post } from "@nestjs/common";
import { Public } from "~/common/decorators/public.decorator";
import { AuthService } from "~/modules/auth/auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get("google")
  async getGoogleAuthUrl(): Promise<{ url: string }> {
    return this.authService.getGoogleAuthUrl();
  }

  @Public()
  @Get("google/callback")
  async googleCallback(): Promise<{ message: string }> {
    return { message: "OAuth callback endpoint placeholder" };
  }

  @Post("logout")
  async logout(): Promise<{ message: string }> {
    return { message: "Logout successful" };
  }

  @Public()
  @Post("refresh")
  async refresh(): Promise<{ message: string }> {
    return { message: "Refresh endpoint placeholder" };
  }
}
