import { eq, sql, and } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { products, trendKeywords, productCandidates } from "@db/schema";
import {
  matchCategories,
  getWeatherBonuses,
  getSeasonalBonuses,
  CATEGORY_TAXONOMY,
  SEASONAL_TRIGGERS,
} from "./product-taxonomy";
import { getSolarTerm, getTodayStr } from "./hotspots";
import type { HotSearchItem, WeatherData, CrawlResult } from "./types";

// ============================================================
// 趋势分析引擎 — 从热搜数据中自动发现选品机会
//
// 工作流程：
// 1. 收集各平台热搜的 HotSearchItem[]
// 2. 逐条扫描，通过品类词典提取产品相关信号
// 3. 跨平台聚合同一品类的热度
// 4. 叠加天气/节气/节日加分
// 5. 与现有商品匹配 → 更新热度 / 标记新机会
// 6. 写入 trend_keywords 表 + product_candidates 表
// ============================================================

// ---------- 类型定义 ----------

interface PlatformSignal {
  platform: string;
  title: string;
  heat: number;
  rank: number;
  matchType: "direct" | "context";
  matchedKeyword: string;
}

interface TrendBucket {
  category: string;
  subCategory: string;
  /** 各平台的命中信号 */
  signals: PlatformSignal[];
  /** 聚合热度 */
  totalHeat: number;
  /** 命中的平台数 */
  platformCount: number;
  /** 命中的平台列表 */
  platforms: string[];
  /** 代表性关键词（最高频的那个） */
  topKeyword: string;
  /** 天气加分 */
  weatherBonus: number;
  /** 节气/节日加分 */
  seasonalBonus: number;
  /** 品类基础权重 */
  baseWeight: number;
  /** 综合得分 */
  score: number;
  /** 是否为新机会（不在当前商品库中） */
  isNewOpportunity: boolean;
  /** 匹配到的现有商品ID列表 */
  matchedProductIds: string[];
}

export interface TrendAnalysisResult {
  date: string;
  /** 所有品类趋势（按分数降序） */
  trends: TrendBucket[];
  /** 新发现的选品机会 */
  newOpportunities: TrendBucket[];
  /** 现有商品的热度更新 */
  heatUpdates: Array<{ productId: string; newHeatScore: number; reason: string }>;
  /** 摘要 */
  summary: string;
}

// ---------- 核心分析函数 ----------

/**
 * 分析各平台的热搜数据，输出选品趋势和候选商品
 */
export async function analyzeTrends(
  platformItems: Array<{ platform: string; items: HotSearchItem[] }>,
  weather: WeatherData
): Promise<TrendAnalysisResult> {
  const today = getTodayStr();
  const solar = getSolarTerm(today);

  // ---- Step 1: 扫描所有热搜，提取产品相关信号 ----
  const bucketMap = new Map<string, TrendBucket>();

  for (const { platform, items } of platformItems) {
    for (const item of items) {
      const matches = matchCategories(item.title);
      if (matches.length === 0) continue;

      for (const match of matches) {
        const key = `${match.category}|${match.subCategory}`;
        if (!bucketMap.has(key)) {
          bucketMap.set(key, {
            category: match.category,
            subCategory: match.subCategory,
            signals: [],
            totalHeat: 0,
            platformCount: 0,
            platforms: [],
            topKeyword: "",
            weatherBonus: 0,
            seasonalBonus: 0,
            baseWeight: match.baseWeight,
            score: 0,
            isNewOpportunity: false,
            matchedProductIds: [],
          });
        }

        const bucket = bucketMap.get(key)!;
        bucket.signals.push({
          platform,
          title: item.title,
          heat: item.heat || 0,
          rank: item.rank,
          matchType: match.matchType,
          matchedKeyword: match.matchedKeyword,
        });
        bucket.totalHeat += item.heat || 0;

        if (!bucket.platforms.includes(platform)) {
          bucket.platforms.push(platform);
        }
      }
    }
  }

  // ---- Step 2: 环境驱动推荐 ----
  // 即使热搜没有直接提到产品，天气/节日/节气条件满足时也主动推荐
  // 这是核心创新：大部分热搜是新闻/娱乐，产品需求更多由环境驱动

  // 2a. 天气驱动：根据当前天气条件主动创建品类推荐
  const weatherBonuses = getWeatherBonuses({
    condition: weather.condition,
    humidity: weather.humidity,
    temperature: weather.temperature,
    tip: weather.tip,
  });

  for (const [catKey, bonus] of weatherBonuses.entries()) {
    if (!bucketMap.has(catKey)) {
      const [cat, sub] = catKey.split("|");
      const taxonomy = CATEGORY_TAXONOMY.find(
        (c) => c.category === cat && c.subCategory === sub
      );
      bucketMap.set(catKey, {
        category: cat,
        subCategory: sub,
        signals: [{
          platform: "weather",
          title: `天气触发: ${weather.condition} ${weather.temperature}°C 湿度${weather.humidity}%`,
          heat: 0,
          rank: 0,
          matchType: "context",
          matchedKeyword: weather.condition,
        }],
        totalHeat: 0,
        platformCount: 0,
        platforms: ["weather"],
        topKeyword: sub,
        weatherBonus: bonus,
        seasonalBonus: 0,
        baseWeight: taxonomy?.baseWeight || 3,
        score: 0,
        isNewOpportunity: false,
        matchedProductIds: [],
      });
    }
  }

  // 2b. 节日/节气驱动：如果热搜中出现节日关键词，主动推荐相关品类
  const allTitles = platformItems.flatMap((p) => p.items.map((i) => i.title));
  const combinedText = allTitles.join(" ");
  const seasonalBonuses = getSeasonalBonuses(solar.name, allTitles);

  for (const trigger of SEASONAL_TRIGGERS) {
    const matched = trigger.keywords.some(
      (kw) => solar.name.includes(kw) || combinedText.includes(kw)
    );
    if (!matched) continue;

    for (const [cat, sub] of trigger.targetCategories) {
      const key = `${cat}|${sub}`;
      if (!bucketMap.has(key)) {
        const taxonomy = CATEGORY_TAXONOMY.find(
          (c) => c.category === cat && c.subCategory === sub
        );
        bucketMap.set(key, {
          category: cat,
          subCategory: sub,
          signals: [{
            platform: "seasonal",
            title: `节日/节气触发: ${trigger.name}`,
            heat: 0,
            rank: 0,
            matchType: "context",
            matchedKeyword: trigger.name,
          }],
          totalHeat: 0,
          platformCount: 0,
          platforms: ["seasonal"],
          topKeyword: sub,
          weatherBonus: 0,
          seasonalBonus: trigger.bonus,
          baseWeight: taxonomy?.baseWeight || 3,
          score: 0,
          isNewOpportunity: false,
          matchedProductIds: [],
        });
      }
    }
  }

  // ---- Step 3: 与现有商品匹配 ----
  const db = getDb();
  const existingProducts = await db.select().from(products);

  // 构建品类→商品映射
  const categoryProductMap = new Map<string, typeof existingProducts>();
  for (const p of existingProducts) {
    const key = `${p.category}|${p.subCategory}`;
    if (!categoryProductMap.has(key)) {
      categoryProductMap.set(key, []);
    }
    categoryProductMap.get(key)!.push(p);
  }

  // ---- Step 4: 综合评分 ----
  const buckets = Array.from(bucketMap.values());

  for (const bucket of buckets) {
    const key = `${bucket.category}|${bucket.subCategory}`;

    // 平台数
    bucket.platformCount = bucket.platforms.length;

    // 找出最高频关键词
    const kwFreq = new Map<string, number>();
    for (const s of bucket.signals) {
      kwFreq.set(s.matchedKeyword, (kwFreq.get(s.matchedKeyword) || 0) + 1);
    }
    bucket.topKeyword = [...kwFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";

    // 天气/节气加分
    bucket.weatherBonus = weatherBonuses.get(key) || 0;
    bucket.seasonalBonus = seasonalBonuses.get(key) || 0;

    // 现有商品匹配
    const matchedProducts = categoryProductMap.get(key) || [];
    bucket.matchedProductIds = matchedProducts.map((p) => p.productId);
    bucket.isNewOpportunity = matchedProducts.length === 0;

    // 综合评分公式
    // 1) 热度基础分: normalize to 0-40 (基于各平台热度值总和)
    const heatBase = bucket.totalHeat > 0
      ? Math.min(40, Math.log10(Math.max(bucket.totalHeat, 1)) * 5)
      : 0;

    // 2) 直接匹配 vs 上下文匹配
    const directCount = bucket.signals.filter((s) => s.matchType === "direct").length;
    const matchQuality = directCount > 0 ? 15 : 5;

    // 3) 跨平台加分: 多平台出现说明趋势更强（weather/seasonal 不算跨平台）
    const realPlatforms = bucket.platforms.filter(
      (p) => p !== "weather" && p !== "seasonal"
    );
    const crossPlatformBonus = Math.max(0, realPlatforms.length - 1) * 10;

    // 4) 品类权重
    const weightBonus = bucket.baseWeight * 3;

    // 5) 新机会额外加分（鼓励发现新品类）
    const noveltyBonus = bucket.isNewOpportunity ? 10 : 0;

    // 6) 环境驱动基础分：即使没有热搜热度，天气/节日触发也给予基础分
    const envBase = (bucket.weatherBonus > 0 || bucket.seasonalBonus > 0) ? 10 : 0;

    bucket.score = Math.round(
      heatBase +
      matchQuality +
      crossPlatformBonus +
      weightBonus +
      bucket.weatherBonus +
      bucket.seasonalBonus +
      noveltyBonus +
      envBase
    );
  }

  // 按分数降序排列
  buckets.sort((a, b) => b.score - a.score);

  // ---- Step 5: 计算现有商品的热度更新 ----
  const heatUpdates: TrendAnalysisResult["heatUpdates"] = [];

  for (const bucket of buckets) {
    if (bucket.matchedProductIds.length > 0) {
      // 为匹配到的商品更新热度
      for (const pid of bucket.matchedProductIds) {
        const product = existingProducts.find((p) => p.productId === pid);
        if (!product) continue;

        // 新热度 = 原始热度 × 衰减 + 趋势热度贡献
        const currentHeat = product.heatScore || 0;
        const trendBoost = Math.min(20, Math.round(bucket.score / 5));
        const newHeat = Math.min(100, Math.max(currentHeat, currentHeat * 0.9 + trendBoost));

        if (newHeat !== currentHeat) {
          heatUpdates.push({
            productId: pid,
            newHeatScore: Math.round(newHeat),
            reason: `趋势"${bucket.topKeyword}"在${bucket.platforms.join("/")}上热搜，品类得分${bucket.score}`,
          });
        }
      }
    }
  }

  // ---- Step 6: 提取新机会 ----
  const newOpportunities = buckets.filter(
    (b) => b.isNewOpportunity && b.score >= 30 // 最低阈值，避免噪声
  );

  // ---- 生成摘要 ----
  const topTrends = buckets.slice(0, 5);
  const trendSummary = topTrends
    .map((t) =>
      `${t.category}/${t.subCategory}(${t.topKeyword}, 得分${t.score}, ${t.platforms.join("+")})`
    )
    .join("；");

  const summary =
    `[选品分析] ${solar.name} | ${weather.condition} ${weather.temperature}°C 湿度${weather.humidity}% | ` +
    `扫描${platformItems.reduce((s, p) => s + p.items.length, 0)}条热搜，` +
    `发现${buckets.length}个相关品类，${newOpportunities.length}个新机会。` +
    `TOP5: ${trendSummary}`;

  return {
    date: today,
    trends: buckets,
    newOpportunities,
    heatUpdates,
    summary,
  };
}

// ---------- 持久化函数 ----------

/**
 * 将分析结果写入数据库
 */
export async function saveTrendAnalysis(result: TrendAnalysisResult): Promise<void> {
  const db = getDb();

  // 1. 保存趋势关键词
  for (const trend of result.trends) {
    await db.insert(trendKeywords).values({
      date: result.date,
      keyword: trend.topKeyword,
      category: trend.category,
      subCategory: trend.subCategory,
      heatTotal: trend.totalHeat,
      platformCount: trend.platformCount,
      platforms: {
        list: trend.platforms,
        signals: trend.signals.slice(0, 10).map((s) => ({
          platform: s.platform,
          title: s.title,
          heat: s.heat,
          rank: s.rank,
        })),
      },
      weatherRelevant: trend.weatherBonus > 0,
      score: trend.score,
      isNewOpportunity: trend.isNewOpportunity,
    });
  }

  // 2. 保存/更新候选商品
  for (const opp of result.newOpportunities) {
    const candidateId = `cand-${opp.category}-${opp.subCategory}-${result.date}`.replace(/\s+/g, "_");

    // 先检查是否已存在同一品类的候选
    const existing = await db
      .select()
      .from(productCandidates)
      .where(
        and(
          eq(productCandidates.category, opp.category),
          eq(productCandidates.subCategory, opp.subCategory),
          eq(productCandidates.status, "pending")
        )
      );

    if (existing.length > 0) {
      // 更新已有候选的分数和趋势数据
      await db
        .update(productCandidates)
        .set({
          score: Math.max(existing[0].score || 0, opp.score),
          trendData: {
            lastDate: result.date,
            platforms: opp.platforms,
            topKeyword: opp.topKeyword,
            totalHeat: opp.totalHeat,
            weatherBonus: opp.weatherBonus,
            seasonalBonus: opp.seasonalBonus,
            signalCount: opp.signals.length,
          },
        })
        .where(eq(productCandidates.id, existing[0].id));
    } else {
      // 创建新候选
      const suggestedName = generateProductName(opp);
      await db.insert(productCandidates).values({
        candidateId,
        keyword: opp.topKeyword,
        suggestedName,
        category: opp.category,
        subCategory: opp.subCategory,
        reason: `${opp.platforms.join("/")}热搜出现"${opp.topKeyword}"相关话题${opp.signals.length}次，品类得分${opp.score}`,
        score: opp.score,
        trendData: {
          firstDate: result.date,
          lastDate: result.date,
          platforms: opp.platforms,
          topKeyword: opp.topKeyword,
          totalHeat: opp.totalHeat,
          weatherBonus: opp.weatherBonus,
          seasonalBonus: opp.seasonalBonus,
          signalCount: opp.signals.length,
        },
        status: "pending",
      });
    }
  }

  // 3. 更新现有商品的热度
  for (const update of result.heatUpdates) {
    await db
      .update(products)
      .set({
        heatScore: update.newHeatScore,
        reason: update.reason,
      })
      .where(eq(products.productId, update.productId));
  }
}

/**
 * 为候选商品生成建议名称
 */
function generateProductName(trend: TrendBucket): string {
  const brandMap: Record<string, string[]> = {
    "大家电|厨电": ["方太", "美的", "老板"],
    "大家电|除湿": ["德业", "格力", "美的"],
    "大家电|烘干": ["海尔", "小天鹅", "美的"],
    "大家电|空调": ["格力", "美的", "海尔"],
    "大家电|冰箱": ["海尔", "美的", "西门子"],
    "大家电|洗衣机": ["海尔", "小天鹅", "西门子"],
    "智能设备|清洁": ["石头", "科沃斯", "追觅"],
    "智能设备|净化": ["小米", "戴森", "IQAir"],
    "智能设备|安防": ["小米", "萤石", "华为"],
    "小家电|厨电": ["北鼎", "小熊", "九阳"],
    "小家电|个护": ["SKG", "松下", "戴森"],
    "小家电|清洁": ["小米", "莱克", "美的"],
    "小家电|环境": ["戴森", "小米", "美的"],
    "家居软装|家纺": ["蓝盒子", "喜临门", "梦百合"],
    "家居软装|收纳": ["宜家", "太力", "百露"],
    "家居软装|防潮": ["太力", "除湿王", "居家"],
    "家装建材|硬装": ["立邦", "多乐士", "三棵树"],
    "家装建材|灯具": ["欧普", "飞利浦", "松下"],
    "家装建材|卫浴": ["TOTO", "科勒", "箭牌"],
  };

  const key = `${trend.category}|${trend.subCategory}`;
  const brands = brandMap[key] || ["热门品牌"];
  const brand = brands[0];

  return `${brand}${trend.topKeyword || trend.subCategory}（待定具体型号）`;
}

/**
 * 获取选品分析的 CrawlResult 格式（用于日志记录）
 */
export function trendAnalysisToResult(analysis: TrendAnalysisResult): CrawlResult {
  const hasResults = analysis.trends.length > 0;
  return {
    source: "trend-analysis",
    status: hasResults ? "success" : "partial",
    recordsCount: analysis.trends.length,
    errorMessage: hasResults
      ? `发现${analysis.trends.length}个品类趋势，${analysis.newOpportunities.length}个新机会，更新${analysis.heatUpdates.length}个商品热度`
      : "未从热搜中发现产品相关趋势",
  };
}
