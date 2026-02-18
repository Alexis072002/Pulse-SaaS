import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();

export const appRouter = t.router({
  health: t.procedure.query(() => ({ status: "ok" })),
  analyticsOverview: t.procedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d"])
      })
    )
    .query(({ input }) => ({
      period: input.period,
      message: "Route tRPC initialisée"
    }))
});

export type AppRouter = typeof appRouter;
