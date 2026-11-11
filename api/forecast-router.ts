import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { savedCalculations } from "@db/schema";
import { authedQuery, createRouter, publicQuery } from "./middleware";
import { calculateForecast, getForecastMeta } from "./forecast-service";
import { getDb } from "./queries/connection";

const forecastInput = z.object({
  route: z.string().regex(/^MOW-(AER|LED|KGD|OVB|MRV)$/),
  date: z.string().regex(/^2026-(06|07)-\d{2}$/),
  price: z.number().int().positive().max(100_000),
});

export const forecastRouter = createRouter({
  meta: publicQuery.query(() => getForecastMeta()),
  calculate: publicQuery.input(forecastInput).query(({ input }) => {
    return calculateForecast(input.route, input.date, input.price);
  }),
  save: authedQuery.input(forecastInput).mutation(async ({ ctx, input }) => {
    const result = calculateForecast(input.route, input.date, input.price);
    await getDb().insert(savedCalculations).values({
      userId: ctx.user.id,
      route: input.route,
      routeName: result.route.name,
      flightDate: input.date,
      price: input.price,
      seats: result.seats,
      desiredDemand: result.desiredDemand,
      sales: result.sales,
    });
    return { success: true };
  }),
  history: authedQuery.query(async ({ ctx }) => {
    return getDb()
      .select()
      .from(savedCalculations)
      .where(eq(savedCalculations.userId, ctx.user.id))
      .orderBy(desc(savedCalculations.createdAt))
      .limit(12);
  }),
});
