import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { products } from "@db/schema";
import { searchJdGoods, type JdGoodsItem } from "./jd-price";
import type { CrawlResult } from "./types";

// ============================================================
// 商品价格更新器
// 遍历数据库中所有商品，搜索京东联盟 API 获取实时价格
// ============================================================

/** 提取商品名称中的品牌+品类关键词用于搜索 */
function extractSearchKeyword(productName: string): string {
  // 去掉规格后缀（如 "方太油烟机灶具套装" -> "方太油烟机灶具"）
  // 去掉过长的型号（如 "德业除湿机DYD-T22A3" -> "德业除湿机"）
  let kw = productName
    .replace(/套装|套件|组合|系列/g, "")
    .replace(/\d+件套/g, "")
    .replace(/[A-Z]{2,}[-]?[A-Z0-9]+/g, "")  // 去掉长型号
    .trim();

  // 如果关键词太短，保留原名
  if (kw.length < 3) kw = productName;

  return kw;
}

/** 计算商品名称匹配分数 */
function matchScore(dbName: string, jdName: string): number {
  const dbLower = dbName.toLowerCase();
  const jdLower = jdName.toLowerCase();

  // 提取关键字（中文分词简化：按品牌/品类匹配）
  const dbWords = dbLower
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  let score = 0;
  for (const word of dbWords) {
    if (jdLower.includes(word)) {
      score += word.length; // 匹配的字越多，分数越高
    }
  }

  // 品牌完全匹配加分
  const brands = [
    "方太", "美的", "石头", "戴森", "蓝盒子", "德业", "海尔",
    "北鼎", "小熊", "SKG", "松下", "太力", "小米", "立邦",
    "欧普", "格力", "宜家",
  ];
  for (const b of brands) {
    if (dbLower.includes(b.toLowerCase()) && jdLower.includes(b.toLowerCase())) {
      score += 10; // 品牌匹配加大分
    }
  }

  return score;
}

/** 从搜索结果中找到最匹配的商品 */
function findBestMatch(
  productName: string,
  jdResults: JdGoodsItem[]
): JdGoodsItem | null {
  if (jdResults.length === 0) return null;

  let bestItem: JdGoodsItem | null = null;
  let bestScore = 0;

  for (const item of jdResults) {
    const score = matchScore(productName, item.skuName);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  // 至少要有一定的匹配度才认为是同款商品
  if (bestScore < 4) return null;

  return bestItem;
}

/**
 * 更新所有商品的京东价格
 * 返回更新成功的商品数和总商品数
 */
export async function updateProductPrices(): Promise<CrawlResult> {
  const db = getDb();

  try {
    // 获取所有商品
    const allProducts = await db.select().from(products);
    console.log(`[PriceUpdater] 开始更新 ${allProducts.length} 个商品的京东价格...`);

    let successCount = 0;
    let failCount = 0;
    const today = new Date().toISOString().split("T")[0];

    for (const product of allProducts) {
      try {
        const keyword = extractSearchKeyword(product.name);
        console.log(`[PriceUpdater] 搜索: "${keyword}" (${product.name})`);

        // 搜索京东
        const result = await searchJdGoods(keyword, 10, 1);

        if (result.data.length === 0) {
          console.log(`[PriceUpdater]   -> 无结果`);
          failCount++;
          continue;
        }

        // 找最匹配的商品
        const bestMatch = findBestMatch(product.name, result.data);

        if (!bestMatch) {
          console.log(`[PriceUpdater]   -> 无匹配 (${result.data.length}条结果均不匹配)`);
          failCount++;
          continue;
        }

        console.log(
          `[PriceUpdater]   -> 匹配: "${bestMatch.skuName}" ` +
          `¥${bestMatch.lowestCouponPrice} (${bestMatch.shopName})`
        );

        // 构建多平台价格 JSON
        const existingPrices = (product.platformPrices as Record<string, any>) || {};
        const newPrices = {
          ...existingPrices,
          jd: {
            price: bestMatch.lowestCouponPrice || bestMatch.lowestPrice,
            skuId: String(bestMatch.skuId),
            url: bestMatch.materialUrl,
            shopName: bestMatch.shopName,
            updatedAt: today,
          },
        };

        // 更新数据库
        await db
          .update(products)
          .set({
            platformPrices: newPrices,
            price: String(bestMatch.lowestCouponPrice || bestMatch.lowestPrice),
            priceUpdatedAt: new Date(),
          })
          .where(eq(products.productId, product.productId));

        successCount++;

        // 请求间隔：避免触发 JD 频率限制（每秒不超过 5 次）
        await new Promise((r) => setTimeout(r, 300));
      } catch (err: any) {
        console.warn(`[PriceUpdater]   -> 错误: ${err.message}`);
        failCount++;
        // 如果是 API 凭证错误，直接终止
        if (err.message.includes("凭证") || err.message.includes("sign") || err.message.includes("app_key")) {
          throw err;
        }
        // 其他错误继续处理下一个商品
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.log(
      `[PriceUpdater] 完成: ${successCount}/${allProducts.length} 个商品价格已更新，` +
      `${failCount} 个失败`
    );

    return {
      source: "jd-price",
      status: successCount > 0 ? "success" : failCount > 0 ? "partial" : "error",
      recordsCount: successCount,
      errorMessage: failCount > 0 ? `${failCount} 个商品未找到匹配` : undefined,
    };
  } catch (err: any) {
    console.error("[PriceUpdater] 价格更新失败:", err.message);
    return {
      source: "jd-price",
      status: "error",
      recordsCount: 0,
      errorMessage: err.message,
    };
  }
}

/**
 * 查询单个商品的京东价格（用于手动刷新）
 */
export async function querySingleProductPrice(
  productName: string
): Promise<{
  found: boolean;
  jdItem?: JdGoodsItem;
  keyword: string;
  totalResults: number;
}> {
  const keyword = extractSearchKeyword(productName);
  const result = await searchJdGoods(keyword, 10, 1);

  if (result.data.length === 0) {
    return { found: false, keyword, totalResults: 0 };
  }

  const bestMatch = findBestMatch(productName, result.data);
  return {
    found: !!bestMatch,
    jdItem: bestMatch || undefined,
    keyword,
    totalResults: result.totalCount,
  };
}
