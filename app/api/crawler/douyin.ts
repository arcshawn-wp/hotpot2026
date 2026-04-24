import type { PlatformCrawlData, CrawlResult, HotSearchItem } from "./types";
import { fetchWithTimeout } from "./lib";

// ============================================================
// 抖音热点采集
// 接口：尝试 iesdouyin 公开热榜接口
// ============================================================

interface DouyinBillboardItem {
  sentence: string;
  hot_value?: number;
  video_count?: number;
  event_time?: number;
}

interface DouyinBillboardResponse {
  status_code?: number;
  word_list?: DouyinBillboardItem[];
}

export async function crawlDouyin(): Promise<{
  data: PlatformCrawlData;
  items: HotSearchItem[];
  result: CrawlResult;
}> {
  try {
    // 抖音公开热榜接口（PC端）
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

    if (!res.ok) throw new Error(`Douyin HTTP ${res.status}`);

    const json = (await res.json()) as DouyinBillboardResponse;
    const wordList = json.word_list || [];

    const items: HotSearchItem[] = wordList.slice(0, 30).map((item, idx) => ({
      rank: idx + 1,
      title: item.sentence?.trim() || "",
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
    const fallbackData: PlatformCrawlData = {
      platform: "douyin",
      platformName: "抖音",
      postCount: 0,
      readCount: 0,
      sentiment: "neutral",
      hotPosts: ["抖音热点抓取失败，请检查网络或反爬策略"],
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
