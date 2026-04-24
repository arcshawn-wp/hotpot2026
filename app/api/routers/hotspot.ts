import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { hotspots, platformDiscussions, dailySnapshots, products, hotspotProducts, scripts } from "@db/schema";
import { eq, sql, inArray } from "drizzle-orm";

// 热点数据适配：将数据库格式转换为前端期望的格式
function adaptHotspot(dbRecord: typeof hotspots.$inferSelect) {
  const trend = (dbRecord.trend as number[] | null) || [];
  return {
    id: dbRecord.hotspotId,
    dimension: dbRecord.dimension as 'weather' | 'solar_term' | 'holiday' | 'trend' | 'renovation',
    title: dbRecord.title,
    description: dbRecord.description || '',
    heatLevel: dbRecord.heatLevel as 1 | 2 | 3 | 4 | 5,
    heatScore: dbRecord.heatScore,
    dateRange: [dbRecord.startDate.toISOString().split('T')[0], dbRecord.endDate.toISOString().split('T')[0]] as [string, string],
    metricLabel: dbRecord.metricLabel || undefined,
    metricValue: dbRecord.metricValue || undefined,
    metricDirection: (dbRecord.metricDirection as 'up' | 'down' | undefined) || undefined,
    scriptTemplate: dbRecord.scriptTemplate || '',
    trend,
    relatedProducts: [] as any[], // 后续查询填充
  };
}

export const hotspotRouter = createRouter({
  /** 按日期查询活跃热点（含关联选品和话术） */
  listByDate: publicQuery
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = getDb();
      
      // 1. 查询活跃热点
      const results = await db
        .select()
        .from(hotspots)
        .where(
          sql`${hotspots.startDate} <= ${input.date} AND ${hotspots.endDate} >= ${input.date}`
        )
        .orderBy(sql`${hotspots.heatScore} DESC`);

      // 2. 为每个热点查询关联选品
      const hotspotIds = results.map(r => r.hotspotId);
      const links = hotspotIds.length > 0 
        ? await db.select().from(hotspotProducts).where(inArray(hotspotProducts.hotspotId, hotspotIds))
        : [];
      
      const productIds = [...new Set(links.map(l => l.productId))];
      const relatedProductsList = productIds.length > 0
        ? await db.select().from(products).where(inArray(products.productId, productIds))
        : [];

      // 3. 组装数据
      return results.map(h => {
        const hLinks = links.filter(l => l.hotspotId === h.hotspotId);
        const hProductIds = hLinks.map(l => l.productId);
        const hProducts = relatedProductsList.filter(p => hProductIds.includes(p.productId));
        
        const adapted = adaptHotspot(h);
        adapted.relatedProducts = hProducts.map(p => ({
          id: p.productId,
          name: p.name,
          image: p.image || '',
          heatScore: p.heatScore,
          reason: p.reason || '',
          dimension: p.dimension as any,
          script: p.script || undefined,
          sourceHotspot: p.sourceHotspot || undefined,
        }));
        return adapted;
      });
    }),

  /** 获取单个热点详情 + 平台讨论 */
  detail: publicQuery
    .input(z.object({ hotspotId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [hotspot] = await db
        .select()
        .from(hotspots)
        .where(eq(hotspots.hotspotId, input.hotspotId));

      if (!hotspot) return null;

      const discussions = await db
        .select()
        .from(platformDiscussions)
        .where(eq(platformDiscussions.hotspotId, input.hotspotId));

      // 查询关联选品
      const links = await db
        .select()
        .from(hotspotProducts)
        .where(eq(hotspotProducts.hotspotId, input.hotspotId));
      
      const productIds = links.map(l => l.productId);
      const relatedProductsList = productIds.length > 0
        ? await db.select().from(products).where(inArray(products.productId, productIds))
        : [];

      // 查询关联话术
      const relatedScripts = await db
        .select()
        .from(scripts)
        .where(eq(scripts.hotspotId, input.hotspotId));

      return {
        ...adaptHotspot(hotspot),
        relatedProducts: relatedProductsList.map(p => ({
          id: p.productId,
          name: p.name,
          image: p.image || '',
          heatScore: p.heatScore,
          reason: p.reason || '',
          dimension: p.dimension as any,
          script: p.script || undefined,
          sourceHotspot: p.sourceHotspot || undefined,
        })),
        discussions: discussions.map((d) => ({
          platform: d.platform as 'weibo' | 'xiaohongshu' | 'douyin',
          platformName: d.platformName,
          postCount: d.postCount,
          readCount: d.readCount,
          sentiment: d.sentiment as 'positive' | 'neutral' | 'negative' | 'mixed',
          hotPosts: (d.hotPosts as string[] | null) || [],
          topKeywords: (d.topKeywords as string[] | null) || [],
        })),
        scripts: relatedScripts.map(s => ({
          id: s.scriptId,
          title: s.title,
          content: s.content,
          dimension: s.dimension as any,
          heatLevel: s.heatLevel as 1 | 2 | 3 | 4 | 5,
          usageCount: s.usageCount,
          hotspotId: s.hotspotId || '',
          hotspotName: s.hotspotName || undefined,
        })),
      };
    }),

  /** 获取每日快照 */
  snapshot: publicQuery
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = getDb();
      const [result] = await db
        .select()
        .from(dailySnapshots)
        .where(sql`${dailySnapshots.date} = ${input.date}`);
      
      if (!result) return null;
      
      return {
        date: result.date.toISOString().split('T')[0],
        totalHotspots: result.totalHotspots,
        highPriorityCount: result.highPriorityCount,
        description: result.description || '',
        weather: {
          city: result.weatherCity || '杭州市',
          temperature: result.weatherTemp || 22,
          condition: result.weatherCondition || '多云转阴',
          humidity: result.weatherHumidity || 78,
          tip: result.weatherTip || '',
          icon: 'cloudy' as const,
        },
        solarTerm: result.solarTerm || '',
      };
    }),

  /** 获取维度总览（根据日期动态计算） */
  dimensions: publicQuery
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input }) => {
      const db = getDb();
      const active = await db
        .select()
        .from(hotspots)
        .where(
          sql`${hotspots.startDate} <= ${input.date} AND ${hotspots.endDate} >= ${input.date}`
        );

      const dims = ["weather", "solar_term", "holiday", "trend", "renovation"] as const;
      const dimLabels: Record<string, string> = {
        weather: '天气驱动',
        solar_term: '节气驱动',
        holiday: '节假日',
        trend: '热梗趋势',
        renovation: '家装节奏',
      };

      return dims.map((dim) => {
        const h = active.filter((a) => a.dimension === dim);
        const maxHeat = h.length > 0 ? Math.max(...h.map((x) => x.heatScore)) : 0;
        const top = h.length > 0
          ? h.reduce((a, b) => (a.heatScore >= b.heatScore ? a : b))
          : null;
        return {
          dimension: dim,
          label: dimLabels[dim],
          currentHotspot: top?.title || "暂无热点",
          heatScore: maxHeat,
          heatLevel: maxHeat >= 85 ? 5 : maxHeat >= 65 ? 4 : maxHeat >= 45 ? 3 : maxHeat >= 25 ? 2 : 1,
          count: h.length,
        };
      });
    }),

  /** 获取趋势风向标数据 */
  trend: publicQuery
    .input(z.object({ hotspotId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [hotspot] = await db
        .select()
        .from(hotspots)
        .where(eq(hotspots.hotspotId, input.hotspotId));

      if (!hotspot) return null;

      const trend = (hotspot.trend as number[] | null) || [];
      const vsLastWeek = trend.length >= 2
        ? `${trend[trend.length - 1] > trend[0] ? '+' : ''}${(((trend[trend.length - 1] - trend[0]) / (trend[0] || 1)) * 100).toFixed(0)}%`
        : "+0%";

      return {
        direction: trend.length >= 2 && trend[trend.length - 1] > trend[0] ? "up" : trend.length >= 2 && trend[trend.length - 1] < trend[0] ? "down" : "stable",
        vsLastWeek,
        vsLastMonth: "+45%",
        vsLastYear: "+28%",
        forecast: "持续升温，预计未来7天达到峰值",
        trend,
      };
    }),
});
