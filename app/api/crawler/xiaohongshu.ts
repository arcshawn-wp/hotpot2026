import type { PlatformCrawlData, CrawlResult, HotSearchItem } from "./types";
import { fetchWithTimeout } from "./lib";

// ============================================================
// 小红书热点采集 — Cookie 登录态 + 反封号保护
//
// 策略要点：
// 1. 通过环境变量 XHS_COOKIE 注入登录态
// 2. 每 2 天才真正执行一次爬取（其余天跳过）
// 3. 单次爬取上限 12 个请求，间隔 15-30 秒
// 4. 任何风控信号立即终止，保护账号
// ============================================================

// ---- 配置 ----
const XHS_CRAWL_INTERVAL_DAYS = 2;     // 最小爬取间隔（天）
const XHS_MAX_REQUESTS_PER_SESSION = 12; // 单次最大请求数
const XHS_MIN_DELAY_MS = 15000;         // 请求最小间隔 15s
const XHS_MAX_DELAY_MS = 30000;         // 请求最大间隔 30s
const XHS_BATCH_PAUSE_AFTER = 5;        // 每 5 个请求后长暂停
const XHS_BATCH_PAUSE_MIN_MS = 60000;   // 批次暂停最小 60s
const XHS_BATCH_PAUSE_MAX_MS = 150000;  // 批次暂停最大 150s
const XHS_MAX_HOT_TOPICS = 8;           // 只取 Top8

// ---- 上次爬取时间跟踪（进程内存 + 文件持久化） ----
let lastSuccessfulCrawlAt = 0;
const LAST_CRAWL_FILE = "/tmp/xhs-last-crawl.txt";

async function loadLastCrawlTime(): Promise<number> {
  if (lastSuccessfulCrawlAt > 0) return lastSuccessfulCrawlAt;
  try {
    const { readFile } = await import("fs/promises");
    const ts = await readFile(LAST_CRAWL_FILE, "utf-8");
    lastSuccessfulCrawlAt = parseInt(ts.trim(), 10) || 0;
  } catch {
    lastSuccessfulCrawlAt = 0;
  }
  return lastSuccessfulCrawlAt;
}

async function saveLastCrawlTime(): Promise<void> {
  lastSuccessfulCrawlAt = Date.now();
  try {
    const { writeFile } = await import("fs/promises");
    await writeFile(LAST_CRAWL_FILE, String(lastSuccessfulCrawlAt), "utf-8");
  } catch {
    // 写入失败不影响主流程
  }
}

// ---- 工具函数 ----

/** 随机延迟（高斯抖动模拟人类行为） */
function randomDelay(minMs: number, maxMs: number): number {
  // Box-Muller 高斯随机，集中在中间值
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const gaussian = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const normalized = Math.max(-1, Math.min(1, gaussian / 2));
  const mid = (minMs + maxMs) / 2;
  const range = (maxMs - minMs) / 2;
  return Math.round(mid + normalized * range);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 获取 Cookie 并构建请求头 */
function getXhsHeaders(): Record<string, string> | null {
  const cookie = process.env.XHS_COOKIE;
  if (!cookie) return null;

  return {
    accept: "application/json",
    "accept-language": "zh-CN,zh;q=0.9",
    "content-type": "application/json;charset=UTF-8",
    origin: "https://www.xiaohongshu.com",
    referer: "https://www.xiaohongshu.com/explore",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    cookie,
  };
}

/** 检测响应中的风控信号，返回 true 表示检测到风控 */
function detectRisk(status: number, body: string): { isRisk: boolean; signal: string } {
  if (status === 401 || status === 403) {
    return { isRisk: true, signal: `HTTP ${status} — Cookie 可能失效或账号受限` };
  }
  if (status === 429) {
    return { isRisk: true, signal: "HTTP 429 — 请求频率过高" };
  }
  const lower = body.toLowerCase();
  if (lower.includes("验证") || lower.includes("captcha") || lower.includes("verify")) {
    return { isRisk: true, signal: "触发验证码" };
  }
  if (lower.includes("频繁") || lower.includes("too many") || lower.includes("rate limit")) {
    return { isRisk: true, signal: "频率限制" };
  }
  if (lower.includes("账号") && (lower.includes("限制") || lower.includes("封") || lower.includes("lock"))) {
    return { isRisk: true, signal: "账号受限" };
  }
  return { isRisk: false, signal: "" };
}

// ---- API 请求（带 Cookie） ----

/** 获取小红书热搜列表 */
async function fetchHotListWithCookie(headers: Record<string, string>): Promise<HotSearchItem[]> {
  // 尝试两个 endpoint
  const endpoints = [
    "https://edith.xiaohongshu.com/api/sns/web/v1/search/hot_list",
    "https://www.xiaohongshu.com/api/sns/web/v1/search/trending",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetchWithTimeout(url, { headers, timeout: 15000 });
      const text = await res.text();

      // 风控检测
      const risk = detectRisk(res.status, text);
      if (risk.isRisk) {
        console.log(`[XHS] 热搜接口风控信号: ${risk.signal} (${url})`);
        return []; // 返回空，外层会处理
      }

      if (!res.ok) continue;

      const json = JSON.parse(text);
      const items = json?.data?.items || json?.data?.queries || json?.data?.list || [];

      const parsed: HotSearchItem[] = items
        .slice(0, 30)
        .map((item: any, idx: number) => ({
          rank: item.rank || idx + 1,
          title: (item.title || item.query || item.name || item.word || "").trim(),
          heat: item.hot_value || item.score || item.view_count || 0,
          tag: item.tag || "",
        }))
        .filter((i: HotSearchItem) => i.title);

      if (parsed.length > 0) {
        console.log(`[XHS] 热搜获取成功: ${parsed.length} 条 (${url})`);
        return parsed;
      }
    } catch (err: any) {
      console.log(`[XHS] 热搜接口异常: ${err.message} (${url})`);
    }
  }

  return [];
}

/** 搜索笔记 */
async function searchNotesWithCookie(
  headers: Record<string, string>,
  keyword: string
): Promise<HotSearchItem[]> {
  try {
    const res = await fetchWithTimeout(
      "https://edith.xiaohongshu.com/api/sns/web/v1/search/notes",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          keyword,
          page: 1,
          page_size: 20,
          search_id: Math.random().toString(36).slice(2, 18),
          sort: "general",
          note_type: 0,
        }),
        timeout: 15000,
      }
    );

    const text = await res.text();

    // 风控检测
    const risk = detectRisk(res.status, text);
    if (risk.isRisk) {
      console.log(`[XHS] 搜索风控信号: ${risk.signal} (关键词: ${keyword})`);
      throw new Error(`RISK: ${risk.signal}`);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = JSON.parse(text);
    const items = json?.data?.items || json?.data?.notes || [];

    return items.slice(0, 5).map((item: any, idx: number) => {
      const note = item.note_card || item.note || item;
      return {
        rank: idx + 1,
        title: note.display_title || note.title || keyword,
        heat: note.interact_info?.liked_count || note.likes || 0,
        url: note.note_id
          ? `https://www.xiaohongshu.com/explore/${note.note_id}`
          : "",
        tag: note.user?.nickname || "",
      };
    });
  } catch (err: any) {
    if (err.message.startsWith("RISK:")) throw err; // 风控错误向上传播
    console.log(`[XHS] 搜索失败(${keyword}): ${err.message}`);
    return [];
  }
}

// ---- 主入口 ----

export async function crawlXiaohongshu(): Promise<{
  data: PlatformCrawlData;
  items: HotSearchItem[];
  result: CrawlResult;
}> {
  // ====== 1. 检查是否配置了 Cookie ======
  const headers = getXhsHeaders();
  if (!headers) {
    console.log("[XHS] 未配置 XHS_COOKIE 环境变量，使用无登录态模式");
    return crawlWithoutCookie();
  }

  // ====== 2. 检查爬取间隔 ======
  const lastCrawl = await loadLastCrawlTime();
  const daysSinceLastCrawl = (Date.now() - lastCrawl) / (24 * 3600_000);

  if (lastCrawl > 0 && daysSinceLastCrawl < XHS_CRAWL_INTERVAL_DAYS) {
    console.log(
      `[XHS] 距上次爬取仅 ${daysSinceLastCrawl.toFixed(1)} 天，未满 ${XHS_CRAWL_INTERVAL_DAYS} 天间隔，跳过`
    );
    return {
      data: {
        platform: "xiaohongshu",
        platformName: "小红书",
        postCount: 0,
        readCount: 0,
        sentiment: "neutral",
        hotPosts: [`小红书每${XHS_CRAWL_INTERVAL_DAYS}天更新一次，下次更新预计在${Math.ceil(XHS_CRAWL_INTERVAL_DAYS - daysSinceLastCrawl)}天后`],
        topKeywords: [],
      },
      items: [],
      result: { source: "xiaohongshu", status: "success", recordsCount: 0 },
    };
  }

  // ====== 3. 检查活跃时段（北京时间 7:00-23:00） ======
  const chinaTime = new Date(Date.now() + 8 * 3600_000); // UTC+8
  const chinaHour = chinaTime.getUTCHours();
  if (chinaHour < 7 || chinaHour >= 23) {
    console.log(`[XHS] 当前北京时间 ${chinaHour} 点，非活跃时段(7-23)，跳过`);
    return {
      data: {
        platform: "xiaohongshu",
        platformName: "小红书",
        postCount: 0,
        readCount: 0,
        sentiment: "neutral",
        hotPosts: ["小红书爬取仅在北京时间 7:00-23:00 执行"],
        topKeywords: [],
      },
      items: [],
      result: { source: "xiaohongshu", status: "success", recordsCount: 0 },
    };
  }

  console.log("[XHS] ===== 开始 Cookie 模式爬取 =====");
  let requestCount = 0;
  let riskTriggered = false;

  try {
    // ====== 4. 预热等待（模拟打开 App 的加载时间） ======
    const warmupDelay = randomDelay(3000, 8000);
    console.log(`[XHS] 预热等待 ${Math.round(warmupDelay / 1000)}s...`);
    await sleep(warmupDelay);

    // ====== 5. 获取热搜列表 ======
    const hotItems = await fetchHotListWithCookie(headers);
    requestCount++;

    // 使用热搜关键词 或 兜底关键词
    let keywords: string[];
    if (hotItems.length > 0) {
      keywords = hotItems.slice(0, XHS_MAX_HOT_TOPICS).map((i) => i.title);
    } else {
      // 热搜获取失败，用通用关键词兜底
      keywords = ["直播带货", "热门种草", "穿搭分享", "美妆推荐", "好物分享"];
      console.log("[XHS] 热搜为空，使用兜底关键词");
    }

    // ====== 6. 逐个搜索话题详情 ======
    const allItems: HotSearchItem[] = hotItems.length > 0 ? hotItems : [];
    const hotPosts: string[] = [];
    const topKeywords: string[] = [];

    for (let i = 0; i < keywords.length && requestCount < XHS_MAX_REQUESTS_PER_SESSION; i++) {
      // 请求间随机延迟
      let delay = randomDelay(XHS_MIN_DELAY_MS, XHS_MAX_DELAY_MS);

      // 每 N 个请求后额外长暂停
      if (i > 0 && i % XHS_BATCH_PAUSE_AFTER === 0) {
        const batchPause = randomDelay(XHS_BATCH_PAUSE_MIN_MS, XHS_BATCH_PAUSE_MAX_MS);
        console.log(`[XHS] 批次暂停 ${Math.round(batchPause / 1000)}s (已完成 ${i} 个话题)`);
        delay += batchPause;
      }

      console.log(`[XHS] 等待 ${Math.round(delay / 1000)}s → 搜索 #${i + 1}: ${keywords[i]}`);
      await sleep(delay);

      try {
        const results = await searchNotesWithCookie(headers, keywords[i]);
        requestCount++;

        topKeywords.push(keywords[i]);

        if (results.length > 0) {
          // 取搜索结果的标题作为 hotPosts
          const topPost = results[0];
          hotPosts.push(
            `${keywords[i]}: ${topPost.title}${topPost.heat ? ` (${topPost.heat}赞)` : ""}`
          );
          allItems.push(...results);
        } else {
          hotPosts.push(keywords[i]);
        }
      } catch (err: any) {
        if (err.message.startsWith("RISK:")) {
          console.log(`[XHS] ⚠️ 风控触发，立即停止保护账号: ${err.message}`);
          riskTriggered = true;
          break;
        }
        requestCount++;
        console.log(`[XHS] 搜索异常(${keywords[i]}): ${err.message}`);
      }
    }

    // ====== 7. 构建返回数据 ======
    const totalHeat = allItems.reduce((sum, i) => sum + (i.heat || 0), 0);

    const data: PlatformCrawlData = {
      platform: "xiaohongshu",
      platformName: "小红书",
      postCount: allItems.length,
      readCount: Math.floor(totalHeat / 10000),
      sentiment: riskTriggered ? "neutral" : "positive",
      hotPosts: hotPosts.slice(0, 5),
      topKeywords: topKeywords.slice(0, 10),
    };

    // 只要拿到了一些数据就算成功
    if (allItems.length > 0 || topKeywords.length > 0) {
      await saveLastCrawlTime();
      console.log(
        `[XHS] ===== 完成: ${allItems.length} 条结果, ${requestCount} 次请求${riskTriggered ? " (风控提前终止)" : ""} =====`
      );
    }

    return {
      data,
      items: allItems,
      result: {
        source: "xiaohongshu",
        status: riskTriggered ? "partial" : allItems.length > 0 ? "success" : "error",
        recordsCount: allItems.length,
        errorMessage: riskTriggered ? "风控信号触发，提前终止" : undefined,
      },
    };
  } catch (err: any) {
    console.warn("[XHS] 爬取异常:", err.message);
    return {
      data: {
        platform: "xiaohongshu",
        platformName: "小红书",
        postCount: 0,
        readCount: 0,
        sentiment: "neutral",
        hotPosts: [`小红书爬取异常: ${err.message}`],
        topKeywords: [],
      },
      items: [],
      result: {
        source: "xiaohongshu",
        status: "error",
        recordsCount: 0,
        errorMessage: err.message || String(err),
      },
    };
  }
}

// ---- 无 Cookie 的兜底模式（原有逻辑简化版） ----

async function crawlWithoutCookie(): Promise<{
  data: PlatformCrawlData;
  items: HotSearchItem[];
  result: CrawlResult;
}> {
  try {
    const res = await fetchWithTimeout(
      "https://edith.xiaohongshu.com/api/sns/web/v1/search/hot_list",
      {
        headers: {
          accept: "application/json",
          "accept-language": "zh-CN,zh;q=0.9",
          origin: "https://www.xiaohongshu.com",
          referer: "https://www.xiaohongshu.com/",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as any;
    const items = (json?.data?.items || json?.data?.queries || [])
      .slice(0, 30)
      .map((item: any, idx: number) => ({
        rank: idx + 1,
        title: (item.word || item.name || item.query || "").trim(),
        heat: item.score || item.hot_value || 0,
        tag: "",
      }))
      .filter((i: HotSearchItem) => i.title);

    if (items.length === 0) throw new Error("No data returned");

    const totalHeat = items.reduce((sum: number, i: HotSearchItem) => sum + (i.heat || 0), 0);

    return {
      data: {
        platform: "xiaohongshu",
        platformName: "小红书",
        postCount: items.length,
        readCount: Math.floor(totalHeat / 10000),
        sentiment: "positive",
        hotPosts: items.slice(0, 5).map((i: HotSearchItem) => i.title),
        topKeywords: items.slice(0, 10).map((i: HotSearchItem) => i.title),
      },
      items,
      result: { source: "xiaohongshu", status: "success", recordsCount: items.length },
    };
  } catch (err: any) {
    console.warn("[XHS] 无Cookie模式也失败:", err.message);
    return {
      data: {
        platform: "xiaohongshu",
        platformName: "小红书",
        postCount: 0,
        readCount: 0,
        sentiment: "neutral",
        hotPosts: ["小红书热点暂不可用（未配置Cookie或接口受限）"],
        topKeywords: [],
      },
      items: [],
      result: {
        source: "xiaohongshu",
        status: "error",
        recordsCount: 0,
        errorMessage: err.message || String(err),
      },
    };
  }
}
