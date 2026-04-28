import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { products } from "@db/schema";
import { queryJdPrice, PRODUCT_JD_URL_MAP, type JdPriceResult } from "./jd-price";
import type { CrawlResult } from "./types";

// ============================================================
// 商品价格更新器
// 遍历数据库中所有商品，通过京东代理接口查询实时价格
// 接口有频率限制，请求间隔 ≥ 8 秒
// ============================================================

/** 请求间隔（毫秒） */
const REQUEST_INTERVAL = 10000; // 10 秒，保守值

/** 延时 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 更新所有商品的京东价格
 * 返回更新结果
 */
export async function updateProductPrices(): Promise<CrawlResult> {
  const db = getDb();

  try {
    // 获取所有商品
    const allProducts = await db.select().from(products);
    console.log(`[PriceUpdater] 开始更新 ${allProducts.length} 个商品的京东价格...`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    const today = new Date().toISOString().split("T")[0];

    for (let i = 0; i < allProducts.length; i++) {
      const product = allProducts[i];
      const jdUrl = PRODUCT_JD_URL_MAP[product.productId];

      if (!jdUrl) {
        console.log(`[PriceUpdater] [${i + 1}/${allProducts.length}] ${product.name} -> 跳过（无京东链接映射）`);
        skipCount++;
        continue;
      }

      try {
        console.log(
          `[PriceUpdater] [${i + 1}/${allProducts.length}] 查询: ${product.name}`
        );

        const result: JdPriceResult = await queryJdPrice(jdUrl);

        if (!result.success) {
          console.log(`[PriceUpdater]   -> 失败: ${result.error}`);
          failCount++;
        } else {
          console.log(
            `[PriceUpdater]   -> 成功: "${result.jdName.slice(0, 40)}" ¥${result.price}`
          );

          // 构建多平台价格 JSON
          const existingPrices =
            (product.platformPrices as Record<string, any>) || {};
          const newPrices = {
            ...existingPrices,
            jd: {
              price: result.price,
              skuId: result.jdId,
              url: result.jdUrl,
              shopName: "京东",
              updatedAt: today,
            },
          };

          // 更新数据库
          await db
            .update(products)
            .set({
              platformPrices: newPrices,
              // 同时更新主价格字段（取京东价作为展示价）
              price: String(result.price),
              priceUpdatedAt: new Date(),
            })
            .where(eq(products.productId, product.productId));

          successCount++;
        }

        // 频率限制：除了最后一个，每次请求后等待
        if (i < allProducts.length - 1) {
          console.log(`[PriceUpdater]   等待 ${REQUEST_INTERVAL / 1000}s ...`);
          await sleep(REQUEST_INTERVAL);
        }
      } catch (err: any) {
        // 今日额度用完，直接终止，不再浪费时间
        if ((err as any).quotaExhausted) {
          console.warn(`[PriceUpdater] 接口今日调用量已用完，终止更新。已成功 ${successCount} 个。`);
          break;
        }
        console.warn(`[PriceUpdater]   -> 异常: ${err.message}`);
        failCount++;
        // 出错后等久一点再继续
        await sleep(REQUEST_INTERVAL * 2);
      }
    }

    const summary =
      `完成: ${successCount} 成功, ${failCount} 失败, ${skipCount} 跳过 ` +
      `(共 ${allProducts.length} 个商品)`;
    console.log(`[PriceUpdater] ${summary}`);

    return {
      source: "jd-price",
      status: successCount > 0 ? "success" : failCount > 0 ? "partial" : "error",
      recordsCount: successCount,
      errorMessage:
        failCount > 0 || skipCount > 0
          ? `${failCount} 失败, ${skipCount} 跳过`
          : undefined,
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
  productId: string
): Promise<JdPriceResult | null> {
  const jdUrl = PRODUCT_JD_URL_MAP[productId];
  if (!jdUrl) return null;
  return queryJdPrice(jdUrl);
}
