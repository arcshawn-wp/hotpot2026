import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight, Cloud, Copy, Check, CloudRain, CloudSnow, Sun,
  Leaf, Gift, Flame, Home as HomeIcon, ChevronRight, Calendar as CalendarIcon,
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import HotspotCard from '@/components/HotspotCard';
import HeatProgressBar from '@/components/HeatProgressBar';
import HeatBadge from '@/components/HeatBadge';
import DimensionTag from '@/components/DimensionTag';
import { useAppDate } from '@/contexts/DateContext';
import { DIMENSION_CONFIG, HEAT_CONFIG } from '@/data/types';
import type { Dimension } from '@/data/types';
import { useHotspots, useDimensions, useDailySnapshot, useProductsByDate, useScriptsByDate } from '@/hooks/useApi';
import { SOLAR_TERMS_2026 } from '@/data/calendar2026';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const fadeSlideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  Cloud, Leaf, Gift, Flame, Home: HomeIcon,
};

/* ---------- 根据月份获取动态天气信息 ---------- */
function getWeatherForMonth(month: number, dateStr: string) {
  const weatherMap: Record<number, { condition: string; icon: string; tip: string; tempRange: [number, number]; humidity: number }> = {
    1: { condition: '寒冷多云', icon: 'cloudy', tip: '寒潮来袭 → 取暖器/电暖毯需求上升', tempRange: [-2, 8], humidity: 65 },
    2: { condition: '阴转多云', icon: 'cloudy', tip: '倒春寒 → 取暖设备最后旺季', tempRange: [2, 12], humidity: 70 },
    3: { condition: '多云转晴', icon: 'sunny', tip: '春季装修季启动 → 装修建材需求上升', tempRange: [8, 18], humidity: 72 },
    4: { condition: '多云转阴', icon: 'cloudy', tip: '华南回南天 → 除湿机/烘干机需求飙升', tempRange: [14, 24], humidity: 78 },
    5: { condition: '晴间多云', icon: 'sunny', tip: '五一装修旺季 → 家电/软装需求高峰', tempRange: [18, 28], humidity: 75 },
    6: { condition: '晴转雷阵雨', icon: 'rainy', tip: '梅雨季节 → 除湿/防潮需求暴增', tempRange: [22, 32], humidity: 85 },
    7: { condition: '高温晴热', icon: 'hot', tip: '酷暑来袭 → 空调/风扇销售高峰', tempRange: [26, 38], humidity: 80 },
    8: { condition: '晴热多云', icon: 'hot', tip: '持续高温 → 制冷家电刚需', tempRange: [25, 36], humidity: 78 },
    9: { condition: '多云凉爽', icon: 'cloudy', tip: '秋高气爽 → 空气净化器/加湿器需求', tempRange: [18, 28], humidity: 68 },
    10: { condition: '凉爽多云', icon: 'cloudy', tip: '秋季装修旺季 → 装修/家电需求回升', tempRange: [12, 22], humidity: 65 },
    11: { condition: '阴冷', icon: 'cloudy', tip: '寒潮初现 → 取暖设备预热', tempRange: [5, 15], humidity: 70 },
    12: { condition: '寒冷', icon: 'snowy', tip: '寒冬腊月 → 取暖/暖冬家电高峰', tempRange: [-5, 8], humidity: 60 },
  };
  const w = weatherMap[month] || weatherMap[4];
  const day = parseInt(dateStr.split('-')[2]);
  const temp = w.tempRange[0] + Math.floor(((w.tempRange[1] - w.tempRange[0]) * (day % 10)) / 10);
  return {
    city: '杭州市',
    temperature: temp,
    condition: w.condition,
    icon: w.icon,
    tip: w.tip,
    humidity: w.humidity + (day % 5 - 2),
  };
}

/* ---------- 根据日期获取节气 ---------- */
function getSolarTermForDate(dateStr: string) {
  if (SOLAR_TERMS_2026[dateStr]) {
    return { name: SOLAR_TERMS_2026[dateStr], current: true, description: getSolarTermDesc(SOLAR_TERMS_2026[dateStr]) };
  }
  const dates = Object.keys(SOLAR_TERMS_2026).sort();
  let prev = dates[0];
  for (const d of dates) { if (d > dateStr) break; prev = d; }
  const prevDate = new Date(prev + 'T00:00:00');
  const currDate = new Date(dateStr + 'T00:00:00');
  const daysSince = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysToNext = 15 - daysSince;
  return { name: SOLAR_TERMS_2026[prev], current: false, description: getSolarTermDesc(SOLAR_TERMS_2026[prev]), daysSince, daysToNext };
}

function getSolarTermDesc(name: string): string {
  const map: Record<string, string> = {
    '立春': '东风解冻，蛰虫始振，鱼上冰', '雨水': '獭祭鱼，鸿雁来，草木萌动',
    '惊蛰': '桃始华，仓庚鸣，鹰化为鸠', '春分': '玄鸟至，雷乃发声，始电',
    '清明': '桐始华，田鼠化为鴽，虹始见', '谷雨': '萍始生，鸣鸠拂羽，戴胜降于桑',
    '立夏': '蝼蝈鸣，蚯蚓出，王瓜生', '小满': '苦菜秀，靡草死，麦秋至',
    '芒种': '螳螂生，鵙始鸣，反舌无声', '夏至': '鹿角解，蝉始鸣，半夏生',
    '小暑': '温风至，蟋蟀居壁，鹰始挚', '大暑': '腐草为萤，土润溽暑，大雨时行',
    '立秋': '凉风至，白露降，寒蝉鸣', '处暑': '鹰乃祭鸟，天地始肃，禾乃登',
    '白露': '鸿雁来，玄鸟归，群鸟养羞', '秋分': '雷始收声，蛰虫坯户，水始涸',
    '寒露': '鸿雁来宾，雀入大水为蛤，菊有黄华', '霜降': '豺乃祭兽，草木黄落，蛰虫咸俯',
    '立冬': '水始冰，地始冻，雉入大水为蜃', '小雪': '虹藏不见，天气上升，闭塞而成冬',
    '大雪': '鹖鴠不鸣，虎始交，荔挺出', '冬至': '蚯蚓结，麋角解，水泉动',
    '小寒': '雁北乡，鹊始巢，雉始雊', '大寒': '鸡乳，征鸟厉疾，水泽腹坚',
  };
  return map[name] || '';
}

/* ---------- 农历转换（简化版） ---------- */
function getLunarDate(_dateStr: string): string {
  return '丙午年 三月初六';
}

/* ---------- 加载中占位组件 ---------- */
const LoadingBlock: React.FC<{ height?: number }> = ({ height = 120 }) => (
  <div className="bg-bg-card border border-border-default rounded-xl p-5 animate-pulse" style={{ height }}>
    <div className="h-4 bg-bg-input rounded w-1/3 mb-3" />
    <div className="h-3 bg-bg-input rounded w-2/3 mb-2" />
    <div className="h-3 bg-bg-input rounded w-1/2" />
  </div>
);

/* ---------- 主组件 ---------- */
const Home: React.FC = () => {
  const { dateStr, formattedDate, weekdayName } = useAppDate();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeDimension, setActiveDimension] = useState<Dimension | null>(null);

  const month = parseInt(dateStr.split('-')[1]);
  const day = parseInt(dateStr.split('-')[2]);

  // tRPC API 调用
  const { data: apiHotspots, isLoading: hotspotsLoading } = useHotspots(dateStr);
  const { data: apiDimensions, isLoading: dimensionsLoading } = useDimensions(dateStr);
  const { data: apiSnapshot } = useDailySnapshot(dateStr);
  const { data: apiProducts, isLoading: productsLoading } = useProductsByDate(dateStr);
  const { data: apiScripts, isLoading: scriptsLoading } = useScriptsByDate(dateStr);

  // 动态天气（前端计算）
  const weather = useMemo(() => getWeatherForMonth(month, dateStr), [month, dateStr]);
  const solarTermData = useMemo(() => getSolarTermForDate(dateStr), [dateStr]);

  // 从API获取的热点
  const activeHotspots = apiHotspots || [];
  const filteredHotspots = activeDimension
    ? activeHotspots.filter((h) => h.dimension === activeDimension)
    : activeHotspots;

  // 维度总览
  const activeDimensions = apiDimensions || [];

  // 选品
  const activeProducts = apiProducts || [];

  // 话术
  const activeScripts = apiScripts || [];

  // 快照数据
  const snapshot = apiSnapshot;

  const handleCopyScript = (id: string, content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const weatherIconMap = {
    sunny: <Sun size={48} className="text-heat-3" />,
    rainy: <CloudRain size={48} className="text-accent-blue" />,
    snowy: <CloudSnow size={48} className="text-accent-teal" />,
    hot: <Sun size={48} className="text-heat-5" />,
    cloudy: <Cloud size={48} className="text-text-secondary" />,
  };

  // 飙升热点（从API数据中计算变化率）
  const trendingItems = useMemo(() => {
    return activeHotspots.map(h => {
      const trend = h.trend || [];
      const change = trend.length >= 2
        ? Math.round(((trend[trend.length - 1] - trend[0]) / (trend[0] || 1)) * 100)
        : 0;
      return {
        id: h.id,
        name: h.title,
        dimension: h.dimension,
        changePercent: Math.abs(change),
        trend,
      };
    }).sort((a, b) => b.changePercent - a.changePercent).slice(0, 4);
  }, [activeHotspots]);

  // 节假日（前端静态，后续可改为API）
  const upcomingHolidays = [
    { id: 'h001', name: '五一劳动节', date: '2026-05-01', monthDay: '5月1日', daysLeft: 9, description: '5天长假·装修+出行', heatLevel: 5 as 1|2|3|4|5 },
    { id: 'h002', name: '立夏', date: '2026-05-05', monthDay: '5月5日', daysLeft: 13, description: '节气热点：制冷预热', heatLevel: 4 as 1|2|3|4|5 },
    { id: 'h003', name: '母亲节', date: '2026-05-10', monthDay: '5月10日', daysLeft: 18, description: '送礼高峰·个护健康', heatLevel: 4 as 1|2|3|4|5 },
    { id: 'h004', name: '520', date: '2026-05-20', monthDay: '5月20日', daysLeft: 28, description: '情侣家电·小家电', heatLevel: 4 as 1|2|3|4|5 },
  ].filter(h => h.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div>
      <TopBar title="今日热点看板" subtitle={`${formattedDate} · ${weekdayName} · 实时数据`} />

      {/* Section 1 & 2: Hero + Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">
        {/* Hero */}
        <motion.div className="lg:col-span-3 relative rounded-2xl overflow-hidden p-8" style={{ minHeight: 200 }} {...fadeSlideUp}>
          <div className="absolute inset-0">
            <img src="/hero-heatmap-bg.png" alt="" className="w-full h-full object-cover opacity-40 animate-pulse-slow" />
            <div className="absolute inset-0 bg-gradient-to-r from-bg-base via-bg-base/80 to-transparent" />
          </div>
          <div className="relative z-10">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-4xl font-bold text-text-primary">{month}月{day}日</h2>
              </div>
              <p className="text-sm text-text-tertiary mb-1">{getLunarDate(dateStr)}</p>
              <p className="text-base text-text-secondary">{weekdayName}</p>
            </div>
            <div className="mb-4">
              {snapshot ? (
                <>
                  <p className="text-base text-text-secondary mb-1">
                    今日共发现 <span className="font-data text-xl font-bold text-accent-blue">{snapshot.totalHotspots}</span> 个有效热点
                  </p>
                  <p className="text-sm text-text-secondary mb-2">
                    其中高优先级 <span className="font-data text-base font-semibold text-heat-5">{snapshot.highPriorityCount}</span> 个
                  </p>
                  <p className="text-sm text-text-secondary">{snapshot.description}</p>
                </>
              ) : (
                <div className="h-16 bg-bg-input/50 rounded animate-pulse" />
              )}
            </div>
            <motion.div className="flex items-center gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
              <button className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
                查看全部热点 <ArrowRight size={14} />
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* Weather & Solar Term */}
        <motion.div className="lg:col-span-2 bg-bg-card rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}>
          <div className="flex items-start gap-4 mb-4 pb-4 border-b border-border-default">
            <div className="animate-float">{weatherIconMap[weather.icon as keyof typeof weatherIconMap]}</div>
            <div className="flex-1">
              <p className="text-xs text-text-tertiary mb-1">{weather.city}</p>
              <p className="font-data text-4xl font-bold text-text-primary mb-1">{weather.temperature}°C</p>
              <p className="text-sm text-text-secondary">{weather.condition}，湿度 {weather.humidity}%</p>
            </div>
          </div>
          <div className="bg-[rgba(10,132,255,0.08)] rounded-lg p-3 mb-4 flex items-center gap-2">
            <span className="text-sm text-accent-blue flex-1">{weather.tip}</span>
            <ChevronRight size={14} className="text-accent-blue flex-shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DimensionTag dimension="solar_term" size="sm" />
              <span className="text-xl font-bold text-accent-teal">{solarTermData.name}</span>
              {!solarTermData.current && <span className="text-xs text-text-muted">（已过{Math.abs(solarTermData.daysSince || 0)}天）</span>}
            </div>
            <p className="text-sm text-text-secondary mb-2">{solarTermData.description}</p>
            {solarTermData.daysToNext !== undefined && solarTermData.daysToNext > 0 && (
              <p className="text-xs text-text-tertiary">距下一个节气还有 <span className="text-accent-teal font-data">{solarTermData.daysToNext}</span> 天</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Section 3: Dimension Summaries */}
      <motion.div className="bg-bg-card rounded-xl p-5 mb-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-text-primary">热点强度总览</h3>
          {activeDimension && <button onClick={() => setActiveDimension(null)} className="text-xs text-accent-blue hover:underline">查看全部</button>}
        </div>
        {dimensionsLoading ? (
          <div className="grid grid-cols-5 gap-2">{[1,2,3,4,5].map(i => <LoadingBlock key={i} height={80} />)}</div>
        ) : (
          <div className="grid grid-cols-5 divide-x divide-border-default">
            {activeDimensions.map((dim, i) => {
              const DimIcon = ICON_MAP[DIMENSION_CONFIG[dim.dimension as Dimension].icon];
              const isActive = activeDimension === null || activeDimension === dim.dimension;
              return (
                <motion.button key={dim.dimension} className={`px-4 py-3 text-left transition-all duration-200 ${i > 0 ? 'pl-6' : ''} ${activeDimension === dim.dimension ? 'bg-bg-card-hover rounded-lg' : ''}`}
                  onClick={() => setActiveDimension(activeDimension === dim.dimension ? null : dim.dimension)}
                  style={{ opacity: isActive ? 1 : 0.6 }} whileHover={{ backgroundColor: 'rgba(26,34,53,1)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    {DimIcon && <DimIcon size={16} style={{ color: DIMENSION_CONFIG[dim.dimension as Dimension].color }} />}
                    <span className="text-sm text-text-secondary">{dim.label}</span>
                  </div>
                  <p className="text-sm text-text-primary font-medium mb-2 truncate">{dim.currentHotspot}</p>
                  <HeatProgressBar value={dim.heatScore} height={4} delay={i * 100} />
                  <div className="mt-2"><HeatBadge level={dim.heatLevel as 1|2|3|4|5} size="sm" /></div>
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Section 4 & 5: TOP Hotspots + Trending */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        {/* TOP Hotspots */}
        <motion.div className="lg:col-span-7 bg-bg-card rounded-xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary">今日热点 TOP {Math.min(filteredHotspots.length, 5)}</h2>
            <button className="text-xs text-accent-blue hover:underline">查看全部 →</button>
          </div>
          {hotspotsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <LoadingBlock key={i} height={100} />)}</div>
          ) : (
            <motion.div className="space-y-3" variants={staggerContainer} initial="initial" animate="animate">
              {filteredHotspots.slice(0, 5).map((hotspot, i) => (
                <motion.div key={hotspot.id} variants={staggerItem}>
                  <HotspotCard hotspot={hotspot as any} index={i} />
                </motion.div>
              ))}
              {filteredHotspots.length === 0 && <div className="text-center py-8 text-text-muted text-sm">当前日期暂无活跃热点</div>}
            </motion.div>
          )}
        </motion.div>

        {/* Trending */}
        <motion.div className="lg:col-span-5 bg-bg-card rounded-xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-text-primary">飙升热点</h2>
              <span className="text-xs text-text-tertiary bg-bg-input px-2 py-0.5 rounded">24h</span>
            </div>
          </div>
          {hotspotsLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <LoadingBlock key={i} height={60} />)}</div>
          ) : (
            <motion.div className="space-y-4" variants={staggerContainer} initial="initial" animate="animate">
              {trendingItems.map((item) => {
                const chartData = item.trend.map((v, idx) => ({ idx, value: v }));
                return (
                  <motion.div key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-bg-card-hover transition-colors group" variants={staggerItem}>
                    <div className="w-20 h-10 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <Area type="monotone" dataKey="value" stroke={DIMENSION_CONFIG[item.dimension].color} fill={DIMENSION_CONFIG[item.dimension].color} fillOpacity={0.15} strokeWidth={1.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
                      <DimensionTag dimension={item.dimension} showIcon={false} />
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-data text-sm font-semibold text-accent-green">+{item.changePercent}%</p>
                      <ChevronRight size={12} className="inline text-accent-green" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Section 6: Quick Products */}
      <motion.div className="bg-bg-card rounded-xl p-6 mb-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">快速选品推荐</h2>
            <p className="text-xs text-text-tertiary mt-0.5">基于今日热点，为您推荐以下选品</p>
          </div>
          <button className="text-xs text-accent-blue hover:underline">全部选品 →</button>
        </div>
        {productsLoading ? (
          <div className="flex gap-4">{[1,2,3,4].map(i => <div key={i} className="w-[200px] h-[260px] bg-bg-input rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory scrollbar-thin">
              {activeProducts.map((product, idx) => (
                <motion.div key={`${product.id}-${idx}`} className="flex-shrink-0 w-[200px] bg-bg-input rounded-xl p-4 cursor-pointer group snap-start"
                  whileHover={{ y: -4, scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <div className="w-full h-[160px] bg-bg-sidebar rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    <span className="text-2xl text-text-muted">{product.name.charAt(0)}</span>
                  </div>
                  <p className="text-sm text-text-primary font-medium truncate mb-1">{product.name}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: DIMENSION_CONFIG[product.dimension as Dimension].bgColor, color: DIMENSION_CONFIG[product.dimension as Dimension].color }}>
                      {product.reason}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">热度 {product.heatScore}</span>
                    <div className="flex-1"><HeatProgressBar value={product.heatScore} height={3} showValue={false} delay={idx * 60} /></div>
                  </div>
                </motion.div>
              ))}
              {activeProducts.length === 0 && <div className="text-center py-4 text-text-muted text-sm w-full">当前日期暂无推荐选品</div>}
            </div>
          </div>
        )}
      </motion.div>

      {/* Section 7 & 8: Scripts + Upcoming Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Scripts */}
        <motion.div className="bg-bg-card rounded-xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary">运营话术</h2>
            <button className="text-xs text-accent-blue hover:underline">话术库 →</button>
          </div>
          {scriptsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <LoadingBlock key={i} height={80} />)}</div>
          ) : (
            <motion.div className="space-y-3" variants={staggerContainer} initial="initial" animate="animate">
              {activeScripts.map((script) => (
                <motion.div key={script.scriptId} className="bg-bg-input rounded-lg p-4 group hover:border-border-hover border border-transparent transition-colors" variants={staggerItem}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HeatBadge level={script.heatLevel as 1|2|3|4|5} showStars={false} showLabel size="sm" />
                      <span className="text-xs text-text-tertiary">使用 {script.usageCount} 次</span>
                    </div>
                    <button onClick={() => handleCopyScript(script.scriptId, script.content)} className="p-1.5 rounded-md hover:bg-bg-elevated transition-colors">
                      {copiedId === script.scriptId ? <Check size={14} className="text-accent-green" /> : <Copy size={14} className="text-text-tertiary" />}
                    </button>
                  </div>
                  <p className="text-sm text-text-primary line-clamp-3 leading-relaxed">{script.content}</p>
                </motion.div>
              ))}
              {activeScripts.length === 0 && <div className="text-center py-6 text-text-muted text-sm">当前日期暂无推荐话术</div>}
            </motion.div>
          )}
        </motion.div>

        {/* Upcoming Holidays */}
        <motion.div className="bg-bg-card rounded-xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary">近期节假日</h2>
            <button className="text-xs text-accent-blue hover:underline">完整日历 →</button>
          </div>
          <motion.div className="space-y-3" variants={staggerContainer} initial="initial" animate="animate">
            {upcomingHolidays.slice(0, 5).map((holiday) => (
              <motion.div key={holiday.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-bg-card-hover transition-colors group cursor-pointer" variants={staggerItem}>
                <div className="bg-bg-input rounded-lg px-3 py-2 text-center min-w-[56px]">
                  <p className="font-data text-base font-semibold text-text-primary">{holiday.date.split('-')[2]}</p>
                  <p className="text-[10px] text-text-tertiary">{holiday.monthDay.split('月')[0]}月</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-text-primary">{holiday.name}</p>
                    <span className="text-xs text-accent-blue">还有 {holiday.daysLeft} 天</span>
                  </div>
                  <p className="text-sm text-text-secondary truncate">{holiday.description}</p>
                </div>
                <HeatBadge level={holiday.heatLevel} size="sm" />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
