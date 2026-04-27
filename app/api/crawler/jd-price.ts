import { createHash } from "crypto";
import { fetchWithTimeout } from "./lib";

// ============================================================
// 京东联盟 API 客户端 — 商品搜索 & 价格查询
// 基于 JD Union Open API (router.jd.com)
// 签名算法：MD5( secretKey + sorted(key+value) + secretKey )
// ============================================================

// ---------- 配置 ----------
const JD_API_ENDPOINT = "https://router.jd.com/api";
const JD_APP_KEY = process.env.JD_UNION_APP_KEY || "";
const JD_SECRET_KEY = process.env.JD_UNION_SECRET_KEY || "";

// ---------- 工具函数 ----------

/** 格式化日期为 yyyy-MM-dd HH:mm:ss */
function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 生成 JD Union API 签名 */
function sign(params: Record<string, string>, secretKey: string): string {
  const sorted = Object.keys(params).sort();
  let baseString = secretKey;
  for (const k of sorted) {
    baseString += k + params[k];
  }
  baseString += secretKey;
  return createHash("md5").update(baseString, "utf8").digest("hex").toUpperCase();
}

/** 调用京东联盟 API */
async function callJdUnionApi<T = any>(
  method: string,
  bizParams: Record<string, any>
): Promise<T> {
  if (!JD_APP_KEY || !JD_SECRET_KEY) {
    throw new Error("JD Union API 凭证未配置 (JD_UNION_APP_KEY / JD_UNION_SECRET_KEY)");
  }

  const systemParams: Record<string, string> = {
    method,
    app_key: JD_APP_KEY,
    timestamp: formatTimestamp(new Date()),
    format: "json",
    v: "1.0",
    sign_method: "md5",
    param_json: JSON.stringify(bizParams),
  };

  systemParams.sign = sign(systemParams, JD_SECRET_KEY);

  // 拼装 URL
  const qs = Object.entries(systemParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const url = `${JD_API_ENDPOINT}?${qs}`;

  const res = await fetchWithTimeout(url, { timeout: 20000 });
  const text = await res.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`JD API 返回非 JSON: ${text.slice(0, 200)}`);
  }

  // 错误处理
  if (json.error_response) {
    const err = json.error_response;
    throw new Error(`JD API 错误 [${err.code}]: ${err.zh_desc || err.en_desc || JSON.stringify(err)}`);
  }

  // 解析响应字段: method 名称中的 . 替换为 _ 再加 _response
  const responseField = `${method.replace(/\./g, "_")}_response`;
  const responseData = json[responseField];

  if (!responseData) {
    throw new Error(`JD API 响应缺少字段 ${responseField}: ${JSON.stringify(json).slice(0, 300)}`);
  }

  // result 字段是 JSON 字符串，需要二次解析
  if (typeof responseData.result === "string") {
    return JSON.parse(responseData.result) as T;
  }

  return responseData as T;
}

// ---------- 商品搜索 ----------

export interface JdGoodsResult {
  totalCount: number;
  data: JdGoodsItem[];
}

export interface JdGoodsItem {
  skuId: number;
  skuName: string;
  /** 无线价（到手价） */
  wlPrice: number;
  /** PC 价 */
  pcPrice: number;
  /** 最低价 */
  lowestPrice: number;
  /** 最低券后价 */
  lowestCouponPrice: number;
  /** 店铺名称 */
  shopName: string;
  /** 品牌名称 */
  brandName: string;
  /** 一级类目 */
  cid1Name: string;
  /** 二级类目 */
  cid2Name: string;
  /** 商品图片 */
  imageUrl: string;
  /** 好评率 */
  goodCommentsShare: number;
  /** 30天引入订单量 */
  inOrderCount30Days: number;
  /** 佣金比例 */
  commissionShare: number;
  /** 商品详情页链接 */
  materialUrl: string;
}

/**
 * 搜索京东商品
 * @param keyword 搜索关键词
 * @param pageSize 每页条数（1~50，默认10）
 * @param pageIndex 页码（从1开始）
 */
export async function searchJdGoods(
  keyword: string,
  pageSize = 10,
  pageIndex = 1
): Promise<JdGoodsResult> {
  const resp = await callJdUnionApi<any>("jd.union.open.goods.query", {
    goodsReqDTO: {
      keyword,
      pageSize,
      pageIndex,
      sortName: "price",      // 按价格排序
      sort: "asc",            // 升序
      isHot: 1,               // 爆款优先
      isPG: 0,
      isCoupon: 0,
    },
  });

  if (resp.code !== 200 && resp.code !== undefined) {
    // code=200 表示成功，其他可能是 "暂无数据" 等
    if (resp.code === 404 || resp.message?.includes("暂无")) {
      return { totalCount: 0, data: [] };
    }
    throw new Error(`JD goods query 错误 [${resp.code}]: ${resp.message}`);
  }

  const rawList: any[] = resp.data || [];
  const totalCount: number = resp.totalCount || rawList.length;

  const data: JdGoodsItem[] = rawList.map((item: any) => {
    const priceInfo = item.priceInfo || {};
    const shopInfo = item.shopInfo || {};
    const categoryInfo = item.categoryInfo || {};
    const imageInfo = item.imageInfo || {};
    const commissionInfo = item.commissionInfo || {};

    return {
      skuId: item.skuId || 0,
      skuName: item.skuName || "",
      wlPrice: parseFloat(priceInfo.lowestPrice || priceInfo.price || "0"),
      pcPrice: parseFloat(priceInfo.price || "0"),
      lowestPrice: parseFloat(priceInfo.lowestPrice || priceInfo.price || "0"),
      lowestCouponPrice: parseFloat(priceInfo.lowestCouponPrice || priceInfo.lowestPrice || priceInfo.price || "0"),
      shopName: shopInfo.shopName || "",
      brandName: item.brandName || "",
      cid1Name: categoryInfo.cid1Name || "",
      cid2Name: categoryInfo.cid2Name || "",
      imageUrl: imageInfo.imageList?.[0]?.url || "",
      goodCommentsShare: parseFloat(item.goodCommentsShare || "0"),
      inOrderCount30Days: item.inOrderCount30Days || 0,
      commissionShare: parseFloat(commissionInfo.commissionShare || "0"),
      materialUrl: item.materialUrl || `https://item.jd.com/${item.skuId}.html`,
    };
  });

  return { totalCount, data };
}

/**
 * 按 SKU ID 批量查询商品信息
 * @param skuIds SKU ID 列表（最多100个）
 */
export async function queryJdGoodsBySkuIds(skuIds: number[]): Promise<JdGoodsItem[]> {
  if (skuIds.length === 0) return [];

  const resp = await callJdUnionApi<any>("jd.union.open.goods.query", {
    goodsReqDTO: {
      skuIds: skuIds.slice(0, 100),
      pageSize: skuIds.length,
      pageIndex: 1,
    },
  });

  if (resp.code !== 200 && resp.code !== undefined) {
    if (resp.code === 404) return [];
    throw new Error(`JD goods query 错误 [${resp.code}]: ${resp.message}`);
  }

  const rawList: any[] = resp.data || [];
  return rawList.map((item: any) => {
    const priceInfo = item.priceInfo || {};
    const shopInfo = item.shopInfo || {};
    const categoryInfo = item.categoryInfo || {};
    const imageInfo = item.imageInfo || {};
    const commissionInfo = item.commissionInfo || {};

    return {
      skuId: item.skuId || 0,
      skuName: item.skuName || "",
      wlPrice: parseFloat(priceInfo.lowestPrice || priceInfo.price || "0"),
      pcPrice: parseFloat(priceInfo.price || "0"),
      lowestPrice: parseFloat(priceInfo.lowestPrice || priceInfo.price || "0"),
      lowestCouponPrice: parseFloat(priceInfo.lowestCouponPrice || priceInfo.lowestPrice || priceInfo.price || "0"),
      shopName: shopInfo.shopName || "",
      brandName: item.brandName || "",
      cid1Name: categoryInfo.cid1Name || "",
      cid2Name: categoryInfo.cid2Name || "",
      imageUrl: imageInfo.imageList?.[0]?.url || "",
      goodCommentsShare: parseFloat(item.goodCommentsShare || "0"),
      inOrderCount30Days: item.inOrderCount30Days || 0,
      commissionShare: parseFloat(commissionInfo.commissionShare || "0"),
      materialUrl: item.materialUrl || `https://item.jd.com/${item.skuId}.html`,
    };
  });
}

/**
 * 健康检查：测试 API 凭证是否有效
 */
export async function testJdApiConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    if (!JD_APP_KEY || !JD_SECRET_KEY) {
      return { ok: false, message: "缺少 JD_UNION_APP_KEY 或 JD_UNION_SECRET_KEY 环境变量" };
    }
    const result = await searchJdGoods("手机", 1, 1);
    return {
      ok: true,
      message: `API 连接成功，测试搜索返回 ${result.totalCount} 条结果`,
    };
  } catch (err: any) {
    return { ok: false, message: `API 连接失败: ${err.message}` };
  }
}
