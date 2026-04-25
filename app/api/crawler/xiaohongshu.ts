import type { PlatformCrawlData, CrawlResult, HotSearchItem } from "./types";
import { fetchWithTimeout } from "./lib";

// ============================================================
// 小红书热点采集
// 主接口：小红书搜索趋势 API
// 备用接口：小红书发现页 API
// 注：小红书反爬严格，均可能失败，做好兜底
// ============================================================

interface XhsTrendingResponse {
  data?: {
    queries?: Array<{
      query?: string;
      name?: string;
      hot_value?: number;
      score?: number;
      rank?: number;
    }>;
    items?: Array<{
      word?: string;
      name?: string;
      score?: number;
    }>;
  };
  success?: boolean;
}

/** 主接口：搜索趋势 */
async function tryXhsPrimary(): Promise<HotSearchItem[]> {
  const res = await fetchWithTimeout(
    "https://www.xiaohongshu.com/api/sns/web/v1/search/trending",
    {
      headers: {
        accept: "application/json",
        "accept-language": "zh-CN,zh;q=0.9",
        origin: "https://www.xiaohongshu.com",
        referer: "https://www.xiaohongshu.com/explore",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );

  if (!res.ok) throw new Error(`XHS primary HTTP ${res.status}`);

  const json = (await res.json()) as XhsTrendingResponse;
  const queries = json.data?.queries || json.data?.items || [];

  return queries.slice(0, 30).map((item, idx) => ({
    rank: (item as any).rank || idx + 1,
    title: ((item as any).query || (item as any).name || (item as any).word || "").trim(),
    heat: (item as any).hot_value || (item as any).score || 0,
    tag: "",
  })).filter((i: HotSearchItem) => i.title);
}

/** 备用接口：edith API */
async function tryXhsFallback(): Promise<HotSearchItem[]> {
  const res = await fetchWithTimeout(
    "https://edith.xiaohongshu.com/api/sns/web/v1/search/hot_list",
    {
      headers: {
        accept: "application/json",
        "accept-language": "zh-CN,zh;q=0.9",
        origin: "https://www.xiaohongshu.com",
        referer: "https://www.xiaohongshu.com/",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );

  if (!res.ok) throw new Error(`XHS fallback HTTP ${res.status}`);

  const json = (await res.json()) as XhsTrendingResponse;
  const items = json.data?.items || json.data?.queries || [];

  return items.slice(0, 30).map((item, idx) => ({
    rank: idx + 1,
    title: ((item as any).word || (item as any).name || (item as any).query || "").trim(),
    heat: (item as any).score || (item as any).hot_value || 0,
    tag: "",
  })).filter((i: HotSearchItem) => i.title);
}

export async function crawlXiaohongshu(): Promise<{
  data: PlatformCrawlData;
  items: HotSearchItem[];
  result: CrawlResult;
}> {
  try {
    let validItems: HotSearchItem[];
    try {
      validItems = await tryXhsPrimary();
      if (validItems.length === 0) throw new Error("Primary returned empty");
    } catch {
      console.log("[XHS] Primary API failed, trying fallback...");
      try {
        validItems = await tryXhsFallback();
        if (validItems.length === 0) throw new Error("Fallback returned empty");
      } catch {
        throw new Error("All XHS APIs failed");
      }
    }

    const totalHeat = validItems.reduce((sum, i) => sum + (i.heat || 0), 0);

    const hotPosts = validItems
      .slice(0, 5)
      .map((i) => `${i.title}${i.heat ? ` (热度 ${(i.heat / 10000).toFixed(1)}万)` : ""}`);

    const topKeywords = validItems.slice(0, 10).map((i) => i.title);

    const data: PlatformCrawlData = {
      platform: "xiaohongshu",
      platformName: "小红书",
      postCount: validItems.length,
      readCount: Math.floor(totalHeat / 10000),
      sentiment: "positive",
      hotPosts,
      topKeywords,
    };

    return {
      data,
      items: validItems,
      result: { source: "xiaohongshu", status: "success", recordsCount: validItems.length },
    };
  } catch (err: any) {
    console.warn("[XHS] All attempts failed:", err.message);
    const fallbackData: PlatformCrawlData = {
      platform: "xiaohongshu",
      platformName: "小红书",
      postCount: 0,
      readCount: 0,
      sentiment: "neutral",
      hotPosts: ["小红书热点抓取失败，平台反爬严格"],
      topKeywords: [],
    };
    return {
      data: fallbackData,
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
