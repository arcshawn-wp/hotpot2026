import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { products, hotspotProducts } from "@db/schema";
import { eq, inArray } from "drizzle-orm";

export const productRouter = createRouter({
  /** 获取与活跃热点关联的选品 */
  listByDate: publicQuery
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = getDb();
      // 先获取活跃热点ID
      const { hotspots } = await import("@db/schema");
      const { sql, and } = await import("drizzle-orm");

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

      // 获取关联的选品ID
      const links = await db
        .select()
        .from(hotspotProducts)
        .where(inArray(hotspotProducts.hotspotId, hotspotIds));

      const productIds = [...new Set(links.map((l) => l.productId))];
      if (productIds.length === 0) return [];

      // 获取选品详情
      const results = await db
        .select()
        .from(products)
        .where(inArray(products.productId, productIds))
        .orderBy(products.heatScore);

      return results.reverse(); // 热度高的在前
    }),

  /** 获取所有选品（支持筛选） */
  list: publicQuery
    .input(
      z.object({
        dimension: z.string().optional(),
        category: z.string().optional(),
        minHeat: z.number().min(0).max(100).optional(),
      }).optional()
    )
    .query(async () => {
      const db = getDb();
      let query = db.select().from(products).orderBy(products.heatScore);
      const results = await query;
      return results.reverse();
    }),

  /** 按热点获取关联选品 */
  byHotspot: publicQuery
    .input(z.object({ hotspotId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const links = await db
        .select()
        .from(hotspotProducts)
        .where(eq(hotspotProducts.hotspotId, input.hotspotId));

      const productIds = links.map((l) => l.productId);
      if (productIds.length === 0) return [];

      const results = await db
        .select()
        .from(products)
        .where(inArray(products.productId, productIds));

      return results;
    }),
});
