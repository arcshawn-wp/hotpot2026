import { crawlWeather } from "./weather";
import { crawlWeibo } from "./weibo";
import { crawlDouyin } from "./douyin";
import { crawlXiaohongshu } from "./xiaohongshu";
import { updateProductPrices } from "./product-updater";
import {
  analyzeTrends,
  saveTrendAnalysis,
  trendAnalysisToResult,
} from "./trend-analyzer";
import {
  getTodayStr,
  getHotspotsForMatching,
  savePlatformData,
  generateDailySnapshot,
  saveCrawlLogs,
} from "./hotspots";
import type { CrawlResult, PlatformCrawlData } from "./types";

// ============================================================
// 爬虫主入口
// ============================================================

export interface FullCrawlResult {
  date: string;
  weather: Awaited<ReturnType<typeof crawlWeather>>["data"];
  platforms: Array<{
    platform: string;
    data: PlatformCrawlData;
    matchedHotspotId: string | null;
  }>;
  crawlResults: CrawlResult[];
  snapshot: Awaited<ReturnType<typeof generateDailySnapshot>>;
}

/** 执行一次全量采集 */
export async function runFullCrawl(): Promise<FullCrawlResult> {
  const dateStr = getTodayStr();
  console.log(`[Crawler] Starting full crawl for ${dateStr}...`);

  // 1. 采集天气
  const { data: weather, result: weatherResult } = await crawlWeather();
  console.log(`[Crawler] Weather: ${weather.city} ${weather.temperature}°C ${weather.condition}`);

  // 2. 采集各平台热点
  const [weiboRes, douyinRes, xhsRes] = await Promise.all([
    crawlWeibo(),
    crawlDouyin(),
    crawlXiaohongshu(),
  ]);

  console.log(
    `[Crawler] Weibo: ${weiboRes.result.status} (${weiboRes.result.recordsCount}), ` +
      `Douyin: ${douyinRes.result.status} (${douyinRes.result.recordsCount}), ` +
      `XHS: ${xhsRes.result.status} (${xhsRes.result.recordsCount})`
  );

  // 3. 获取今天的热点用于匹配
  const dbHotspots = await getHotspotsForMatching(dateStr);

  // 4. 保存平台数据
  const platformDatas = [
    { ...weiboRes, key: "weibo" as const },
    { ...douyinRes, key: "douyin" as const },
    { ...xhsRes, key: "xiaohongshu" as const },
  ];

  const platforms: FullCrawlResult["platforms"] = [];

  for (const p of platformDatas) {
    // 简单的关键词匹配
    let matchedId: string | null = null;
    for (const h of dbHotspots) {
      const titleLower = h.title.toLowerCase();
      const matched = p.data.topKeywords.some(
        (kw) => kw && titleLower.includes(kw.toLowerCase())
      );
      if (matched) {
        matchedId = h.hotspotId;
        break;
      }
    }
    // 如果没匹配到，使用第一个活跃热点作为兜底（或生成一个虚拟ID）
    if (!matchedId && dbHotspots.length > 0) {
      matchedId = dbHotspots[0].hotspotId;
    }

    await savePlatformData(p.data, matchedId);
    platforms.push({
      platform: p.key,
      data: p.data,
      matchedHotspotId: matchedId,
    });
  }

  // 5. 保存采集日志
  const crawlResults: CrawlResult[] = [
    weatherResult,
    weiboRes.result,
    douyinRes.result,
    xhsRes.result,
  ];
  await saveCrawlLogs(crawlResults);

  // 5.5 数据驱动选品分析：从热搜数据中自动发现产品趋势
  console.log("[Crawler] Running trend analysis for product selection...");
  try {
    const trendAnalysis = await analyzeTrends(
      [
        { platform: "weibo", items: weiboRes.items },
        { platform: "douyin", items: douyinRes.items },
        { platform: "xiaohongshu", items: xhsRes.items },
      ],
      weather
    );
    console.log(`[Crawler] ${trendAnalysis.summary}`);
    await saveTrendAnalysis(trendAnalysis);
    const trendResult = trendAnalysisToResult(trendAnalysis);
    crawlResults.push(trendResult);
    await saveCrawlLogs([trendResult]);
  } catch (err: any) {
    console.warn("[Crawler] Trend analysis failed:", err.message);
    crawlResults.push({
      source: "trend-analysis",
      status: "error",
      recordsCount: 0,
      errorMessage: err.message,
    });
  }

  // 5.6 更新商品京东价格（通过第三方代理接口，无需额外密钥）
  console.log("[Crawler] Updating product prices via JD proxy API...");
  const priceResult = await updateProductPrices();
  console.log(
    `[Crawler] Price update: ${priceResult.status} (${priceResult.recordsCount} updated)`
  );
  crawlResults.push(priceResult);
  await saveCrawlLogs([priceResult]);

  // 6. 生成每日快照
  const snapshot = await generateDailySnapshot(weather, crawlResults);
  console.log(`[Crawler] Snapshot generated: ${snapshot.description}`);

  console.log(`[Crawler] Full crawl completed for ${dateStr}`);

  return {
    date: dateStr,
    weather,
    platforms,
    crawlResults,
    snapshot,
  };
}
