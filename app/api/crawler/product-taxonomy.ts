// ============================================================
// 商品品类词典 — 数据驱动选品的核心知识库
// 包含：直接产品关键词、上下文触发词、天气/节气/节日映射
// ============================================================

// ---------- 品类 → 产品关键词映射 ----------
// 当热搜标题命中这些词时，直接关联到对应品类

export interface CategoryKeywords {
  category: string;
  subCategory: string;
  /** 直接产品词：命中即代表用户在搜/讨论这类产品 */
  directKeywords: string[];
  /** 关联词：间接暗示需求（如"发霉"→除湿品类） */
  contextKeywords: string[];
  /** 该品类的基础权重（1-5），高频刚需品类给高权重 */
  baseWeight: number;
}

export const CATEGORY_TAXONOMY: CategoryKeywords[] = [
  // ===== 大家电 =====
  {
    category: "大家电",
    subCategory: "厨电",
    directKeywords: ["油烟机", "灶具", "烟灶", "蒸烤", "蒸烤一体", "烤箱", "洗碗机", "微波炉", "集成灶", "燃气灶"],
    contextKeywords: ["厨房改造", "新厨房", "开放式厨房", "厨电", "厨房装修"],
    baseWeight: 4,
  },
  {
    category: "大家电",
    subCategory: "除湿",
    directKeywords: ["除湿机", "除湿器", "抽湿机", "工业除湿"],
    contextKeywords: ["回南天", "梅雨", "潮湿", "发霉", "墙壁冒水", "衣服不干", "地板返潮"],
    baseWeight: 4,
  },
  {
    category: "大家电",
    subCategory: "烘干",
    directKeywords: ["烘干机", "干衣机", "洗烘一体", "热泵烘干"],
    contextKeywords: ["衣服晾不干", "阴雨天", "梅雨季", "晾衣", "烘衣"],
    baseWeight: 4,
  },
  {
    category: "大家电",
    subCategory: "空调",
    directKeywords: ["空调", "中央空调", "移动空调", "挂机", "柜机", "风管机"],
    contextKeywords: ["高温", "热浪", "酷暑", "降温", "制冷", "闷热", "38度", "40度"],
    baseWeight: 5,
  },
  {
    category: "大家电",
    subCategory: "冰箱",
    directKeywords: ["冰箱", "冰柜", "迷你冰箱", "对开门冰箱"],
    contextKeywords: ["保鲜", "囤货", "食材存储"],
    baseWeight: 3,
  },
  {
    category: "大家电",
    subCategory: "洗衣机",
    directKeywords: ["洗衣机", "波轮洗衣机", "滚筒洗衣机", "壁挂洗衣机"],
    contextKeywords: ["洗衣", "衣物清洗"],
    baseWeight: 3,
  },
  // ===== 智能设备 =====
  {
    category: "智能设备",
    subCategory: "清洁",
    directKeywords: ["扫地机", "扫地机器人", "吸尘器", "洗地机", "擦窗机", "拖地机"],
    contextKeywords: ["懒人神器", "智能清洁", "全屋清洁", "解放双手", "打扫卫生"],
    baseWeight: 5,
  },
  {
    category: "智能设备",
    subCategory: "净化",
    directKeywords: ["空气净化器", "新风机", "新风系统", "除甲醛"],
    contextKeywords: ["雾霾", "PM2.5", "甲醛", "装修污染", "空气质量"],
    baseWeight: 3,
  },
  {
    category: "智能设备",
    subCategory: "安防",
    directKeywords: ["智能门锁", "指纹锁", "摄像头", "智能门铃", "猫眼"],
    contextKeywords: ["安全", "防盗", "智能家居"],
    baseWeight: 2,
  },
  // ===== 小家电 =====
  {
    category: "小家电",
    subCategory: "厨电",
    directKeywords: ["养生壶", "电炖锅", "热水壶", "豆浆机", "破壁机", "榨汁机", "电饭煲", "空气炸锅", "电磁炉", "电火锅"],
    contextKeywords: ["养生", "煲汤", "炖补", "早餐机", "厨房小家电"],
    baseWeight: 3,
  },
  {
    category: "小家电",
    subCategory: "个护",
    directKeywords: ["按摩仪", "颈椎按摩", "筋膜枪", "吹风机", "美容仪", "电动牙刷", "剃须刀", "脱毛仪"],
    contextKeywords: ["送妈妈", "母亲节礼物", "父亲节礼物", "送长辈", "颈椎病", "肩颈", "护发"],
    baseWeight: 4,
  },
  {
    category: "小家电",
    subCategory: "清洁",
    directKeywords: ["除螨仪", "挂烫机", "蒸汽拖把"],
    contextKeywords: ["螨虫", "过敏", "床上清洁", "深层清洁"],
    baseWeight: 3,
  },
  {
    category: "小家电",
    subCategory: "环境",
    directKeywords: ["加湿器", "暖风机", "电暖器", "取暖器", "小太阳", "电风扇", "塔扇", "空气循环扇"],
    contextKeywords: ["干燥", "取暖", "降温", "通风"],
    baseWeight: 3,
  },
  // ===== 家居软装 =====
  {
    category: "家居软装",
    subCategory: "家纺",
    directKeywords: ["床垫", "枕头", "乳胶枕", "四件套", "被子", "蚕丝被", "凉席"],
    contextKeywords: ["睡眠", "失眠", "换季", "床品"],
    baseWeight: 3,
  },
  {
    category: "家居软装",
    subCategory: "收纳",
    directKeywords: ["收纳箱", "收纳袋", "真空袋", "衣柜收纳", "鞋柜", "置物架"],
    contextKeywords: ["断舍离", "整理", "换季收纳", "衣物整理", "空间利用"],
    baseWeight: 2,
  },
  {
    category: "家居软装",
    subCategory: "防潮",
    directKeywords: ["除湿袋", "除湿盒", "防潮箱", "干燥剂"],
    contextKeywords: ["衣柜发霉", "鞋子发霉", "包包发霉"],
    baseWeight: 2,
  },
  // ===== 家装建材 =====
  {
    category: "家装建材",
    subCategory: "硬装",
    directKeywords: ["乳胶漆", "瓷砖", "地板", "木地板", "墙纸", "壁纸", "美缝"],
    contextKeywords: ["装修", "翻新", "刷墙", "铺地"],
    baseWeight: 3,
  },
  {
    category: "家装建材",
    subCategory: "灯具",
    directKeywords: ["吸顶灯", "台灯", "落地灯", "灯带", "射灯", "筒灯", "氛围灯"],
    contextKeywords: ["灯光", "照明", "护眼"],
    baseWeight: 2,
  },
  {
    category: "家装建材",
    subCategory: "卫浴",
    directKeywords: ["马桶", "智能马桶", "花洒", "浴室柜", "浴霸"],
    contextKeywords: ["卫浴", "卫生间改造", "浴室装修"],
    baseWeight: 3,
  },
];

// ---------- 天气 → 品类触发映射 ----------
// 当天气出现某些条件时，对应品类的需求会上升

export interface WeatherTrigger {
  /** 天气条件匹配词（匹配 weather.condition 或 weather.tip） */
  conditionKeywords: string[];
  /** 湿度阈值（高于此值触发） */
  humidityAbove?: number;
  /** 温度阈值（高于此值触发） */
  tempAbove?: number;
  /** 温度阈值（低于此值触发） */
  tempBelow?: number;
  /** 触发的品类 [category, subCategory] */
  targetCategories: Array<[string, string]>;
  /** 加分 */
  bonus: number;
}

export const WEATHER_TRIGGERS: WeatherTrigger[] = [
  {
    conditionKeywords: ["回南天", "潮湿", "大雨", "暴雨", "阵雨", "小雨", "中雨"],
    humidityAbove: 75,
    targetCategories: [
      ["大家电", "除湿"],
      ["大家电", "烘干"],
      ["家居软装", "防潮"],
    ],
    bonus: 20,
  },
  {
    conditionKeywords: ["晴", "高温", "热"],
    tempAbove: 30,
    targetCategories: [
      ["大家电", "空调"],
      ["小家电", "环境"],
    ],
    bonus: 15,
  },
  {
    conditionKeywords: ["寒冷", "降温", "冰冻", "雪"],
    tempBelow: 10,
    targetCategories: [
      ["小家电", "环境"],
    ],
    bonus: 15,
  },
  {
    conditionKeywords: ["雾", "霾", "沙尘"],
    targetCategories: [
      ["智能设备", "净化"],
    ],
    bonus: 20,
  },
  {
    conditionKeywords: ["干燥"],
    humidityAbove: undefined,
    targetCategories: [
      ["小家电", "环境"],
    ],
    bonus: 10,
  },
];

// ---------- 节气/节日 → 品类触发映射 ----------

export interface SeasonalTrigger {
  /** 触发名称（节气名/节日名） */
  name: string;
  /** 匹配关键词 */
  keywords: string[];
  /** 触发的品类 */
  targetCategories: Array<[string, string]>;
  /** 加分 */
  bonus: number;
}

export const SEASONAL_TRIGGERS: SeasonalTrigger[] = [
  // 节气
  { name: "谷雨", keywords: ["谷雨", "养生", "春茶"], targetCategories: [["小家电", "厨电"]], bonus: 10 },
  { name: "立夏", keywords: ["立夏", "入夏"], targetCategories: [["大家电", "空调"], ["小家电", "环境"]], bonus: 15 },
  { name: "小满", keywords: ["小满"], targetCategories: [["大家电", "除湿"], ["大家电", "烘干"]], bonus: 10 },
  { name: "芒种", keywords: ["芒种", "梅雨"], targetCategories: [["大家电", "除湿"], ["大家电", "烘干"]], bonus: 15 },
  { name: "夏至", keywords: ["夏至", "酷暑"], targetCategories: [["大家电", "空调"]], bonus: 15 },
  { name: "小暑", keywords: ["小暑", "三伏"], targetCategories: [["大家电", "空调"], ["家居软装", "家纺"]], bonus: 15 },
  { name: "立秋", keywords: ["立秋", "秋天"], targetCategories: [["家居软装", "家纺"], ["家居软装", "收纳"]], bonus: 10 },
  { name: "白露", keywords: ["白露", "换季"], targetCategories: [["家居软装", "收纳"], ["小家电", "清洁"]], bonus: 10 },
  { name: "立冬", keywords: ["立冬", "入冬"], targetCategories: [["小家电", "环境"]], bonus: 15 },

  // 节日
  { name: "春节", keywords: ["春节", "过年", "年货"], targetCategories: [["小家电", "厨电"], ["大家电", "冰箱"]], bonus: 20 },
  { name: "情人节", keywords: ["情人节", "214", "送女友"], targetCategories: [["小家电", "个护"]], bonus: 15 },
  { name: "三八", keywords: ["三八", "妇女节", "女神节", "38"], targetCategories: [["小家电", "个护"]], bonus: 15 },
  { name: "五一", keywords: ["五一", "劳动节", "51"], targetCategories: [["智能设备", "清洁"], ["大家电", "空调"]], bonus: 20 },
  { name: "618", keywords: ["618", "年中大促"], targetCategories: [["大家电", "空调"], ["智能设备", "清洁"]], bonus: 25 },
  { name: "母亲节", keywords: ["母亲节", "送妈妈", "感恩母亲"], targetCategories: [["小家电", "个护"], ["小家电", "厨电"]], bonus: 20 },
  { name: "父亲节", keywords: ["父亲节", "送爸爸"], targetCategories: [["小家电", "个护"]], bonus: 15 },
  { name: "双十一", keywords: ["双十一", "1111", "双11", "购物节"], targetCategories: [["大家电", "空调"], ["智能设备", "清洁"], ["大家电", "洗衣机"]], bonus: 25 },
  { name: "双十二", keywords: ["双十二", "1212", "双12"], targetCategories: [["小家电", "厨电"], ["家居软装", "家纺"]], bonus: 15 },
  { name: "装修季", keywords: ["装修", "春季装修", "金三银四", "新房"], targetCategories: [["大家电", "厨电"], ["家装建材", "硬装"], ["家装建材", "灯具"], ["家装建材", "卫浴"]], bonus: 20 },
];

// ---------- 工具函数 ----------

/**
 * 在文本中查找所有匹配的品类
 * 返回匹配到的品类及命中的关键词
 */
export function matchCategories(
  text: string
): Array<{
  category: string;
  subCategory: string;
  matchedKeyword: string;
  matchType: "direct" | "context";
  baseWeight: number;
}> {
  const results: Array<{
    category: string;
    subCategory: string;
    matchedKeyword: string;
    matchType: "direct" | "context";
    baseWeight: number;
  }> = [];

  const lowerText = text.toLowerCase();

  for (const cat of CATEGORY_TAXONOMY) {
    // 先匹配直接关键词（权重更高）
    for (const kw of cat.directKeywords) {
      if (lowerText.includes(kw.toLowerCase())) {
        results.push({
          category: cat.category,
          subCategory: cat.subCategory,
          matchedKeyword: kw,
          matchType: "direct",
          baseWeight: cat.baseWeight,
        });
        break; // 一个品类只记录一次
      }
    }

    // 再匹配上下文关键词
    if (!results.some((r) => r.category === cat.category && r.subCategory === cat.subCategory)) {
      for (const kw of cat.contextKeywords) {
        if (lowerText.includes(kw.toLowerCase())) {
          results.push({
            category: cat.category,
            subCategory: cat.subCategory,
            matchedKeyword: kw,
            matchType: "context",
            baseWeight: cat.baseWeight,
          });
          break;
        }
      }
    }
  }

  return results;
}

/**
 * 判断当前天气是否触发某些品类的加分
 */
export function getWeatherBonuses(weather: {
  condition: string;
  humidity: number;
  temperature: number;
  tip: string;
}): Map<string, number> {
  const bonusMap = new Map<string, number>(); // key: "category|subCategory"

  for (const trigger of WEATHER_TRIGGERS) {
    let triggered = false;

    // 检查天气条件词
    const weatherText = `${weather.condition} ${weather.tip}`.toLowerCase();
    if (trigger.conditionKeywords.some((kw) => weatherText.includes(kw.toLowerCase()))) {
      triggered = true;
    }

    // 检查湿度阈值
    if (trigger.humidityAbove && weather.humidity > trigger.humidityAbove) {
      triggered = true;
    }

    // 检查温度阈值
    if (trigger.tempAbove && weather.temperature > trigger.tempAbove) {
      triggered = true;
    }
    if (trigger.tempBelow && weather.temperature < trigger.tempBelow) {
      triggered = true;
    }

    if (triggered) {
      for (const [cat, sub] of trigger.targetCategories) {
        const key = `${cat}|${sub}`;
        bonusMap.set(key, Math.max(bonusMap.get(key) || 0, trigger.bonus));
      }
    }
  }

  return bonusMap;
}

/**
 * 判断当前日期/热搜是否触发节气/节日加分
 */
export function getSeasonalBonuses(
  solarTerm: string,
  allKeywords: string[]
): Map<string, number> {
  const bonusMap = new Map<string, number>();
  const combinedText = allKeywords.join(" ").toLowerCase();

  for (const trigger of SEASONAL_TRIGGERS) {
    // 匹配当前节气名
    const matchesTerm = trigger.keywords.some(
      (kw) => solarTerm.includes(kw) || combinedText.includes(kw.toLowerCase())
    );

    if (matchesTerm) {
      for (const [cat, sub] of trigger.targetCategories) {
        const key = `${cat}|${sub}`;
        bonusMap.set(key, Math.max(bonusMap.get(key) || 0, trigger.bonus));
      }
    }
  }

  return bonusMap;
}
