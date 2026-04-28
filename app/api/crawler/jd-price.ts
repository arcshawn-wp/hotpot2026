import { fetchWithTimeout } from "./lib";

// ============================================================
// 京东商品价格查询 — 基于第三方代理接口
// 接口地址：http://8.210.105.105/index/index/jdtest
// 输入：京东商品 URL → 输出：商品名称、价格、图片等
// 返回格式：PHP print_r（非JSON），需正则解析
// 注意：接口有频率限制，请求间隔建议 ≥ 8 秒
// ============================================================

// ---------- 配置 ----------
const JD_PROXY_ENDPOINT = process.env.JD_PROXY_URL || "http://8.210.105.105/index/index/jdtest";
const JD_PROXY_USERID = process.env.JD_PROXY_USERID || "5";
const JD_PROXY_USERNAME = process.env.JD_PROXY_USERNAME || "jdtest";
const JD_PROXY_PASSWORD = process.env.JD_PROXY_PASSWORD || "jdtesta7s45d";
const JD_PROXY_SIGNTIME = process.env.JD_PROXY_SIGNTIME || "48e3ec5a29b07a7c2fa6e6f197bdb1cb";

// ---------- 商品 → 京东链接映射表 ----------
// productId → JD 商品页 URL
export const PRODUCT_JD_URL_MAP: Record<string, string> = {
  p001: "https://item.jd.com/100038283811.html",   // 方太油烟机灶具套装
  p002: "https://item.jd.com/100010985612.html",   // 美的嵌入式蒸烤一体机
  p003: "https://item.jd.com/100140401824.html",   // 石头扫拖机器人G20S
  p004: "https://item.jd.com/100105043928.html",   // 戴森吸尘器V15
  p005: "https://item.jd.com/100015760597.html",   // 蓝盒子床垫Z1
  p006: "https://item.jd.com/5776918.html",        // 德业除湿机DYD-T22A3
  p007: "https://item.jd.com/10195578374244.html",  // 海尔烘干机EHG100
  p008: "https://item.jd.com/100010903651.html",   // 除湿袋/除湿盒套装
  p009: "https://item.jd.com/100025432314.html",   // 北鼎养生壶K108
  p010: "https://item.jd.com/100151115438.html",   // 小熊电炖锅
  p011: "https://item.jd.com/100048259196.html",   // SKG颈椎按摩仪
  p012: "https://item.jd.com/100039722916.html",   // 松下负离子吹风机
  p013: "https://item.jd.com/100041029333.html",   // 太力真空收纳袋套装
  p014: "https://item.jd.com/100091651631.html",   // 小米除螨仪
  p015: "https://item.jd.com/100022939492.html",   // 立邦乳胶漆 18L
  p016: "https://item.jd.com/100170014877.html",   // 欧普LED吸顶灯
  p017: "https://item.jd.com/100013584763.html",   // 小米空气净化器4Pro
  p018: "https://item.jd.com/10098004002778.html",  // 格力空调1.5匹
  p019: "https://item.jd.com/10021728009191.html",  // 美的电热水壶
  p020: "https://item.jd.com/10203521991160.html",  // 宜家收纳箱套装
};

// ---------- 类型定义 ----------

export interface JdPriceResult {
  success: boolean;
  /** 京东商品ID */
  jdId: string;
  /** 京东上的商品名称 */
  jdName: string;
  /** 当前价格 */
  price: number;
  /** 商品主图 */
  imageUrl: string;
  /** 原始京东链接 */
  jdUrl: string;
  /** 错误信息 */
  error?: string;
}

// ---------- 解析 PHP print_r 输出 ----------

function extractField(text: string, field: string): string {
  // 匹配 [field] => value 格式
  const regex = new RegExp(`\\[${field}\\] => (.+)`, "m");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function extractCode(text: string): number {
  const val = extractField(text, "code");
  return val ? parseInt(val, 10) : 0;
}

// ---------- 核心查询函数 ----------

/**
 * 查询单个京东商品的价格
 * @param jdUrl 京东商品页 URL（如 https://item.jd.com/5776918.html）
 */
export async function queryJdPrice(jdUrl: string): Promise<JdPriceResult> {
  const encodedUrl = encodeURIComponent(jdUrl);

  const apiUrl =
    `${JD_PROXY_ENDPOINT}?url=${encodedUrl}` +
    `&userid=${JD_PROXY_USERID}` +
    `&username=${JD_PROXY_USERNAME}` +
    `&password=${JD_PROXY_PASSWORD}` +
    `&sign=test` +
    `&signtime=${JD_PROXY_SIGNTIME}`;

  const res = await fetchWithTimeout(apiUrl, { timeout: 20000 });
  const text = await res.text();

  // 检查错误
  if (text.includes("服务器响应错误") || text.includes("已到期") || text.includes("请续费")) {
    return {
      success: false,
      jdId: "",
      jdName: "",
      price: 0,
      imageUrl: "",
      jdUrl,
      error: "接口服务异常或已到期",
    };
  }

  const code = extractCode(text);
  if (code !== 200) {
    const msg = extractField(text, "msg");
    return {
      success: false,
      jdId: "",
      jdName: "",
      price: 0,
      imageUrl: "",
      jdUrl,
      error: `API 返回 code=${code}, msg=${msg || "unknown"}`,
    };
  }

  const id = extractField(text, "id");
  const name = extractField(text, "name");
  const priceStr = extractField(text, "price");
  const images = extractField(text, "images");

  const price = parseFloat(priceStr);

  if (!name || isNaN(price)) {
    return {
      success: false,
      jdId: id,
      jdName: name,
      price: 0,
      imageUrl: images,
      jdUrl,
      error: "解析失败：name 或 price 缺失",
    };
  }

  return {
    success: true,
    jdId: id,
    jdName: name,
    price,
    imageUrl: images,
    jdUrl,
  };
}

/**
 * 健康检查：测试接口是否可用
 */
export async function testJdProxyConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    // 用德业除湿机做测试（已确认可用）
    const result = await queryJdPrice("https://item.jd.com/5776918.html");
    if (result.success) {
      return {
        ok: true,
        message: `接口可用 — ${result.jdName.slice(0, 30)} ¥${result.price}`,
      };
    }
    return { ok: false, message: `接口异常: ${result.error}` };
  } catch (err: any) {
    return { ok: false, message: `连接失败: ${err.message}` };
  }
}
