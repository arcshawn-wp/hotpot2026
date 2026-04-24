import { eq, sql, and } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { hotspots, platformDiscussions, dailySnapshots, crawlLogs } from "@db/schema";
import type { WeatherData, PlatformCrawlData, DailySnapshotInput, CrawlResult } from "./types";

// ============================================================
// 热点关联与快照生成
// ============================================================

/** 获取当前日期的 YYYY-MM-DD */
export function getTodayStr(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

/** 根据当前日期获取节气（简化版，覆盖主要节气） */
export function getSolarTerm(dateStr: string): { name: string; nextName: string; daysToNext: number } {
  const terms: Array<{ month: number; day: number; name: string }> = [
    { month: 2, day: 3, name: "立春" },
    { month: 2, day: 18, name: "雨水" },
    { month: 3, day: 5, name: "惊蛰" },
    { month: 3, day: 20, name: "春分" },
    { month: 4, day: 4, name: "清明" },
    { month: 4, day: 19, name: "谷雨" },
    { month: 5, day: 5, name: "立夏" },
    { month: 5, day: 20, name: "小满" },
    { month: 6, day: 5, name: "芒种" },
    { month: 6, day: 21, name: "夏至" },
    { month: 7, day: 6, name: "小暑" },
    { month: 7, day: 22, name: "大暑" },
    { month: 8, day: 7, name: "立秋" },
    { month: 8, day: 22, name: "处暑" },
    { month: 9, day: 7, name: "白露" },
    { month: 9, day: 22, name: "秋分" },
    { month: 10, day: 8, name: "寒露" },
    { month: 10, day: 23, name: "霜降" },
    { month: 11, day: 7, name: "立冬" },
    { month: 11, day: 22, name: "小雪" },
    { month: 12, day: 6, name: "大雪" },
    { month: 12, day: 21, name: "冬至" },
    { month: 1, day: 5, name: "小寒" },
    { month: 1, day: 20, name: "大寒" },
  ];

  const [y, m, d] = dateStr.split("-").map(Number);
  const currentDayOfYear = m * 100 + d;

  let currentTerm = terms[terms.length - 1];
  let nextTerm = terms[0];

  for (let i = 0; i < terms.length; i++) {
    const termDay = terms[i].month * 100 + terms[i].day;
    if (termDay <= currentDayOfYear) {
      currentTerm = terms[i];
      nextTerm = terms[(i + 1) % terms.length];
    }
  }

  // 计算到下一个节气的天数（简化）
  const nextDate = new Date(y, nextTerm.month - 1, nextTerm.day);
  const currDate = new Date(y, m - 1, d);
  if (nextDate <= currDate) nextDate.setFullYear(y + 1);
  const daysToNext = Math.ceil((nextDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

  return { name: currentTerm.name, nextName: nextTerm.name, daysToNext };
}

/** 将爬虫关键词与数据库中的热点进行模糊匹配 */
function matchHotspot(
  platformData: PlatformCrawlData,
  dbHotspots: Array<{ hotspotId: string; title: string; dimension: string }>
): string | null {
  const keywords = platformData.topKeywords.slice(0, 20);
  for (const h of dbHotspots) {
    const title = h.title.toLowerCase();
    for (const kw of keywords) {
      if (kw && title.includes(kw.toLowerCase())) {
        return h.hotspotId;
      }
    }
  }
  // 如果没有匹配到，使用维度默认映射
  const dimensionMap: Record<string, string> = {
    weibo: "hotspot-002", // 默认关联到节假日/通用热点
    douyin: "hotspot-002",
    xiaohongshu: "hotspot-002",
  };
  return dimensionMap[platformData.platform] || null;
}

/** 保存平台讨论数据到数据库 */
export async function savePlatformData(
  platformData: PlatformCrawlData,
  hotspotId: string | null
) {
  const db = getDb();
  const effectiveHotspotId = hotspotId || `auto-${platformData.platform}-${Date.now()}`;

  // 先删除该平台今天的旧数据（可选：保留历史）
  // 这里采用更新策略：如果有同样 hotspotId + platform 的组合，删除旧数据插入新数据
  await db
    .delete(platformDiscussions)
    .where(
      and(
        eq(platformDiscussions.hotspotId, effectiveHotspotId),
        eq(platformDiscussions.platform, platformData.platform)
      )
    );

  await db.insert(platformDiscussions).values({
    hotspotId: effectiveHotspotId,
    platform: platformData.platform,
    platformName: platformData.platformName,
    postCount: platformData.postCount,
    readCount: platformData.readCount,
    sentiment: platformData.sentiment,
    hotPosts: platformData.hotPosts,
    topKeywords: platformData.topKeywords,
    crawledAt: new Date(),
  });
}

/** 生成每日快照 */
export async function generateDailySnapshot(
  weather: WeatherData,
  crawlResults: CrawlResult[]
) {
  const db = getDb();
  const today = getTodayStr();
  const solar = getSolarTerm(today);

  // 获取今天活跃的热点数量
  const activeHotspots = await db
    .select()
    .from(hotspots)
    .where(
      and(
        sql`${hotspots.startDate} <= ${today}`,
        sql`${hotspots.endDate} >= ${today}`
      )
    );

  const highPriority = activeHotspots.filter((h) => h.heatLevel >= 4);

  // 构建描述
  const platformSummary = crawlResults
    .filter((r) => r.status === "success")
    .map((r) => `${r.source}(${r.recordsCount}条)`)
    .join("、");

  const description = `${solar.name}节气${solar.daysToNext > 0 ? `，距${solar.nextName}还有${solar.daysToNext}天` : ""}；` +
    `今日${weather.condition}，${weather.tip}；` +
    `活跃热点${activeHotspots.length}个，高优先级${highPriority.length}个。` +
    (platformSummary ? `已采集：${platformSummary}。` : "");

  const snapshotInput = {
    date: today,
    totalHotspots: activeHotspots.length,
    highPriorityCount: highPriority.length,
    description,
    weatherCity: weather.city,
    weatherTemp: weather.temperature,
    weatherCondition: weather.condition,
    weatherHumidity: weather.humidity,
    weatherTip: weather.tip,
    solarTerm: solar.name,
    snapshot: {
      activeHotspotIds: activeHotspots.map((h) => h.hotspotId),
      crawlSummary: crawlResults,
      weatherIcon: weather.icon,
    } as Record<string, unknown>,
  };

  // 先删除今天的旧快照
  await db.delete(dailySnapshots).where(sql`DATE(${dailySnapshots.date}) = ${today}`);

  await db.insert(dailySnapshots).values(snapshotInput);

  return snapshotInput;
}

/** 保存采集日志 */
export async function saveCrawlLogs(results: CrawlResult[]) {
  const db = getDb();
  for (const r of results) {
    await db.insert(crawlLogs).values({
      source: r.source,
      status: r.status,
      recordsCount: r.recordsCount,
      errorMessage: r.errorMessage || null,
      crawledAt: new Date(),
    });
  }
}

/** 获取数据库中的热点用于匹配 */
export async function getHotspotsForMatching(dateStr: string) {
  const db = getDb();
  return db
    .select({ hotspotId: hotspots.hotspotId, title: hotspots.title, dimension: hotspots.dimension })
    .from(hotspots)
    .where(
      and(
        sql`${hotspots.startDate} <= ${dateStr}`,
        sql`${hotspots.endDate} >= ${dateStr}`
      )
    );
}
