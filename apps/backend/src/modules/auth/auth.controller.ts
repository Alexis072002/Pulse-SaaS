import { Controller, Get, Post, Query, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { CurrentUser } from "~/common/decorators/current-user.decorator";
import { Public } from "~/common/decorators/public.decorator";
import { AuthService } from "~/modules/auth/auth.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Public()
  @Get("google")
  async googleRedirect(
    @Res() response: Response,
    @Query("gaPropertyId") gaPropertyId?: string
  ): Promise<void> {
    const url = this.authService.getGoogleAuthUrl(gaPropertyId);
    response.redirect(url);
  }

  @Public()
  @Get("google/callback")
  async googleCallback(
    @Res() response: Response,
    @Query("code") code?: string,
    @Query("state") state?: string
  ): Promise<void> {
    try {
      const { jwt } = await this.authService.handleGoogleCallback(code, state);

      response.cookie("pulse_access_token", jwt, {
        httpOnly: true,
        secure: this.configService.get<string>("NODE_ENV") === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/"
      });

      const frontendUrl = this.configService.get<string>("app.frontendUrl") ?? "http://localhost:3000";
      response.redirect(`${frontendUrl}/overview`);
    } catch {
      const frontendUrl = this.configService.get<string>("app.frontendUrl") ?? "http://localhost:3000";
      response.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }

  @Post("logout")
  async logout(
    @CurrentUser() user: { id: string } | undefined,
    @Res({ passthrough: true }) response: Response
  ): Promise<{ message: string }> {
    if (user?.id) {
      await this.authService.clearSession(user.id);
    }

    response.clearCookie("pulse_access_token", {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });

    return { message: "Logout successful" };
  }
}
