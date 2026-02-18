import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@pulse/shared";

export const trpc = createTRPCReact<AppRouter>();
