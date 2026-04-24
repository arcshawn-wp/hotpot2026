import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { scripts } from "@db/schema";
import { eq, sql, and } from "drizzle-orm";

export const scriptRouter = createRouter({
  /** 按日期获取活跃话术（关联活跃热点） */
  listByDate: publicQuery
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = getDb();
      const { hotspots } = await import("@db/schema");

      const activeHotspots = await db
        .select({ hotspotId: hotspots.hotspotId })
        .from(hotspots)
        .where(
          and(
            sql`${hotspots.startDate} <= ${input.date}`,
            sql`${hotspots.endDate} >= ${input.date}`
          )
        );

      const hotspotIds = activeHotspots.map((h) => h.hotspotId);
      if (hotspotIds.length === 0) return [];

      const results = await db
        .select()
        .from(scripts)
        .where(eq(scripts.hotspotId, hotspotIds[0]));

      return results;
    }),

  /** 按热点获取话术 */
  byHotspot: publicQuery
    .input(z.object({ hotspotId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const results = await db
        .select()
        .from(scripts)
        .where(eq(scripts.hotspotId, input.hotspotId));
      return results;
    }),

  /** 获取所有话术 */
  list: publicQuery.query(async () => {
    const db = getDb();
    const results = await db.select().from(scripts).orderBy(scripts.usageCount);
    return results.reverse();
  }),
});
