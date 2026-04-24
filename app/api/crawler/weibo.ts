import type { PlatformCrawlData, CrawlResult, HotSearchItem } from "./types";
import { fetchWithTimeout } from "./lib";

// ============================================================
// 微博热搜采集
// 接口：https://weibo.com/ajax/side/hotSearch
// ============================================================

interface WeiboHotSearchResponse {
  data?: {
    realtime?: Array<{
      word: string;
      num?: number;
      rank?: number;
      category?: string;
      flag_desc?: string;
    }>;
  };
  ok?: number;
}

export async function crawlWeibo(): Promise<{
  data: PlatformCrawlData;
  items: HotSearchItem[];
  result: CrawlResult;
}> {
  try {
    const res = await fetchWithTimeout("https://weibo.com/ajax/side/hotSearch", {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9",
        referer: "https://weibo.com/hot/search",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) throw new Error(`Weibo HTTP ${res.status}`);

    const json = (await res.json()) as WeiboHotSearchResponse;
    const realtime = json.data?.realtime || [];

    // 取前30条
    const topItems = realtime.slice(0, 30);

    const items: HotSearchItem[] = topItems.map((item, idx) => ({
      rank: item.rank || idx + 1,
      title: item.word?.trim() || "",
      heat: item.num || 0,
      tag: item.flag_desc || item.category || "",
    }));

    // 过滤空标题
    const validItems = items.filter((i) => i.title);

    const totalRead = validItems.reduce((sum, i) => sum + (i.heat || 0), 0);

    const hotPosts = validItems
      .slice(0, 5)
      .map((i) => `${i.title}${i.heat ? ` (${(i.heat / 10000).toFixed(1)}万)` : ""}`);

    const topKeywords = validItems.slice(0, 10).map((i) => i.title);

    const data: PlatformCrawlData = {
      platform: "weibo",
      platformName: "微博",
      postCount: validItems.length,
      readCount: Math.floor(totalRead / 10000),
      sentiment: "mixed",
      hotPosts,
      topKeywords,
    };

    return {
      data,
      items: validItems,
      result: { source: "weibo", status: "success", recordsCount: validItems.length },
    };
  } catch (err: any) {
    const fallbackData: PlatformCrawlData = {
      platform: "weibo",
      platformName: "微博",
      postCount: 0,
      readCount: 0,
      sentiment: "neutral",
      hotPosts: ["微博热搜抓取失败，请检查网络"],
      topKeywords: [],
    };
    return {
      data: fallbackData,
      items: [],
      result: {
        source: "weibo",
        status: "error",
        recordsCount: 0,
        errorMessage: err.message || String(err),
      },
    };
  }
}
