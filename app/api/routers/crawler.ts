import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { triggerManualCrawl, startCrawlerScheduler } from "../crawler/scheduler";
import { runFullCrawl } from "../crawler/index";
import { getDb } from "../queries/connection";
import { crawlLogs, dailySnapshots, platformDiscussions } from "@db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const crawlerRouter = createRouter({
  /** 手动触发一次全量采集 */
  run: publicQuery.mutation(async () => {
    try {
      const result = await triggerManualCrawl();
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }),

  /** 获取最近7天的采集日志 */
  logs: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(crawlLogs)
      .orderBy(desc(crawlLogs.crawledAt))
      .limit(50);
  }),

  /** 获取今日采集状态 */
  todayStatus: publicQuery.query(async () => {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    const [snapshot] = await db
      .select()
      .from(dailySnapshots)
      .where(sql`DATE(${dailySnapshots.date}) = ${today}`);

    const logsToday = await db
      .select()
      .from(crawlLogs)
      .where(sql`DATE(${crawlLogs.crawledAt}) = ${today}`)
      .orderBy(desc(crawlLogs.crawledAt));

    const platformsToday = await db
      .select()
      .from(platformDiscussions)
      .where(sql`DATE(${platformDiscussions.crawledAt}) = ${today}`);

    return {
      snapshot,
      logs: logsToday,
      platforms: platformsToday,
    };
  }),
});
