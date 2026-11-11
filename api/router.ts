import { authRouter } from "./auth-router";
import { forecastRouter } from "./forecast-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  forecast: forecastRouter,
});

export type AppRouter = typeof appRouter;
