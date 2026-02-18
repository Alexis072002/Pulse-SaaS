import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "~/modules/auth/auth.controller";
import { AuthService } from "~/modules/auth/auth.service";
import { GoogleStrategy } from "~/modules/auth/strategies/google.strategy";
import { JwtStrategy } from "~/modules/auth/strategies/jwt.strategy";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("app.jwtSecret"),
        signOptions: {
          expiresIn: configService.get<string>("app.jwtExpiration")
        }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [AuthService]
})
export class AuthModule {}
