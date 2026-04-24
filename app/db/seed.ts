import { getDb } from "../api/queries/connection";
import {
  hotspots,
  platformDiscussions,
  products,
  hotspotProducts,
  scripts,
  dailySnapshots,
} from "./schema";

async function seed() {
  const db = getDb();
  console.log("🌱 Seeding database...");

  // Clear existing
  await db.delete(platformDiscussions);
  await db.delete(hotspotProducts);
  await db.delete(scripts);
  await db.delete(products);
  await db.delete(hotspots);
  await db.delete(dailySnapshots);

  // ====== Hotspots ======
  const hotspotData = [
    {
      hotspotId: "hotspot-001",
      dimension: "renovation",
      title: "金三银四·春季装修旺季",
      description: "春季家装最后冲刺，厨卫电器/软装/工具需求集中爆发",
      heatLevel: 5,
      heatScore: 92,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-05-10"),
      metricLabel: "装修订单",
      metricValue: "+128%",
      metricDirection: "up",
      scriptTemplate: "家人们，春季装修旺季最后机会了！这套{name}今天直播间骨折价，错过等明年！",
      trend: [55, 62, 70, 78, 85, 90, 92],
    },
    {
      hotspotId: "hotspot-002",
      dimension: "holiday",
      title: "五一劳动节大促",
      description: "5天长假+装修季+换季需求，家电家居消费年度高峰",
      heatLevel: 5,
      heatScore: 95,
      startDate: new Date("2026-04-20"),
      endDate: new Date("2026-05-05"),
      metricLabel: "预计流量",
      metricValue: "↑280%",
      metricDirection: "up",
      scriptTemplate: "五一大促来了！{name}今天直播间专属价，比平时便宜好几百，仅限今天！",
      trend: [50, 58, 68, 78, 88, 92, 95],
    },
    {
      hotspotId: "hotspot-003",
      dimension: "weather",
      title: "回南天·除湿防潮",
      description: "华南进入回南天高峰期，除湿机/烘干机/防潮用品需求暴增",
      heatLevel: 4,
      heatScore: 85,
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-05-10"),
      metricLabel: "除湿机搜索",
      metricValue: "+156%",
      metricDirection: "up",
      scriptTemplate: "回南天来了家人们！{name}今天必须安排上，不然衣服全发霉！",
      trend: [35, 45, 58, 68, 78, 82, 85],
    },
    {
      hotspotId: "hotspot-004",
      dimension: "solar_term",
      title: "谷雨·春季养生",
      description: "谷雨节气，养生壶/茶具/厨电焕新需求上升",
      heatLevel: 4,
      heatScore: 72,
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-05-05"),
      metricLabel: "养生壶搜索",
      metricValue: "+45%",
      metricDirection: "up",
      scriptTemplate: "谷雨养生季，{name}今天给你们安排上了！春季调理身体正合适！",
      trend: [45, 50, 55, 60, 66, 70, 72],
    },
    {
      hotspotId: "hotspot-005",
      dimension: "holiday",
      title: "母亲节送礼季",
      description: "5月10日母亲节，个护健康/厨房电器/家居礼品需求高峰",
      heatLevel: 4,
      heatScore: 80,
      startDate: new Date("2026-04-25"),
      endDate: new Date("2026-05-12"),
      metricLabel: "礼品搜索",
      metricValue: "+210%",
      metricDirection: "up",
      scriptTemplate: "母亲节倒计时！{name}送给妈妈，比发红包更有心意！",
      trend: [30, 38, 50, 62, 70, 76, 80],
    },
    {
      hotspotId: "hotspot-006",
      dimension: "trend",
      title: "春季换季收纳",
      description: "春季焕新，收纳整理/除螨/空气净化需求上升",
      heatLevel: 3,
      heatScore: 58,
      startDate: new Date("2026-04-10"),
      endDate: new Date("2026-05-05"),
      metricLabel: "收纳搜索",
      metricValue: "+38%",
      metricDirection: "up",
      scriptTemplate: "春天来了该换季了！{name}帮你把冬装收得整整齐齐，衣柜瞬间大一倍！",
      trend: [30, 35, 42, 48, 52, 55, 58],
    },
  ];

  await db.insert(hotspots).values(hotspotData);
  console.log(`  ✓ Inserted ${hotspotData.length} hotspots`);

  // ====== Products ======
  const productData = [
    { productId: "p001", name: "方太油烟机灶具套装", category: "大家电", subCategory: "厨电", specs: "变频23m³ | 开放式厨房", price: "4599.00", heatScore: 90, heatLevel: 5, reason: "春季装修标配", dimension: "renovation", sourceHotspot: "金三银四·春季装修旺季", scriptCount: 5 },
    { productId: "p002", name: "美的嵌入式蒸烤一体机", category: "大家电", subCategory: "厨电", specs: "50L | 蒸烤炸一体", price: "3299.00", heatScore: 85, heatLevel: 4, reason: "新厨电趋势", dimension: "renovation", sourceHotspot: "金三银四·春季装修旺季", scriptCount: 4 },
    { productId: "p003", name: "石头扫拖机器人G20S", category: "智能设备", subCategory: "清洁", specs: "扫拖洗烘 | AI避障", price: "3299.00", heatScore: 94, heatLevel: 5, reason: "五一爆款", dimension: "holiday", sourceHotspot: "五一劳动节大促", script: "五一放假谁想打扫卫生？这台石头扫地机器人，吸拖洗烘一体，真正解放双手！今天立减800！", scriptCount: 5 },
    { productId: "p004", name: "戴森吸尘器V15", category: "智能设备", subCategory: "清洁", specs: "激光探测 | 60分钟续航", price: "4499.00", heatScore: 88, heatLevel: 4, reason: "换季清洁刚需", dimension: "holiday", sourceHotspot: "五一劳动节大促", scriptCount: 4 },
    { productId: "p005", name: "蓝盒子床垫Z1", category: "家居软装", subCategory: "家纺", specs: "记忆棉 | 100天试睡", price: "2799.00", heatScore: 82, heatLevel: 4, reason: "五一焕新家", dimension: "holiday", sourceHotspot: "五一劳动节大促", scriptCount: 3 },
    { productId: "p006", name: "德业除湿机DYD-T22A3", category: "大家电", subCategory: "除湿", specs: "22L/天 | 全屋除湿", price: "1299.00", heatScore: 93, heatLevel: 5, reason: "回南天刚需", dimension: "weather", sourceHotspot: "回南天·除湿防潮", script: "回南天来了！墙壁冒水珠、衣服发霉对不对？这台德业22L除湿机，两小时抽满一箱水，全屋干爽！", scriptCount: 4 },
    { productId: "p007", name: "海尔烘干机EHG100", category: "大家电", subCategory: "烘干", specs: "10KG | 热泵柔烘", price: "3299.00", heatScore: 87, heatLevel: 4, reason: "衣物烘干刚需", dimension: "weather", sourceHotspot: "回南天·除湿防潮", scriptCount: 3 },
    { productId: "p008", name: "除湿袋/除湿盒套装", category: "家居软装", subCategory: "防潮", specs: "20袋装 | 衣柜/抽屉", price: "39.00", heatScore: 72, heatLevel: 3, reason: "低成本防潮", dimension: "weather", sourceHotspot: "回南天·除湿防潮", scriptCount: 2 },
    { productId: "p009", name: "北鼎养生壶K108", category: "小家电", subCategory: "厨电", specs: "1.5L | 煮炖一体", price: "898.00", heatScore: 78, heatLevel: 4, reason: "谷雨养生", dimension: "solar_term", sourceHotspot: "谷雨·春季养生", script: "谷雨养生正当时！这台北鼎养生壶，煮花茶炖燕窝样样行，办公室放一台，每天提醒自己多喝水！", scriptCount: 3 },
    { productId: "p010", name: "小熊电炖锅", category: "小家电", subCategory: "厨电", specs: "2L | 隔水柔炖", price: "199.00", heatScore: 65, heatLevel: 3, reason: "春季滋补", dimension: "solar_term", sourceHotspot: "谷雨·春季养生", scriptCount: 2 },
    { productId: "p011", name: "SKG颈椎按摩仪", category: "小家电", subCategory: "个护", specs: "热敷+脉冲 | 9档力度", price: "399.00", heatScore: 86, heatLevel: 4, reason: "母亲节送礼", dimension: "holiday", sourceHotspot: "母亲节送礼季", script: "母亲节礼物准备好了吗？这款SKG按摩仪，妈妈刷完碗往脖子上一挂，热敷+脉冲双效，比去按摩店划算多了！", scriptCount: 4 },
    { productId: "p012", name: "松下负离子吹风机", category: "小家电", subCategory: "个护", specs: "纳诺怡 | 速干护发", price: "699.00", heatScore: 80, heatLevel: 4, reason: "母亲节送礼", dimension: "holiday", sourceHotspot: "母亲节送礼季", scriptCount: 3 },
    { productId: "p013", name: "太力真空收纳袋套装", category: "家居软装", subCategory: "收纳", specs: "11件套 | 免抽气", price: "69.00", heatScore: 68, heatLevel: 3, reason: "换季收纳", dimension: "trend", sourceHotspot: "春季换季收纳", scriptCount: 2 },
    { productId: "p014", name: "小米除螨仪", category: "小家电", subCategory: "清洁", specs: "UV-C杀菌 | 12000次/分", price: "299.00", heatScore: 62, heatLevel: 3, reason: "春季除螨", dimension: "trend", sourceHotspot: "春季换季收纳", scriptCount: 2 },
    { productId: "p015", name: "立邦乳胶漆 18L", category: "家装建材", subCategory: "硬装", specs: "净味环保 | 18L大桶", price: "468.00", heatScore: 72, heatLevel: 3, reason: "春季家装标配", dimension: "renovation", sourceHotspot: "金三银四·春季装修旺季", scriptCount: 3 },
    { productId: "p016", name: "欧普LED吸顶灯", category: "家装建材", subCategory: "灯具", specs: "36W | 三色调光", price: "159.00", heatScore: 58, heatLevel: 3, reason: "春季家装灯具焕新", dimension: "renovation", sourceHotspot: "金三银四·春季装修旺季", scriptCount: 2 },
    { productId: "p017", name: "小米空气净化器4Pro", category: "智能设备", subCategory: "净化", specs: "除甲醛 | 360°进风", price: "1299.00", heatScore: 76, heatLevel: 4, reason: "五一焕新家", dimension: "holiday", sourceHotspot: "五一劳动节大促", scriptCount: 3 },
    { productId: "p018", name: "格力空调1.5匹", category: "大家电", subCategory: "空调", specs: "1.5匹 | 新一级能效", price: "2699.00", heatScore: 78, heatLevel: 4, reason: "除湿+制冷双效", dimension: "weather", sourceHotspot: "回南天·除湿防潮", scriptCount: 3 },
    { productId: "p019", name: "美的电热水壶", category: "小家电", subCategory: "厨电", specs: "1.7L | 304不锈钢", price: "129.00", heatScore: 55, heatLevel: 3, reason: "谷雨饮茶热水需求", dimension: "solar_term", sourceHotspot: "谷雨·春季养生", scriptCount: 2 },
    { productId: "p020", name: "宜家收纳箱套装", category: "家居软装", subCategory: "收纳", specs: "3件套 | 透明可视", price: "99.00", heatScore: 52, heatLevel: 2, reason: "换季收纳热梗", dimension: "trend", sourceHotspot: "春季换季收纳", scriptCount: 2 },
  ];

  await db.insert(products).values(productData);
  console.log(`  ✓ Inserted ${productData.length} products`);

  // ====== Scripts ======
  const scriptData = [
    { scriptId: "s001", title: "春季装修话术", content: "金三银四最后冲刺！这套方太烟灶组合，正在装修的家人一定要看！变频风量23m³，开放式厨房也不怕油烟！今天直播间专属价！", dimension: "renovation", heatLevel: 5, usageCount: 234, hotspotId: "hotspot-001", hotspotName: "金三银四·春季装修旺季" },
    { scriptId: "s002", title: "五一大促话术", content: "五一大促来了！这台石头扫地机器人，吸拖洗烘一体，真正解放双手！今天立减800，仅限今天！", dimension: "holiday", heatLevel: 5, usageCount: 189, hotspotId: "hotspot-002", hotspotName: "五一劳动节大促" },
    { scriptId: "s003", title: "回南天话术", content: "回南天来了！墙壁冒水珠、衣服发霉对不对？这台德业22L除湿机，两小时抽满一箱水，全屋干爽！今天必须安排！", dimension: "weather", heatLevel: 4, usageCount: 156, hotspotId: "hotspot-003", hotspotName: "回南天·除湿防潮" },
    { scriptId: "s004", title: "母亲节话术", content: "母亲节倒计时！这款SKG按摩仪，妈妈刷完碗往脖子上一挂，热敷+脉冲双效，比去按摩店划算多了！", dimension: "holiday", heatLevel: 4, usageCount: 98, hotspotId: "hotspot-005", hotspotName: "母亲节送礼季" },
    { scriptId: "s005", title: "谷雨养生话术", content: "谷雨养生正当时！这台北鼎养生壶，煮花茶炖燕窝样样行，办公室放一台，每天提醒自己多喝水！", dimension: "solar_term", heatLevel: 4, usageCount: 67, hotspotId: "hotspot-004", hotspotName: "谷雨·春季养生" },
  ];

  await db.insert(scripts).values(scriptData);
  console.log(`  ✓ Inserted ${scriptData.length} scripts`);

  // ====== Platform Discussions ======
  const platformData = [
    {
      hotspotId: "hotspot-001",
      platform: "weibo",
      platformName: "微博",
      postCount: 28400,
      readCount: 89000000,
      sentiment: "positive",
      hotPosts: ["#春季装修攻略# 阅读量3.2亿，讨论12.8万", "装修博主「老房改造日记」：金三银四建材选购避坑指南 转发1.2万", "#我的装修日记# 晒单空气炸锅+蒸烤一体机组合"],
      topKeywords: ["装修攻略", "烟灶套装", "嵌入式", "开放式厨房"],
    },
    {
      hotspotId: "hotspot-001",
      platform: "xiaohongshu",
      platformName: "小红书",
      postCount: 45600,
      readCount: 156000000,
      sentiment: "positive",
      hotPosts: ["「奶油风厨房」方太烟灶+白色橱柜搭配笔记 点赞3.8万", "装修必买清单TOP20：蒸烤一体机排第3 收藏2.1万", "厨房改造前后对比，嵌入式家电省出2㎡ 点赞1.5万"],
      topKeywords: ["奶油风厨房", "装修清单", "嵌入式家电", "厨房改造"],
    },
    {
      hotspotId: "hotspot-001",
      platform: "douyin",
      platformName: "抖音",
      postCount: 67200,
      readCount: 320000000,
      sentiment: "mixed",
      hotPosts: ["「装修老炮」：金三银四最后30天，这些家电再不买就涨价了 点赞45万", "沉浸式厨房改造视频 播放量2800万", "方太vs老板烟灶对比测评 点赞12万"],
      topKeywords: ["厨房改造", "烟灶测评", "装修避坑", "嵌入式"],
    },
    {
      hotspotId: "hotspot-002",
      platform: "weibo",
      platformName: "微博",
      postCount: 52300,
      readCount: 210000000,
      sentiment: "positive",
      hotPosts: ["#五一买什么# 阅读量5.6亿，讨论28万", "「李佳琦直播间」五一专场预告：石头扫地机历史低价 转发3.5万", "#五一焕新家# 蓝盒子床垫晒单活动"],
      topKeywords: ["五一优惠", "焕新家", "扫地机器人", "床垫"],
    },
    {
      hotspotId: "hotspot-002",
      platform: "xiaohongshu",
      platformName: "小红书",
      postCount: 78900,
      readCount: 280000000,
      sentiment: "positive",
      hotPosts: ["五一必买家电清单｜这5件买了不后悔 点赞5.2万", "石头G20S真实使用3个月测评 点赞2.8万", "蓝盒子床垫100天试睡体验分享 点赞1.9万"],
      topKeywords: ["五一清单", "必买家电", "测评", "试睡"],
    },
    {
      hotspotId: "hotspot-002",
      platform: "douyin",
      platformName: "抖音",
      postCount: 128000,
      readCount: 650000000,
      sentiment: "positive",
      hotPosts: ["「家电研究所所长」：五一扫地机器人选购指南 点赞68万", "沉浸式全屋清洁视频 播放量4500万", "戴森V15 vs 国产吸尘器对比实测 点赞22万"],
      topKeywords: ["五一选购", "扫地机器人", "吸尘器测评", "全屋清洁"],
    },
    {
      hotspotId: "hotspot-003",
      platform: "weibo",
      platformName: "微博",
      postCount: 36700,
      readCount: 120000000,
      sentiment: "mixed",
      hotPosts: ["#回南天生存指南# 阅读量2.8亿，讨论15万", "广东网友晒「墙壁冒水」视频 转发5.6万", "#除湿机推荐# 美的vs德业vs格力横评"],
      topKeywords: ["回南天", "墙壁冒水", "除湿机推荐", "发霉"],
    },
    {
      hotspotId: "hotspot-003",
      platform: "xiaohongshu",
      platformName: "小红书",
      postCount: 28900,
      readCount: 98000000,
      sentiment: "negative",
      hotPosts: ["回南天我的包发霉了😭急救指南 点赞4.1万", "除湿机真实测评：德业22L一周使用体验 点赞2.3万", "衣柜防潮攻略｜除湿袋+除湿机双管齐下 收藏1.8万"],
      topKeywords: ["发霉急救", "除湿机测评", "衣柜防潮", "回南天攻略"],
    },
    {
      hotspotId: "hotspot-003",
      platform: "douyin",
      platformName: "抖音",
      postCount: 45600,
      readCount: 180000000,
      sentiment: "mixed",
      hotPosts: ["「广东生活日记」：回南天全屋除湿实录 点赞38万", "除湿机开箱+效果实测视频 播放量1200万", "回南天搞笑合集：南方人vs北方人的反应 点赞56万"],
      topKeywords: ["广东回南天", "除湿实录", "开箱实测", "南北差异"],
    },
  ];

  await db.insert(platformDiscussions).values(platformData);
  console.log(`  ✓ Inserted ${platformData.length} platform discussions`);

  // ====== Daily Snapshots ======
  const snapshotData = [
    {
      date: new Date("2026-04-22"),
      totalHotspots: 6,
      highPriorityCount: 3,
      description: "谷雨刚过春未尽，华南回南天来袭；五一装修季+劳动节送礼双buff叠加",
      weatherCity: "杭州市",
      weatherTemp: 22,
      weatherCondition: "多云转阴",
      weatherHumidity: 78,
      weatherTip: "华南进入回南天高峰期 → 除湿机/烘干机需求开始飙升",
      solarTerm: "谷雨",
    },
    {
      date: new Date("2026-04-23"),
      totalHotspots: 6,
      highPriorityCount: 3,
      description: "回南天持续发酵，除湿机搜索量继续攀升；五一预热期启动",
      weatherCity: "杭州市",
      weatherTemp: 23,
      weatherCondition: "阴转小雨",
      weatherHumidity: 82,
      weatherTip: "湿度继续攀升 → 除湿/烘干设备需求持续走高",
      solarTerm: "谷雨",
    },
    {
      date: new Date("2026-04-24"),
      totalHotspots: 5,
      highPriorityCount: 2,
      description: "周末家庭清洁日，洗地机/吸尘器需求小高峰",
      weatherCity: "杭州市",
      weatherTemp: 24,
      weatherCondition: "多云",
      weatherHumidity: 75,
      weatherTip: "周末家庭清洁场景 → 清洁电器需求上升",
      solarTerm: "谷雨",
    },
    {
      date: new Date("2026-04-25"),
      totalHotspots: 7,
      highPriorityCount: 4,
      description: "母亲节预热启动+回南天双重驱动，个护健康/除湿家电双线爆发",
      weatherCity: "杭州市",
      weatherTemp: 25,
      weatherCondition: "晴转多云",
      weatherHumidity: 72,
      weatherTip: "母亲节倒计时15天 → 礼品类家电需求启动",
      solarTerm: "谷雨",
    },
    {
      date: new Date("2026-05-01"),
      totalHotspots: 8,
      highPriorityCount: 5,
      description: "五一劳动节大促正式开启，年度家电消费最高峰",
      weatherCity: "杭州市",
      weatherTemp: 28,
      weatherCondition: "晴",
      weatherHumidity: 60,
      weatherTip: "五一假期第一天 → 出游/装修双线消费高峰",
      solarTerm: "谷雨",
    },
  ];

  await db.insert(dailySnapshots).values(snapshotData);
  console.log(`  ✓ Inserted ${snapshotData.length} daily snapshots`);

  // ====== Hotspot-Product Links ======
  const hpLinks = [
    { hotspotId: "hotspot-001", productId: "p001" },
    { hotspotId: "hotspot-001", productId: "p002" },
    { hotspotId: "hotspot-001", productId: "p015" },
    { hotspotId: "hotspot-001", productId: "p016" },
    { hotspotId: "hotspot-002", productId: "p003" },
    { hotspotId: "hotspot-002", productId: "p004" },
    { hotspotId: "hotspot-002", productId: "p005" },
    { hotspotId: "hotspot-002", productId: "p017" },
    { hotspotId: "hotspot-003", productId: "p006" },
    { hotspotId: "hotspot-003", productId: "p007" },
    { hotspotId: "hotspot-003", productId: "p008" },
    { hotspotId: "hotspot-003", productId: "p018" },
    { hotspotId: "hotspot-004", productId: "p009" },
    { hotspotId: "hotspot-004", productId: "p010" },
    { hotspotId: "hotspot-004", productId: "p019" },
    { hotspotId: "hotspot-005", productId: "p011" },
    { hotspotId: "hotspot-005", productId: "p012" },
    { hotspotId: "hotspot-006", productId: "p013" },
    { hotspotId: "hotspot-006", productId: "p014" },
    { hotspotId: "hotspot-006", productId: "p020" },
  ];

  await db.insert(hotspotProducts).values(hpLinks);
  console.log(`  ✓ Inserted ${hpLinks.length} hotspot-product links`);

  console.log("\n🎉 Seed complete!");
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
