import type { Hotspot, Product, Script, TrendingItem, DailySummary, WeatherInfo, SolarTerm, UpcomingHoliday, DimensionSummary } from './types';
import { DIMENSION_CONFIG } from './types';

// ============================================================
// 数据基准：2026年4月22日（谷雨之后，立夏之前）
// ============================================================

export const dailySummary: DailySummary = {
  totalHotspots: 6,
  highPriorityCount: 3,
  description: '谷雨刚过春未尽，华南回南天来袭；五一装修季+劳动节送礼双buff叠加',
};

export const weatherInfo: WeatherInfo = {
  city: '杭州市',
  temperature: 22,
  condition: '多云转阴',
  humidity: 78,
  tip: '华南进入回南天高峰期 → 除湿机/烘干机需求开始飙升',
  icon: 'cloudy',
};

export const solarTerm: SolarTerm = {
  name: '谷雨',
  description: '萍始生，鸣鸠拂羽，戴胜降于桑',
  current: true,
  daysToNext: 13,
  nextName: '立夏',
  nextTip: '立夏热点：制冷家电预热，空调/风扇需求抬头',
};

export const dimensionSummaries: DimensionSummary[] = [
  { dimension: 'weather', label: '天气驱动', currentHotspot: '回南天/高湿度', heatScore: 82, heatLevel: 4, icon: DIMENSION_CONFIG.weather.icon },
  { dimension: 'solar_term', label: '节气驱动', currentHotspot: '谷雨', heatScore: 68, heatLevel: 4, icon: DIMENSION_CONFIG.solar_term.icon },
  { dimension: 'holiday', label: '节假日', currentHotspot: '五一劳动节', heatScore: 88, heatLevel: 5, icon: DIMENSION_CONFIG.holiday.icon },
  { dimension: 'trend', label: '热梗趋势', currentHotspot: '春季焕新收纳', heatScore: 55, heatLevel: 3, icon: DIMENSION_CONFIG.trend.icon },
  { dimension: 'renovation', label: '家装节奏', currentHotspot: '金三银四装修季', heatScore: 90, heatLevel: 5, icon: DIMENSION_CONFIG.renovation.icon },
];

export const topHotspots: Hotspot[] = [
  {
    id: 'hotspot-001',
    dimension: 'renovation',
    title: '金三银四·春季装修旺季',
    description: '春季家装最后冲刺，厨卫电器/软装/工具需求集中爆发',
    heatLevel: 5,
    heatScore: 92,
    dateRange: ['2026-03-01', '2026-05-10'],
    metricLabel: '装修订单',
    metricValue: '+128%',
    metricDirection: 'up',
    relatedProducts: [
      { id: 'p001', name: '方太油烟机灶具套装', image: '', heatScore: 90, reason: '春季装修标配', dimension: 'renovation', sourceHotspot: '金三银四·春季装修旺季', script: '金三银四最后冲刺！这套方太烟灶组合，正在装修的家人一定要看！变频风量23m³，开放式厨房也不怕油烟！' },
      { id: 'p002', name: '美的嵌入式蒸烤一体机', image: '', heatScore: 85, reason: '新厨电趋势', dimension: 'renovation', sourceHotspot: '金三银四·春季装修旺季' },
    ],
    scriptTemplate: '家人们，春季装修旺季最后机会了！这套{name}今天直播间骨折价，错过等明年！',
    trend: [55, 62, 70, 78, 85, 90, 92],
  },
  {
    id: 'hotspot-002',
    dimension: 'holiday',
    title: '五一劳动节大促',
    description: '5天长假+装修季+换季需求，家电家居消费年度高峰',
    heatLevel: 5,
    heatScore: 95,
    dateRange: ['2026-04-20', '2026-05-05'],
    metricLabel: '预计流量',
    metricValue: '↑280%',
    metricDirection: 'up',
    relatedProducts: [
      { id: 'p003', name: '石头扫拖机器人G20S', image: '', heatScore: 94, reason: '五一爆款', dimension: 'holiday', sourceHotspot: '五一劳动节大促', script: '五一放假谁想打扫卫生？这台石头扫地机器人，吸拖洗烘一体，真正解放双手！今天立减800！' },
      { id: 'p004', name: '戴森吸尘器V15', image: '', heatScore: 88, reason: '换季清洁刚需', dimension: 'holiday', sourceHotspot: '五一劳动节大促' },
      { id: 'p005', name: '蓝盒子床垫Z1', image: '', heatScore: 82, reason: '五一焕新家', dimension: 'holiday', sourceHotspot: '五一劳动节大促' },
    ],
    scriptTemplate: '五一大促来了！{name}今天直播间专属价，比平时便宜好几百，仅限今天！',
    trend: [50, 58, 68, 78, 88, 92, 95],
  },
  {
    id: 'hotspot-003',
    dimension: 'weather',
    title: '回南天·除湿防潮',
    description: '华南进入回南天高峰期，除湿机/烘干机/防潮用品需求暴增',
    heatLevel: 4,
    heatScore: 85,
    dateRange: ['2026-04-15', '2026-05-10'],
    metricLabel: '除湿机搜索',
    metricValue: '+156%',
    metricDirection: 'up',
    relatedProducts: [
      { id: 'p006', name: '德业除湿机DYD-T22A3', image: '', heatScore: 93, reason: '回南天刚需', dimension: 'weather', sourceHotspot: '回南天·除湿防潮', script: '回南天来了！墙壁冒水珠、衣服发霉对不对？这台德业22L除湿机，两小时抽满一箱水，全屋干爽！' },
      { id: 'p007', name: '海尔烘干机EHG100', image: '', heatScore: 87, reason: '衣物烘干刚需', dimension: 'weather', sourceHotspot: '回南天·除湿防潮' },
      { id: 'p008', name: '除湿袋/除湿盒套装', image: '', heatScore: 72, reason: '低成本防潮', dimension: 'weather', sourceHotspot: '回南天·除湿防潮' },
    ],
    scriptTemplate: '回南天来了家人们！{name}今天必须安排上，不然衣服全发霉！',
    trend: [35, 45, 58, 68, 78, 82, 85],
  },
  {
    id: 'hotspot-004',
    dimension: 'solar_term',
    title: '谷雨·春季养生',
    description: '谷雨节气，养生壶/茶具/厨电焕新需求上升',
    heatLevel: 4,
    heatScore: 72,
    dateRange: ['2026-04-15', '2026-05-05'],
    metricLabel: '养生壶搜索',
    metricValue: '+45%',
    metricDirection: 'up',
    relatedProducts: [
      { id: 'p009', name: '北鼎养生壶K108', image: '', heatScore: 78, reason: '谷雨养生', dimension: 'solar_term', sourceHotspot: '谷雨·春季养生', script: '谷雨养生正当时！这台北鼎养生壶，煮花茶炖燕窝样样行，办公室放一台，每天提醒自己多喝水！' },
      { id: 'p010', name: '小熊电炖锅', image: '', heatScore: 65, reason: '春季滋补', dimension: 'solar_term', sourceHotspot: '谷雨·春季养生' },
    ],
    scriptTemplate: '谷雨养生季，{name}今天给你们安排上了！春季调理身体正合适！',
    trend: [45, 50, 55, 60, 66, 70, 72],
  },
  {
    id: 'hotspot-005',
    dimension: 'holiday',
    title: '母亲节送礼季',
    description: '5月10日母亲节，个护健康/厨房电器/家居礼品需求高峰',
    heatLevel: 4,
    heatScore: 80,
    dateRange: ['2026-04-25', '2026-05-12'],
    metricLabel: '礼品搜索',
    metricValue: '+210%',
    metricDirection: 'up',
    relatedProducts: [
      { id: 'p011', name: 'SKG颈椎按摩仪', image: '', heatScore: 86, reason: '母亲节送礼', dimension: 'holiday', sourceHotspot: '母亲节送礼季', script: '母亲节礼物准备好了吗？这款SKG按摩仪，妈妈刷完碗往脖子上一挂，热敷+脉冲双效，比去按摩店划算多了！' },
      { id: 'p012', name: '松下负离子吹风机', image: '', heatScore: 80, reason: '母亲节送礼', dimension: 'holiday', sourceHotspot: '母亲节送礼季' },
    ],
    scriptTemplate: '母亲节倒计时！{name}送给妈妈，比发红包更有心意！',
    trend: [30, 38, 50, 62, 70, 76, 80],
  },
  {
    id: 'hotspot-006',
    dimension: 'trend',
    title: '春季换季收纳',
    description: '春季焕新，收纳整理/除螨/空气净化需求上升',
    heatLevel: 3,
    heatScore: 58,
    dateRange: ['2026-04-10', '2026-05-05'],
    metricLabel: '收纳搜索',
    metricValue: '+38%',
    metricDirection: 'up',
    relatedProducts: [
      { id: 'p013', name: '太力真空收纳袋套装', image: '', heatScore: 68, reason: '换季收纳', dimension: 'trend', sourceHotspot: '春季换季收纳' },
      { id: 'p014', name: '小米除螨仪', image: '', heatScore: 62, reason: '春季除螨', dimension: 'trend', sourceHotspot: '春季换季收纳' },
    ],
    scriptTemplate: '春天来了该换季了！{name}帮你把冬装收得整整齐齐，衣柜瞬间大一倍！',
    trend: [30, 35, 42, 48, 52, 55, 58],
  },
];

export const trendingItems: TrendingItem[] = [
  { id: 't001', name: '除湿机', dimension: 'weather', changePercent: 156, trend: [35, 55, 72, 85, 92, 98, 105] },
  { id: 't002', name: '扫地机器人', dimension: 'holiday', changePercent: 128, trend: [45, 58, 72, 82, 90, 95, 98] },
  { id: 't003', name: '油烟机套装', dimension: 'renovation', changePercent: 95, trend: [40, 52, 65, 75, 82, 88, 92] },
  { id: 't004', name: '养生壶', dimension: 'solar_term', changePercent: 45, trend: [30, 35, 42, 50, 58, 65, 72] },
];

export const quickProducts: Product[] = [
  { id: 'p001', name: '方太油烟机灶具套装', image: '', heatScore: 90, reason: '春季装修标配', dimension: 'renovation', sourceHotspot: '金三银四·春季装修旺季' },
  { id: 'p003', name: '石头扫拖机器人G20S', image: '', heatScore: 94, reason: '五一爆款', dimension: 'holiday', sourceHotspot: '五一劳动节大促' },
  { id: 'p006', name: '德业除湿机DYD-T22A3', image: '', heatScore: 93, reason: '回南天刚需', dimension: 'weather', sourceHotspot: '回南天·除湿防潮' },
  { id: 'p011', name: 'SKG颈椎按摩仪', image: '', heatScore: 86, reason: '母亲节送礼', dimension: 'holiday', sourceHotspot: '母亲节送礼季' },
  { id: 'p004', name: '戴森吸尘器V15', image: '', heatScore: 88, reason: '换季清洁刚需', dimension: 'holiday', sourceHotspot: '五一劳动节大促' },
  { id: 'p009', name: '北鼎养生壶K108', image: '', heatScore: 78, reason: '谷雨养生', dimension: 'solar_term', sourceHotspot: '谷雨·春季养生' },
  { id: 'p007', name: '海尔烘干机EHG100', image: '', heatScore: 87, reason: '衣物烘干刚需', dimension: 'weather', sourceHotspot: '回南天·除湿防潮' },
  { id: 'p002', name: '美的嵌入式蒸烤一体机', image: '', heatScore: 85, reason: '新厨电趋势', dimension: 'renovation', sourceHotspot: '金三银四·春季装修旺季' },
];

export const scripts: Script[] = [
  {
    id: 's001',
    title: '春季装修话术',
    content: '金三银四最后冲刺！这套方太烟灶组合，正在装修的家人一定要看！变频风量23m³，开放式厨房也不怕油烟！今天直播间专属价！',
    dimension: 'renovation',
    heatLevel: 5,
    usageCount: 234,
    hotspotId: 'hotspot-001',
    hotspotName: '金三银四·春季装修旺季',
  },
  {
    id: 's002',
    title: '五一大促话术',
    content: '五一大促来了！这台石头扫地机器人，吸拖洗烘一体，真正解放双手！今天立减800，仅限今天！',
    dimension: 'holiday',
    heatLevel: 5,
    usageCount: 189,
    hotspotId: 'hotspot-002',
    hotspotName: '五一劳动节大促',
  },
  {
    id: 's003',
    title: '回南天话术',
    content: '回南天来了！墙壁冒水珠、衣服发霉对不对？这台德业22L除湿机，两小时抽满一箱水，全屋干爽！今天必须安排！',
    dimension: 'weather',
    heatLevel: 4,
    usageCount: 156,
    hotspotId: 'hotspot-003',
    hotspotName: '回南天·除湿防潮',
  },
  {
    id: 's004',
    title: '母亲节话术',
    content: '母亲节倒计时！这款SKG按摩仪，妈妈刷完碗往脖子上一挂，热敷+脉冲双效，比去按摩店划算多了！',
    dimension: 'holiday',
    heatLevel: 4,
    usageCount: 98,
    hotspotId: 'hotspot-005',
    hotspotName: '母亲节送礼季',
  },
  {
    id: 's005',
    title: '谷雨养生话术',
    content: '谷雨养生正当时！这台北鼎养生壶，煮花茶炖燕窝样样行，办公室放一台，每天提醒自己多喝水！',
    dimension: 'solar_term',
    heatLevel: 4,
    usageCount: 67,
    hotspotId: 'hotspot-004',
    hotspotName: '谷雨·春季养生',
  },
];

export const upcomingHolidays: UpcomingHoliday[] = [
  { id: 'h001', name: '五一劳动节', date: '2026-05-01', monthDay: '5月1日', daysLeft: 9, description: '5天长假·装修+出行', heatLevel: 5 },
  { id: 'h002', name: '立夏', date: '2026-05-05', monthDay: '5月5日', daysLeft: 13, description: '节气热点：制冷预热', heatLevel: 4 },
  { id: 'h003', name: '母亲节', date: '2026-05-10', monthDay: '5月10日', daysLeft: 18, description: '送礼高峰·个护健康', heatLevel: 4 },
  { id: 'h004', name: '520', date: '2026-05-20', monthDay: '5月20日', daysLeft: 28, description: '情侣家电·小家电', heatLevel: 4 },
  { id: 'h005', name: '端午节', date: '2026-06-19', monthDay: '6月19日', daysLeft: 58, description: '粽子节·厨房电器', heatLevel: 4 },
];

import type { HotspotDetail } from './types';

export const hotspotDetails: Record<string, HotspotDetail> = {
  'hotspot-001': {
    hotspotId: 'hotspot-001',
    confidence: { score: 92, level: 'high', factors: ['历史数据验证：春季装修旺季连续5年高增长', '装修平台订单数据实时同步', '品类搜索量环比增幅超过阈值'] },
    platforms: [
      { platform: 'weibo', platformName: '微博', postCount: 28400, readCount: 89000000, sentiment: 'positive', hotPosts: ['#春季装修攻略# 阅读量3.2亿，讨论12.8万', '装修博主「老房改造日记」：金三银四建材选购避坑指南 转发1.2万', '#我的装修日记# 晒单空气炸锅+蒸烤一体机组合'], topKeywords: ['装修攻略', '烟灶套装', '嵌入式', '开放式厨房'] },
      { platform: 'xiaohongshu', platformName: '小红书', postCount: 45600, readCount: 156000000, sentiment: 'positive', hotPosts: ['「奶油风厨房」方太烟灶+白色橱柜搭配笔记 点赞3.8万', '装修必买清单TOP20：蒸烤一体机排第3 收藏2.1万', '厨房改造前后对比，嵌入式家电省出2㎡ 点赞1.5万'], topKeywords: ['奶油风厨房', '装修清单', '嵌入式家电', '厨房改造'] },
      { platform: 'douyin', platformName: '抖音', postCount: 67200, readCount: 320000000, sentiment: 'mixed', hotPosts: ['「装修老炮」：金三银四最后30天，这些家电再不买就涨价了 点赞45万', '沉浸式厨房改造视频 播放量2800万', '方太vs老板烟灶对比测评 点赞12万'], topKeywords: ['厨房改造', '烟灶测评', '装修避坑', '嵌入式'] },
    ],
    trendIndicator: { direction: 'up', vsLastWeek: '+15%', vsLastMonth: '+128%', vsLastYear: '+35%', forecast: '持续走高，预计5月中旬达到峰值' },
    yoyDiffs: [
      { aspect: '核心品类', thisYear: '嵌入式蒸烤一体机需求首次超过传统烟灶', lastYear: '烟灶套装为绝对主力', change: '消费升级趋势明显' },
      { aspect: '消费预算', thisYear: '单户厨房电器预算平均1.8万元', lastYear: '单户预算1.2万元', change: '预算提升50%' },
      { aspect: '决策路径', thisYear: '短视频种草→小红书做功课→直播间下单', lastYear: '线下门店体验→电商比价', change: '内容电商渗透率提升' },
    ],
    relatedTopics: ['#春季装修攻略#', '#奶油风厨房#', '#嵌入式家电#', '#开放式厨房#'],
    actionSuggestions: ['主推方太/老板烟灶套装+蒸烤一体机组合', '搭配「厨房改造前后对比」短视频引流', '联合装修博主做专场直播', '设置「满5000减500」装修专属券'],
  },
  'hotspot-002': {
    hotspotId: 'hotspot-002',
    confidence: { score: 95, level: 'high', factors: ['五一大促为确定性事件，历史数据充分', '多个电商平台已公布活动节奏', '消费者调研显示80%有五一购物计划'] },
    platforms: [
      { platform: 'weibo', platformName: '微博', postCount: 52300, readCount: 210000000, sentiment: 'positive', hotPosts: ['#五一买什么# 阅读量5.6亿，讨论28万', '「李佳琦直播间」五一专场预告：石头扫地机历史低价 转发3.5万', '#五一焕新家# 蓝盒子床垫晒单活动'], topKeywords: ['五一优惠', '焕新家', '扫地机器人', '床垫'] },
      { platform: 'xiaohongshu', platformName: '小红书', postCount: 78900, readCount: 280000000, sentiment: 'positive', hotPosts: ['五一必买家电清单｜这5件买了不后悔 点赞5.2万', '石头G20S真实使用3个月测评 点赞2.8万', '蓝盒子床垫100天试睡体验分享 点赞1.9万'], topKeywords: ['五一清单', '必买家电', '测评', '试睡'] },
      { platform: 'douyin', platformName: '抖音', postCount: 128000, readCount: 650000000, sentiment: 'positive', hotPosts: ['「家电研究所所长」：五一扫地机器人选购指南 点赞68万', '沉浸式全屋清洁视频 播放量4500万', '戴森V15 vs 国产吸尘器对比实测 点赞22万'], topKeywords: ['五一选购', '扫地机器人', '吸尘器测评', '全屋清洁'] },
    ],
    trendIndicator: { direction: 'up', vsLastWeek: '+22%', vsLastMonth: '+85%', vsLastYear: '+42%', forecast: '4月最后一周达到热度顶峰，5月1-3日流量集中爆发' },
    yoyDiffs: [
      { aspect: '促销力度', thisYear: '国补15%+平台满减+以旧换新三重叠加', lastYear: '仅平台满减', change: '优惠力度为历年最大' },
      { aspect: '爆款品类', thisYear: '扫地机器人+洗地机成为TOP2', lastYear: '空调+电视为传统爆款', change: '清洁电器品类崛起' },
      { aspect: '用户行为', thisYear: '70%用户提前7天加购，决策周期拉长', lastYear: '冲动消费为主，决策周期1-2天', change: '消费者更理性，内容种草周期变长' },
    ],
    relatedTopics: ['#五一焕新家#', '#五一买什么#', '#扫地机器人推荐#', '#解放双手神器#'],
    actionSuggestions: ['石头/科沃斯扫地机器人作为主推爆品', '设置「五一提前购」锁定加购用户', '清洁电器专场+「全屋清洁挑战赛」互动', '国补政策解读话术，强调三重优惠叠加'],
  },
  'hotspot-003': {
    hotspotId: 'hotspot-003',
    confidence: { score: 88, level: 'high', factors: ['华南气象部门确认回南天预警', '除湿机品类搜索量实时数据验证', '历史同期数据高度吻合'] },
    platforms: [
      { platform: 'weibo', platformName: '微博', postCount: 36700, readCount: 120000000, sentiment: 'mixed', hotPosts: ['#回南天生存指南# 阅读量2.8亿，讨论15万', '广东网友晒「墙壁冒水」视频 转发5.6万', '#除湿机推荐# 美的vs德业vs格力横评'], topKeywords: ['回南天', '墙壁冒水', '除湿机推荐', '发霉'] },
      { platform: 'xiaohongshu', platformName: '小红书', postCount: 28900, readCount: 98000000, sentiment: 'negative', hotPosts: ['回南天我的包发霉了😭急救指南 点赞4.1万', '除湿机真实测评：德业22L一周使用体验 点赞2.3万', '衣柜防潮攻略｜除湿袋+除湿机双管齐下 收藏1.8万'], topKeywords: ['发霉急救', '除湿机测评', '衣柜防潮', '回南天攻略'] },
      { platform: 'douyin', platformName: '抖音', postCount: 45600, readCount: 180000000, sentiment: 'mixed', hotPosts: ['「广东生活日记」：回南天全屋除湿实录 点赞38万', '除湿机开箱+效果实测视频 播放量1200万', '回南天搞笑合集：南方人vs北方人的反应 点赞56万'], topKeywords: ['广东回南天', '除湿实录', '开箱实测', '南北差异'] },
    ],
    trendIndicator: { direction: 'up', vsLastWeek: '+35%', vsLastMonth: '+156%', vsLastYear: '+28%', forecast: '持续升温，预计4月底达到峰值，5月中旬随气温升高缓解' },
    yoyDiffs: [
      { aspect: '影响范围', thisYear: '华南+江南多地同时受影响，范围扩大', lastYear: '主要集中在广东广西', change: '影响范围扩大40%' },
      { aspect: '消费品类', thisYear: '除湿机+烘干机+防潮剂三件套组合购买', lastYear: '仅购买单一除湿产品', change: '组合购买率提升65%' },
      { aspect: '价格敏感度', thisYear: '愿意为「静音」「智能恒湿」功能付溢价', lastYear: '价格为导向，选 cheapest', change: '品质消费趋势明显' },
    ],
    relatedTopics: ['#回南天生存指南#', '#除湿机推荐#', '#广东回南天#', '#墙壁冒水#'],
    actionSuggestions: ['德业/美的除湿机作为核心主推，强调22L大容量', '搭配烘干机+除湿袋做「防潮三件套」组合', '制作「回南天前后对比」视觉冲击短视频', '强调「两小时抽满一箱水」的具体效果'],
  },
  'hotspot-004': {
    hotspotId: 'hotspot-004',
    confidence: { score: 72, level: 'medium', factors: ['谷雨为固定节气，日期确定', '养生品类搜索量有上升趋势但幅度较小', '用户意图偏向内容消费而非直接购买'] },
    platforms: [
      { platform: 'weibo', platformName: '微博', postCount: 12300, readCount: 45000000, sentiment: 'positive', hotPosts: ['#谷雨养生# 阅读量1.2亿，讨论5.6万', '「中医养生博主」：谷雨时节喝这3种茶最祛湿 转发2.1万', '#养生壶食谱# 谷雨特辑：红豆薏米水'], topKeywords: ['谷雨养生', '祛湿茶', '养生壶', '食疗'] },
      { platform: 'xiaohongshu', platformName: '小红书', postCount: 19800, readCount: 72000000, sentiment: 'positive', hotPosts: ['谷雨养生指南｜办公室girl的养生壶食谱 点赞2.6万', '北鼎养生壶开箱+15道食谱合集 点赞1.8万', '谷雨时节皮肤保养+内调攻略 收藏1.2万'], topKeywords: ['养生壶食谱', '办公室养生', '祛湿', '内调'] },
      { platform: 'douyin', platformName: '抖音', postCount: 23400, readCount: 89000000, sentiment: 'positive', hotPosts: ['「养生小课堂」：谷雨吃什么？这5道家常食疗方 点赞28万', '养生壶煮谷雨茶ASMR视频 播放量1800万', '90后开始养生了？谷雨节气Vlog 点赞15万'], topKeywords: ['谷雨食疗', '养生茶', '90后养生', 'ASMR'] },
    ],
    trendIndicator: { direction: 'up', vsLastWeek: '+8%', vsLastMonth: '+45%', vsLastYear: '+18%', forecast: '温和上升，谷雨当天（4月20日）为峰值，之后缓慢回落' },
    yoyDiffs: [
      { aspect: '目标人群', thisYear: '25-35岁年轻女性成为养生壶主力购买群体', lastYear: '35-50岁中年女性为主', change: '年轻化趋势明显' },
      { aspect: '消费场景', thisYear: '「办公室养生」场景需求大增', lastYear: '家庭厨房场景为主', change: '场景拓展带动新增需求' },
      { aspect: '内容偏好', thisYear: '短视频食谱+高颜值产品展示驱动购买', lastYear: '图文测评+性价比对比', change: '内容形式升级' },
    ],
    relatedTopics: ['#谷雨养生#', '#养生壶食谱#', '#办公室养生#', '#90后养生#'],
    actionSuggestions: ['北鼎/小熊养生壶作为主推，强调「办公室养生」场景', '制作「谷雨养生茶」直播内容，现场演示煮茶', '搭配养生食材（红豆、薏米、红枣）做组合销售', '联合养生博主做节气专场'],
  },
  'hotspot-005': {
    hotspotId: 'hotspot-005',
    confidence: { score: 85, level: 'high', factors: ['母亲节日期固定，消费确定性高', '礼物类搜索量已显著上升', '历史3年数据稳定'] },
    platforms: [
      { platform: 'weibo', platformName: '微博', postCount: 28900, readCount: 95000000, sentiment: 'positive', hotPosts: ['#母亲节礼物# 阅读量4.5亿，讨论18万', '「养生达人」：送妈妈这10件实用家电 转发2.8万', '#送给妈妈的礼物# 晒单SKG按摩仪'], topKeywords: ['母亲节礼物', '送妈妈', '按摩仪', '实用'] },
      { platform: 'xiaohongshu', platformName: '小红书', postCount: 42300, readCount: 140000000, sentiment: 'positive', hotPosts: ['母亲节礼物清单｜500元以内实用又贴心 点赞4.2万', 'SKG颈椎仪真实使用1个月测评 点赞2.1万', '「妈妈的礼物」松下吹风机+护手霜礼盒 收藏1.5万'], topKeywords: ['礼物清单', '500元以内', '测评', '礼盒'] },
      { platform: 'douyin', platformName: '抖音', postCount: 56700, readCount: 230000000, sentiment: 'positive', hotPosts: ['「给妈妈的一封信」+ SKG开箱 点赞52万', '母亲节送礼指南：这5件妈妈不会说你乱花钱 点赞35万', '妈妈第一次用负离子吹风机的反应 播放量2800万'], topKeywords: ['送礼指南', '妈妈的反应', '实用礼物', '负离子'] },
    ],
    trendIndicator: { direction: 'up', vsLastWeek: '+18%', vsLastMonth: '+210%', vsLastYear: '+25%', forecast: '快速升温，预计5月8-10日达到热度峰值' },
    yoyDiffs: [
      { aspect: '送礼偏好', thisYear: '「健康关怀」类（按摩仪/养生壶）超过「美妆护肤」成为首选', lastYear: '美妆护肤礼盒为TOP1', change: '健康意识驱动品类转移' },
      { aspect: '价格带', thisYear: '300-500元价格带最受欢迎', lastYear: '200-300元为主流', change: '送礼预算提升' },
      { aspect: '购买动机', thisYear: '「实用+情感表达」双重驱动', lastYear: '「仪式感」导向', change: '消费更理性，重实用性' },
    ],
    relatedTopics: ['#母亲节礼物#', '#送给妈妈的礼物#', '#母亲节送礼指南#', '#妈妈的礼物#'],
    actionSuggestions: ['SKG按摩仪/松下吹风机作为主推母亲节礼物', '制作「母亲节送礼不踩雷」内容', '设置「母亲节礼盒」包装+贺卡服务', '联合情感类博主做「给妈妈的一封信」话题营销'],
  },
  'hotspot-006': {
    hotspotId: 'hotspot-006',
    confidence: { score: 65, level: 'medium', factors: ['换季收纳为季节性需求但非刚性需求', '搜索量有上升但转化路径较长', '内容热但购买决策周期长'] },
    platforms: [
      { platform: 'weibo', platformName: '微博', postCount: 8900, readCount: 32000000, sentiment: 'positive', hotPosts: ['#换季收纳大法# 阅读量8000万，讨论3.2万', '收纳师教你：春季衣柜整理术 转发1.2万', '#收纳神器# 真空压缩袋实测'], topKeywords: ['换季收纳', '衣柜整理', '收纳神器', '真空袋'] },
      { platform: 'xiaohongshu', platformName: '小红书', postCount: 23400, readCount: 85000000, sentiment: 'positive', hotPosts: ['换季收纳攻略｜3小时搞定全屋衣柜 点赞3.1万', '太力真空收纳袋真实测评 点赞1.5万', '日本收纳法 vs 国产收纳工具对比 收藏9800'], topKeywords: ['收纳攻略', '全屋整理', '日本收纳法', '测评'] },
      { platform: 'douyin', platformName: '抖音', postCount: 18900, readCount: 56000000, sentiment: 'positive', hotPosts: ['「整理师」：春季衣柜整理全流程 点赞18万', '真空收纳袋ASMR压缩视频 播放量900万', '换季收纳前后对比，爽到头皮发麻 点赞25万'], topKeywords: ['整理师', '衣柜整理', 'ASMR', '前后对比'] },
    ],
    trendIndicator: { direction: 'stable', vsLastWeek: '+5%', vsLastMonth: '+38%', vsLastYear: '+12%', forecast: '温和增长，4月底至5月初为高峰，之后回落' },
    yoyDiffs: [
      { aspect: '核心工具', thisYear: '「免抽气」真空袋+除螨仪组合受欢迎', lastYear: '传统抽气真空袋为主', change: '产品升级驱动品类更新' },
      { aspect: '参与人群', thisYear: '租房党收纳需求大增（轻量化、可带走）', lastYear: '以家庭用户为主', change: '租房群体成为新增量' },
      { aspect: '内容形式', thisYear: '「沉浸式整理」ASMR视频带动品类关注', lastYear: '教程类图文为主', change: '内容形式创新带来新增流量' },
    ],
    relatedTopics: ['#换季收纳大法#', '#收纳神器#', '#衣柜整理#', '#沉浸式整理#'],
    actionSuggestions: ['太力免抽气真空袋+小米除螨仪做组合套装', '制作「沉浸式衣柜整理」短视频引流', '强调「租房友好」「可重复使用」卖点', '设置「收纳专场」直播间，现场演示整理效果'],
  },
};

export function isDateInRange(dateStr: string, range: [string, string]): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const start = new Date(range[0] + 'T00:00:00');
  const end = new Date(range[1] + 'T00:00:00');
  return d >= start && d <= end;
}

export function getActiveHotspots(dateStr: string) {
  return topHotspots.filter((h) => isDateInRange(dateStr, h.dateRange));
}

export function getActiveTrendingItems(_dateStr: string) {
  return trendingItems.filter((_t) => {
    // 简化：trending items 不绑定具体日期范围，默认活跃
    return true;
  });
}

export function getActiveScripts(dateStr: string) {
  return scripts.filter((s) => {
    const h = topHotspots.find((h) => h.id === s.hotspotId);
    if (!h) return false;
    return isDateInRange(dateStr, h.dateRange);
  });
}

export function getActiveQuickProducts(dateStr: string) {
  const active = getActiveHotspots(dateStr);
  const activeIds = new Set(active.flatMap((h) => h.relatedProducts.map((p) => p.id)));
  return quickProducts.filter((p) => activeIds.has(p.id));
}

export function getUpcomingHolidaysFromDate(baseDateStr: string) {
  const base = new Date(baseDateStr + 'T00:00:00');
  return upcomingHolidays
    .map((h) => {
      const d = new Date(h.date + 'T00:00:00');
      const diffMs = d.getTime() - base.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...h, daysLeft };
    })
    .filter((h) => h.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function getHeatProgressColor(score: number): string {
  if (score >= 80) return '#FF3B30';
  if (score >= 60) return '#FF9500';
  if (score >= 40) return '#FFCC00';
  if (score >= 20) return '#34C759';
  return '#8E8E93';
}

export function getHeatLevelFromScore(score: number): import('./types').HeatLevel {
  if (score >= 85) return 5;
  if (score >= 65) return 4;
  if (score >= 45) return 3;
  if (score >= 25) return 2;
  return 1;
}
