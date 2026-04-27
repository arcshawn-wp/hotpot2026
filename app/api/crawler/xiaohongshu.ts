import type { PlatformCrawlData, CrawlResult, HotSearchItem } from "./types";
import { fetchWithTimeout } from "./lib";

// ============================================================
// 小红书热点采集 — 探索页 SSR 数据抓取
//
// 策略：抓取 xiaohongshu.com/explore 页面 HTML，
// 从 __INITIAL_STATE__ 中提取首页推荐的 noteCard 数据。
// 优势：
// - 只需 1 次 HTTP 请求（远低于任何风控阈值）
// - 不需要 x-s 签名，只需 Cookie
// - 每次返回约 35 条笔记数据
// - 每 2 天执行一次，模拟偶尔刷小红书的普通用户
// ============================================================

// ---- 配置 ----
const XHS_CRAWL_INTERVAL_DAYS = 2;
const LAST_CRAWL_FILE = "/tmp/xhs-last-crawl.txt";
let lastSuccessfulCrawlAt = 0;

// ---- 上次爬取时间管理 ----

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
  } catch {}
}

// ---- 核心：从探索页 HTML 提取数据 ----

interface XhsNoteCard {
  displayTitle: string;
  noteId?: string;
  type?: string;
  likedCount: number;
  nickname: string;
}

/**
 * 从 __INITIAL_STATE__ JSON 中递归查找所有 noteCard
 */
function extractNoteCards(obj: any, results: XhsNoteCard[] = [], depth = 0): XhsNoteCard[] {
  if (!obj || typeof obj !== "object" || depth > 15) return results;

  // 检测当前对象是否是 noteCard
  if (obj.displayTitle && typeof obj.displayTitle === "string") {
    const card: XhsNoteCard = {
      displayTitle: obj.displayTitle,
      noteId: obj.noteId || obj.id || "",
      type: obj.type || "",
      likedCount: 0,
      nickname: "",
    };

    // 提取互动数据
    if (obj.interactInfo) {
      card.likedCount = parseInt(obj.interactInfo.likedCount || "0", 10) || 0;
    }

    // 提取用户信息
    if (obj.user) {
      card.nickname = obj.user.nickname || obj.user.nickName || "";
    }

    results.push(card);
  }

  // 如果有 noteCard 子对象，也检查
  if (obj.noteCard) {
    extractNoteCards(obj.noteCard, results, depth + 1);
  }

  // 递归遍历数组和对象
  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractNoteCards(item, results, depth + 1);
    }
  } else {
    for (const key of Object.keys(obj)) {
      if (key === "noteCard" || key === "items" || key === "feeds" ||
          key === "feed" || key === "homeFeed" || key === "recommend") {
        extractNoteCards(obj[key], results, depth + 1);
      }
    }
  }

  return results;
}

/**
 * 抓取小红书探索页并提取笔记数据
 */
async function fetchExplorePage(cookie: string): Promise<XhsNoteCard[]> {
  const res = await fetchWithTimeout("https://www.xiaohongshu.com/explore", {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      cookie,
    },
    timeout: 20000,
  });

  if (!res.ok) {
    throw new Error(`探索页 HTTP ${res.status}`);
  }

  const html = await res.text();

  // 提取 __INITIAL_STATE__ JSON
  const match = html.match(/__INITIAL_STATE__\s*=\s*({.+?})\s*<\/script>/s);
  if (!match) {
    throw new Error("未找到 __INITIAL_STATE__");
  }

  let jsonStr = match[1];
  // 小红书的 JSON 中可能有 undefined 值，替换为 null
  jsonStr = jsonStr.replace(/\bundefined\b/g, "null");

  let state: any;
  try {
    state = JSON.parse(jsonStr);
  } catch {
    throw new Error("__INITIAL_STATE__ JSON 解析失败");
  }

  // 递归提取所有 noteCard
  const cards = extractNoteCards(state);
  console.log(`[XHS] 从探索页提取到 ${cards.length} 条笔记`);

  return cards;
}

// ---- 主入口 ----

export async function crawlXiaohongshu(): Promise<{
  data: PlatformCrawlData;
  items: HotSearchItem[];
  result: CrawlResult;
}> {
  // 1. 检查 Cookie
  const cookie = process.env.XHS_COOKIE;
  if (!cookie) {
    console.log("[XHS] 未配置 XHS_COOKIE，跳过");
    return makeEmpty("未配置 XHS_COOKIE 环境变量");
  }

  // 2. 检查爬取间隔
  const lastCrawl = await loadLastCrawlTime();
  const daysSince = (Date.now() - lastCrawl) / (24 * 3600_000);
  if (lastCrawl > 0 && daysSince < XHS_CRAWL_INTERVAL_DAYS) {
    console.log(`[XHS] 距上次爬取 ${daysSince.toFixed(1)} 天，未满 ${XHS_CRAWL_INTERVAL_DAYS} 天，跳过`);
    return {
      data: {
        platform: "xiaohongshu",
        platformName: "小红书",
        postCount: 0,
        readCount: 0,
        sentiment: "neutral",
        hotPosts: [`小红书每${XHS_CRAWL_INTERVAL_DAYS}天更新，下次约${Math.ceil(XHS_CRAWL_INTERVAL_DAYS - daysSince)}天后`],
        topKeywords: [],
      },
      items: [],
      result: { source: "xiaohongshu", status: "success", recordsCount: 0 },
    };
  }

  // 3. 检查活跃时段（北京时间 7:00-23:00）
  const chinaHour = new Date().getHours(); // 容器已设 TZ=Asia/Shanghai
  if (chinaHour < 7 || chinaHour >= 23) {
    console.log(`[XHS] 北京时间 ${chinaHour} 点，非活跃时段，跳过`);
    return makeEmpty("非活跃时段(7-23)");
  }

  console.log("[XHS] ===== 开始探索页数据抓取 =====");

  try {
    // 4. 只需 1 次请求：抓取探索页
    const cards = await fetchExplorePage(cookie);

    if (cards.length === 0) {
      console.log("[XHS] 探索页未提取到笔记数据");
      return makeEmpty("探索页无数据（Cookie 可能失效）");
    }

    // 5. 按点赞数排序，提取热门内容
    const sorted = [...cards].sort((a, b) => b.likedCount - a.likedCount);
    const totalLikes = sorted.reduce((sum, c) => sum + c.likedCount, 0);

    const hotPosts = sorted.slice(0, 5).map(
      (c) => `${c.displayTitle}${c.likedCount > 0 ? ` (${c.likedCount}赞)` : ""}`
    );

    const topKeywords = sorted
      .slice(0, 10)
      .map((c) => c.displayTitle)
      .filter((t) => t.length > 2 && t.length < 30);

    const items: HotSearchItem[] = sorted.map((c, idx) => ({
      rank: idx + 1,
      title: c.displayTitle,
      heat: c.likedCount,
      url: c.noteId ? `https://www.xiaohongshu.com/explore/${c.noteId}` : "",
      tag: c.nickname,
    }));

    const data: PlatformCrawlData = {
      platform: "xiaohongshu",
      platformName: "小红书",
      postCount: cards.length,
      readCount: Math.floor(totalLikes / 100),
      sentiment: "positive",
      hotPosts,
      topKeywords,
    };

    // 6. 保存爬取时间
    await saveLastCrawlTime();

    console.log(`[XHS] ===== 完成: ${cards.length} 条笔记, 最高赞 ${sorted[0]?.likedCount || 0} =====`);

    return {
      data,
      items,
      result: { source: "xiaohongshu", status: "success", recordsCount: cards.length },
    };
  } catch (err: any) {
    console.warn("[XHS] 抓取失败:", err.message);
    return makeEmpty(err.message);
  }
}

function makeEmpty(reason: string) {
  return {
    data: {
      platform: "xiaohongshu" as const,
      platformName: "小红书",
      postCount: 0,
      readCount: 0,
      sentiment: "neutral" as const,
      hotPosts: [`小红书: ${reason}`],
      topKeywords: [],
    },
    items: [],
    result: {
      source: "xiaohongshu",
      status: "error" as const,
      recordsCount: 0,
      errorMessage: reason,
    },
  };
}
