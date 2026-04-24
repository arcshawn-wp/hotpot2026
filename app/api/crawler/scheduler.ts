import type { ScheduledTask } from "node-cron";
import { runFullCrawl } from "./index";

// ============================================================
// 定时任务调度器
// 使用动态导入兼容 node-cron v4（named exports）
// ============================================================

let scheduledTask: ScheduledTask | null = null;

/** 启动定时采集任务 */
export async function startCrawlerScheduler() {
  if (scheduledTask) {
    console.log("[Scheduler] Crawler already scheduled, skipping.");
    return;
  }

  // 动态导入 node-cron（兼容 v4 named exports）
  const { schedule } = await import("node-cron");

  // 每天 06:00 执行一次全量采集
  scheduledTask = schedule(
    "0 6 * * *",
    async () => {
      console.log("[Scheduler] Daily crawl triggered at", new Date().toISOString());
      try {
        await runFullCrawl();
      } catch (err: any) {
        console.error("[Scheduler] Daily crawl failed:", err.message || err);
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Shanghai",
    }
  );

  console.log("[Scheduler] Daily crawler scheduled for 06:00 Asia/Shanghai");
}

/** 停止定时任务 */
export function stopCrawlerScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log("[Scheduler] Crawler stopped.");
  }
}

/** 立即触发一次采集（用于手动执行） */
export async function triggerManualCrawl() {
  console.log("[Scheduler] Manual crawl triggered");
  return runFullCrawl();
}
