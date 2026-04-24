import type { PlatformCrawlData, CrawlResult, HotSearchItem } from "./types";
import { fetchWithTimeout } from "./lib";

// ============================================================
// 小红书热点采集
// 接口：尝试小红书搜索趋势接口
// 注：小红书反爬严格，此接口可能不稳定
// ============================================================

interface XhsTrendingResponse {
  data?: {
    queries?: Array<{
      query?: string;
      hot_value?: number;
      rank?: number;
    }>;
  };
  success?: boolean;
}

export async function crawlXiaohongshu(): Promise<{
  data: PlatformCrawlData;
  items: HotSearchItem[];
  result: CrawlResult;
}> {
  try {
    // 小红书网页端趋势搜索接口（可能变动）
    const res = await fetchWithTimeout(
      "https://www.xiaohongshu.com/api/sns/web/v1/search/trending",
      {
        headers: {
          accept: "application/json",
          "accept-language": "zh-CN,zh;q=0.9",
          referer: "https://www.xiaohongshu.com/",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      }
    );

    // 如果上面接口失败，尝试备用接口
    if (!res.ok) {
      throw new Error(`Xiaohongshu HTTP ${res.status}`);
    }

    const json = (await res.json()) as XhsTrendingResponse;
    const queries = json.data?.queries || [];

    const items: HotSearchItem[] = queries.slice(0, 30).map((item, idx) => ({
      rank: item.rank || idx + 1,
      title: item.query?.trim() || "",
      heat: item.hot_value || 0,
      tag: "",
    }));

    const validItems = items.filter((i) => i.title);
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
    const fallbackData: PlatformCrawlData = {
      platform: "xiaohongshu",
      platformName: "小红书",
      postCount: 0,
      readCount: 0,
      sentiment: "neutral",
      hotPosts: ["小红书热点抓取失败，平台反爬严格，建议配置 Cookie 后重试"],
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
