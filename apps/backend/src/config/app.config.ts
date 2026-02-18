import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3001),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiration: process.env.JWT_EXPIRATION ?? "15m",
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? "7d",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini"
}));
