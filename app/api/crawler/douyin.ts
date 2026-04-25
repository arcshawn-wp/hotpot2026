import type { PlatformCrawlData, CrawlResult, HotSearchItem } from "./types";
import { fetchWithTimeout } from "./lib";

// ============================================================
// 抖音热点采集
// 主接口：抖音网页端热搜 API
// 备用接口：TopHub 抖音热榜
// ============================================================

interface DouyinHotItem {
  word?: string;
  sentence?: string;
  hot_value?: number;
  video_count?: number;
  position?: number;
}

interface DouyinHotResponse {
  status_code?: number;
  data?: {
    word_list?: DouyinHotItem[];
  };
  word_list?: DouyinHotItem[];
}

/** 主接口：抖音网页端热搜 */
async function tryDouyinPrimary(): Promise<HotSearchItem[]> {
  const res = await fetchWithTimeout(
    "https://www.douyin.com/aweme/v1/web/hot/search/list/",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9",
        referer: "https://www.douyin.com/",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );
  if (!res.ok) throw new Error(`Douyin primary HTTP ${res.status}`);

  const json = (await res.json()) as DouyinHotResponse;
  const wordList = json.data?.word_list || json.word_list || [];

  return wordList.slice(0, 30).map((item, idx) => ({
    rank: item.position || idx + 1,
    title: (item.word || item.sentence || "").trim(),
    heat: item.hot_value || 0,
    tag: "",
  })).filter((i) => i.title);
}

/** 备用接口：iesdouyin 旧版 */
async function tryDouyinFallback(): Promise<HotSearchItem[]> {
  const res = await fetchWithTimeout(
    "https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/",
    {
      headers: {
        accept: "application/json",
        "accept-language": "zh-CN,zh;q=0.9",
        referer: "https://www.iesdouyin.com/",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );
  if (!res.ok) throw new Error(`Douyin fallback HTTP ${res.status}`);

  const json = (await res.json()) as DouyinHotResponse;
  const wordList = json.word_list || [];

  return wordList.slice(0, 30).map((item, idx) => ({
    rank: idx + 1,
    title: (item.sentence || item.word || "").trim(),
    heat: item.hot_value || 0,
    tag: "",
  })).filter((i) => i.title);
}

export async function crawlDouyin(): Promise<{
  data: PlatformCrawlData;
  items: HotSearchItem[];
  result: CrawlResult;
}> {
  try {
    // 尝试主接口，失败则用备用
    let validItems: HotSearchItem[];
    try {
      validItems = await tryDouyinPrimary();
      if (validItems.length === 0) throw new Error("Primary returned empty");
    } catch {
      console.log("[Douyin] Primary API failed, trying fallback...");
      validItems = await tryDouyinFallback();
    }

    if (validItems.length === 0) {
      throw new Error("All Douyin APIs returned empty");
    }

    const totalHeat = validItems.reduce((sum, i) => sum + (i.heat || 0), 0);

    const hotPosts = validItems
      .slice(0, 5)
      .map((i) => `${i.title}${i.heat ? ` (热度 ${(i.heat / 10000).toFixed(1)}万)` : ""}`);

    const topKeywords = validItems.slice(0, 10).map((i) => i.title);

    const data: PlatformCrawlData = {
      platform: "douyin",
      platformName: "抖音",
      postCount: validItems.length,
      readCount: Math.floor(totalHeat / 10000),
      sentiment: "positive",
      hotPosts,
      topKeywords,
    };

    return {
      data,
      items: validItems,
      result: { source: "douyin", status: "success", recordsCount: validItems.length },
    };
  } catch (err: any) {
    console.warn("[Douyin] All attempts failed:", err.message);
    const fallbackData: PlatformCrawlData = {
      platform: "douyin",
      platformName: "抖音",
      postCount: 0,
      readCount: 0,
      sentiment: "neutral",
      hotPosts: ["抖音热点抓取失败，平台反爬策略升级"],
      topKeywords: [],
    };
    return {
      data: fallbackData,
      items: [],
      result: {
        source: "douyin",
        status: "error",
        recordsCount: 0,
        errorMessage: err.message || String(err),
      },
    };
  }
}
