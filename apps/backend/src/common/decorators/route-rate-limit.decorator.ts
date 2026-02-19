import { SetMetadata } from "@nestjs/common";

export interface RouteRateLimitOptions {
  limit: number;
  windowMs: number;
}

export const ROUTE_RATE_LIMIT_KEY = "route_rate_limit";
export const RouteRateLimit = (options: RouteRateLimitOptions): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROUTE_RATE_LIMIT_KEY, options);
