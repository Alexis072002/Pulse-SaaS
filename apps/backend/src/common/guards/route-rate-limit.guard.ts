import { CanActivate, ExecutionContext, HttpException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROUTE_RATE_LIMIT_KEY, type RouteRateLimitOptions } from "~/common/decorators/route-rate-limit.decorator";

interface CounterState {
  count: number;
  windowStart: number;
  lastSeen: number;
}

@Injectable()
export class RouteRateLimitGuard implements CanActivate {
  private readonly counters = new Map<string, CounterState>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RouteRateLimitOptions | undefined>(
      ROUTE_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      method: string;
      route?: { path?: string };
      ip?: string;
      user?: { id?: string };
    }>();

    const now = Date.now();
    const routeId = request.route?.path ?? "unknown";
    const actorId = request.user?.id ?? request.ip ?? "anonymous";
    const key = `${actorId}:${request.method}:${routeId}`;
    const existing = this.counters.get(key);

    if (!existing || now - existing.windowStart >= options.windowMs) {
      this.counters.set(key, {
        count: 1,
        windowStart: now,
        lastSeen: now
      });
      this.cleanup(now, options.windowMs);
      return true;
    }

    if (existing.count >= options.limit) {
      throw new HttpException("Route rate limit exceeded.", 429);
    }

    existing.count += 1;
    existing.lastSeen = now;
    this.counters.set(key, existing);
    this.cleanup(now, options.windowMs);
    return true;
  }

  private cleanup(now: number, windowMs: number): void {
    if (this.counters.size < 2000) {
      return;
    }

    const cutoff = now - windowMs * 2;
    for (const [key, state] of this.counters.entries()) {
      if (state.lastSeen < cutoff) {
        this.counters.delete(key);
      }
    }
  }
}
