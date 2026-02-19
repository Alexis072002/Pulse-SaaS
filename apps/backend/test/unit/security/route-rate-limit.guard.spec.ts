import { HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RouteRateLimitGuard } from "~/common/guards/route-rate-limit.guard";

function buildContext(request: {
  method: string;
  route?: { path?: string };
  ip?: string;
  user?: { id?: string };
}): {
  getHandler: () => string;
  getClass: () => string;
  switchToHttp: () => { getRequest: () => typeof request };
} {
  return {
    getHandler: () => "handler",
    getClass: () => "class",
    switchToHttp: () => ({
      getRequest: () => request
    })
  };
}

describe("RouteRateLimitGuard", () => {
  it("should allow requests under the configured limit", () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => ({
        limit: 2,
        windowMs: 60_000
      }))
    } as unknown as Reflector;

    const guard = new RouteRateLimitGuard(reflector);
    const context = buildContext({
      method: "POST",
      route: { path: "/reports/generate" },
      ip: "127.0.0.1",
      user: { id: "user-1" }
    });

    expect(guard.canActivate(context as never)).toBe(true);
    expect(guard.canActivate(context as never)).toBe(true);
  });

  it("should block requests over the configured limit", () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => ({
        limit: 1,
        windowMs: 60_000
      }))
    } as unknown as Reflector;

    const guard = new RouteRateLimitGuard(reflector);
    const context = buildContext({
      method: "POST",
      route: { path: "/reports/generate" },
      ip: "127.0.0.1",
      user: { id: "user-1" }
    });

    expect(guard.canActivate(context as never)).toBe(true);
    expect(() => guard.canActivate(context as never)).toThrow(HttpException);
  });
});
