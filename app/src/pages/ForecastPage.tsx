import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useHotspots } from '@/hooks/useApi';
import { useAppDate } from '@/contexts/DateContext';
import {
  Search, ArrowUpDown, Flame, Clock,
  Grid3X3, ChevronRight, Zap, AlertTriangle,
  Cloud, Leaf, Gift, Home as HomeIcon, Sparkles,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts';
import TopBar from '@/components/TopBar';
import DimensionTag from '@/components/DimensionTag';
import HeatBadge from '@/components/HeatBadge';
import {
  topHotspots, upcomingHolidays,
  getHeatProgressColor,
} from '@/data/hotspotRulebook';
import { DIMENSION_CONFIG } from '@/data/types';
import type { Dimension, HeatLevel } from '@/data/types';

/* ─────────────────────── animation helpers ─────────────────────── */
const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];



const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

const timelineItemAnim = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease } },
};

const cardStagger = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const cardItemAnim = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease } },
};

/* ─────────────────────── forecast data generator ─────────────────────── */
interface ForecastEntry {
  date: string;
  monthDay: string;
  weekDay: string;
  isToday: boolean;
  hotspots: ForecastHotspot[];
}

interface ForecastHotspot {
  id: string;
  title: string;
  dimension: Dimension;
  heatLevel: HeatLevel;
  heatScore: number;
  description: string;
  productCount: number;
  sourceId: string;
  metricLabel?: string;
  metricValue?: string;
  metricDirection?: 'up' | 'down';
}

const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function addDays(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function fmtMonthDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function fmtWeekDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return WEEK_DAYS[d.getDay()];
}

function generateForecastData(baseDate: string, days: number, hotspotList: any[], holidays: any[]): ForecastEntry[] {
  const entries: ForecastEntry[] = [];
  /* Map existing hotspots to future days by projecting their trends */
  const hotspotProjections: ForecastHotspot[][] = [];

  for (let i = 0; i < days; i++) {
    const dateStr = addDays(baseDate, i + 1);
    const dayHotspots: ForecastHotspot[] = [];

    // Project each existing hotspot onto this future day
    hotspotList.forEach((h) => {
      const [startStr, endStr] = h.dateRange;
      const start = new Date(startStr + 'T00:00:00');
      const end = new Date(endStr + 'T00:00:00');
      const cur = new Date(dateStr + 'T00:00:00');

      if (cur >= start && cur <= end) {
        const dayIndex = Math.floor(
          (cur.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        );
        const trend = h.trend || [];
        const trendIdx = Math.min(dayIndex, trend.length - 1);
        const projectedScore = trend[trendIdx] ?? h.heatScore;
        const lvl: HeatLevel =
          projectedScore >= 85 ? 5 :
          projectedScore >= 65 ? 4 :
          projectedScore >= 45 ? 3 :
          projectedScore >= 25 ? 2 : 1;

        dayHotspots.push({
          id: `${h.id}-day-${i}`,
          title: h.title,
          dimension: h.dimension,
          heatLevel: lvl,
          heatScore: projectedScore,
          description: h.description,
          productCount: h.relatedProducts?.length || 0,
          sourceId: h.id,
          metricLabel: h.metricLabel,
          metricValue: h.metricValue,
          metricDirection: h.metricDirection,
        });
      }
    });

    // Add holiday-based hotspots from holidays
    holidays.forEach((uh) => {
      if (uh.date === dateStr) {
        const existing = dayHotspots.find(
          (d) => d.title.includes(uh.name) || uh.name.includes(d.title)
        );
        if (!existing) {
          dayHotspots.push({
            id: `holiday-${uh.id}-${i}`,
            title: uh.name,
            dimension: 'holiday',
            heatLevel: uh.heatLevel,
            heatScore: uh.heatLevel === 5 ? 90 : uh.heatLevel === 4 ? 72 : 55,
            description: uh.description,
            productCount: 2,
            sourceId: uh.id,
          });
        }
      }
    });

    // Add a few extra forecast-only entries for variety
    if (i === 2) {
      dayHotspots.push({
        id: `forecast-rain-${i}`,
        title: '持续阴雨·第7天',
        dimension: 'weather',
        heatLevel: 3,
        heatScore: 55,
        description: '连续降雨进入第7天，除湿需求开始减弱',
        productCount: 2,
        sourceId: 'hotspot-002',
      });
    }
    if (i === 5) {
      dayHotspots.push({
        id: `forecast-spring-${i}`,
        title: '春季家装备货',
        dimension: 'renovation',
        heatLevel: 3,
        heatScore: 48,
        description: '立春临近，春季家装开始预热',
        productCount: 3,
        sourceId: 'hotspot-005',
      });
    }
    if (i === 8) {
      dayHotspots.push({
        id: `forecast-clean-${i}`,
        title: '年底大扫除冲刺',
        dimension: 'trend',
        heatLevel: 4,
        heatScore: 68,
        description: '年终大扫除进入最后高峰',
        productCount: 4,
        sourceId: 'hotspot-003',
      });
    }

    hotspotProjections.push(dayHotspots);
  }

  for (let i = 0; i < days; i++) {
    const dateStr = addDays(baseDate, i + 1);
    entries.push({
      date: dateStr,
      monthDay: fmtMonthDay(dateStr),
      weekDay: fmtWeekDay(dateStr),
      isToday: i === -1,
      hotspots: hotspotProjections[i] || [],
    });
  }

  return entries;
}

/* ─────────────────────── sorting helpers ─────────────────────── */
type SortMode = 'heat' | 'time' | 'dimension';

function sortForecastEntries(entries: ForecastEntry[], mode: SortMode): ForecastEntry[] {
  if (mode === 'time') return entries;

  return entries.map((e) => ({
    ...e,
    hotspots: [...e.hotspots].sort((a, b) => {
      if (mode === 'heat') return b.heatScore - a.heatScore;
      if (mode === 'dimension') return a.dimension.localeCompare(b.dimension);
      return 0;
    }),
  }));
}

/* ─────────────────────── dimension icon map ─────────────────────── */
const DIM_ICON: Record<Dimension, React.ReactNode> = {
  weather: <Cloud size={14} />,
  solar_term: <Leaf size={14} />,
  holiday: <Gift size={14} />,
  trend: <Sparkles size={14} />,
  renovation: <HomeIcon size={14} />,
};

/* ─────────────────────── main component ─────────────────────── */
const TIME_RANGES = [
  { label: '未来7天', days: 7 },
  { label: '未来30天', days: 30 },
  { label: '未来90天', days: 90 },
];

const SORT_OPTIONS: { value: SortMode; label: string; icon: React.ReactNode }[] = [
  { value: 'time', label: '按时间', icon: <Clock size={14} /> },
  { value: 'heat', label: '按热度', icon: <Flame size={14} /> },
  { value: 'dimension', label: '按维度', icon: <Grid3X3 size={14} /> },
];

const DIMENSIONS: Dimension[] = ['weather', 'solar_term', 'holiday', 'trend', 'renovation'];

const ForecastPage: React.FC = () => {
  const navigate = useNavigate();
  const { dateStr } = useAppDate();
  const { data: apiHotspots } = useHotspots(dateStr);

  const [rangeIdx, setRangeIdx] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('time');
  const [activeDimensions, setActiveDimensions] = useState<Set<Dimension>>(new Set(DIMENSIONS));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const days = TIME_RANGES[rangeIdx].days;
  const baseDate = dateStr;

  // 使用API数据或静态数据
  const hotspotList = apiHotspots || [];
  const holidays = upcomingHolidays;

  /* raw forecast data */
  const rawForecast = useMemo(
    () => generateForecastData(baseDate, days, hotspotList, holidays),
    [baseDate, days, hotspotList, holidays]
  );

  /* apply dimension filter + search */
  const filteredForecast = useMemo(() => {
    return rawForecast
      .map((entry) => ({
        ...entry,
        hotspots: entry.hotspots.filter((h) => {
          const dimMatch = activeDimensions.has(h.dimension);
          const searchMatch =
            !searchQuery ||
            h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            h.description.toLowerCase().includes(searchQuery.toLowerCase());
          return dimMatch && searchMatch;
        }),
      }))
      .filter((entry) => entry.hotspots.length > 0);
  }, [rawForecast, activeDimensions, searchQuery]);

  /* apply sorting */
  const forecast = useMemo(
    () => sortForecastEntries(filteredForecast, sortMode),
    [filteredForecast, sortMode]
  );

  /* stats */
  const stats = useMemo(() => {
    let total = 0;
    let fiveStar = 0;
    const dimCounts: Record<Dimension, number> = {
      weather: 0, solar_term: 0, holiday: 0, trend: 0, renovation: 0,
    };
    const allHotspots: ForecastHotspot[] = [];

    forecast.forEach((e) => {
      e.hotspots.forEach((h) => {
        total++;
        if (h.heatLevel === 5) fiveStar++;
        dimCounts[h.dimension]++;
        allHotspots.push(h);
      });
    });

    const uniqueProducts = new Set(
      allHotspots.map((h) => h.sourceId)
    ).size;

    const sortedByHeat = [...allHotspots].sort((a, b) => b.heatScore - a.heatScore);
    const topHotspot = sortedByHeat[0];

    return { total, fiveStar, dimCounts, uniqueProducts, topHotspot, allHotspots };
  }, [forecast]);

  /* trend data for mini chart */
  const trendData = useMemo(() => {
    return forecast.slice(0, 14).map((e) => ({
      date: e.monthDay,
      avgHeat: e.hotspots.length > 0
        ? Math.round(e.hotspots.reduce((s, h) => s + h.heatScore, 0) / e.hotspots.length)
        : 0,
    }));
  }, [forecast]);

  /* dimension distribution data */
  const dimDistData = useMemo(() => {
    return DIMENSIONS.map((d) => ({
      dimension: d,
      label: DIMENSION_CONFIG[d].label,
      count: stats.dimCounts[d],
      color: DIMENSION_CONFIG[d].color,
    })).filter((d) => d.count > 0);
  }, [stats.dimCounts]);

  /* action suggestions */
  const suggestions = useMemo(() => {
    const sugs: { text: string; color: string; icon: React.ReactNode }[] = [];
    if (stats.fiveStar > 0) {
      sugs.push({
        text: `${stats.fiveStar}个5星热点即将到来，提前备足库存`,
        color: '#FF3B30',
        icon: <Zap size={14} />,
      });
    }
    const weatherCount = stats.dimCounts.weather;
    if (weatherCount > 0) {
      sugs.push({
        text: '天气驱动热点持续，关注除湿/取暖品类',
        color: '#0A84FF',
        icon: <Cloud size={14} />,
      });
    }
    const holidayCount = stats.dimCounts.holiday;
    if (holidayCount > 0) {
      sugs.push({
        text: `节假日热点${holidayCount}个，大促流量预计大幅提升`,
        color: '#FF375F',
        icon: <Gift size={14} />,
      });
    }
    if (sugs.length === 0) {
      sugs.push({
        text: '暂无特别行动建议，保持常规运营节奏',
        color: '#8E8E93',
        icon: <AlertTriangle size={14} />,
      });
    }
    return sugs.slice(0, 3);
  }, [stats]);

  /* toggle dimension filter */
  const toggleDimension = useCallback((d: Dimension) => {
    setActiveDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(d)) {
        if (next.size > 1) next.delete(d);
      } else {
        next.add(d);
      }
      return next;
    });
  }, []);

  /* handle card click */
  const handleCardClick = useCallback(
    (sourceId: string) => {
      navigate(`/hotspot/${sourceId}`);
    },
    [navigate]
  );

  return (
    <div>
      <TopBar
        title="未来预告"
        subtitle={`${TIME_RANGES[rangeIdx].label}热点预告 · 帮助运营提前排期`}
      />

      {/* ═══════════ Section 1: Control Bar ═══════════ */}
      <motion.div
        className="bg-bg-card border border-border-default rounded-xl px-6 py-3 mb-5 flex flex-wrap items-center justify-between gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        {/* Left: time range toggle */}
        <div className="flex items-center bg-bg-input rounded-lg p-1">
          {TIME_RANGES.map((t, i) => (
            <button
              key={t.days}
              onClick={() => setRangeIdx(i)}
              className={`relative px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                i === rangeIdx ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {i === rangeIdx && (
                <motion.div
                  layoutId="range-indicator"
                  className="absolute inset-0 bg-bg-card rounded-md shadow-sm"
                  style={{ border: '1px solid #1E293B' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Right: sort + dimension filter + search */}
        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-input border border-border-default rounded-lg text-sm text-text-secondary hover:border-border-hover transition-colors">
              <ArrowUpDown size={14} />
              <span>
                {SORT_OPTIONS.find((s) => s.value === sortMode)?.label}
              </span>
            </button>
            <div className="absolute top-full right-0 mt-1 w-32 bg-bg-elevated border border-border-default rounded-lg shadow-card overflow-hidden opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-150 z-30">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortMode(opt.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    sortMode === opt.value
                      ? 'bg-accent-blue/10 text-accent-blue'
                      : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimension filter dots */}
          <div className="flex items-center gap-1.5">
            {DIMENSIONS.map((d) => {
              const active = activeDimensions.has(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleDimension(d)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                    active ? 'scale-100' : 'scale-90 opacity-40'
                  }`}
                  style={{
                    backgroundColor: active
                      ? DIMENSION_CONFIG[d].color + '25'
                      : 'transparent',
                    border: `1.5px solid ${active ? DIMENSION_CONFIG[d].color : '#475569'}`,
                  }}
                  title={DIMENSION_CONFIG[d].label}
                >
                  <span
                    style={{
                      color: active ? DIMENSION_CONFIG[d].color : '#475569',
                      display: 'flex',
                    }}
                  >
                    {DIM_ICON[d]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div
            className={`flex items-center bg-bg-input border rounded-lg transition-all duration-200 overflow-hidden ${
              searchFocused ? 'border-accent-blue w-56' : 'border-border-default w-40'
            }`}
          >
            <Search size={14} className="ml-2.5 text-text-muted flex-shrink-0" />
            <input
              type="text"
              placeholder="搜索未来热点..."
              className="bg-transparent text-sm text-text-primary placeholder-text-muted px-2 py-1.5 outline-none w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mr-2 text-text-muted hover:text-text-secondary"
              >
                <span className="text-xs">✕</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══════════ Main Content: Timeline + Stats ═══════════ */}
      <div className="flex gap-5">
        {/* ─────────── Left: Timeline (70%) ─────────── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${rangeIdx}-${sortMode}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease }}
            >
              {forecast.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-20">
                  <img
                    src="/empty-state.svg"
                    alt=""
                    className="w-32 h-32 mb-4 opacity-50"
                  />
                  <h3 className="text-lg font-semibold text-text-secondary mb-2">
                    没有匹配的热点
                  </h3>
                  <p className="text-sm text-text-tertiary mb-4">
                    尝试调整筛选条件或时间范围
                  </p>
                  <button
                    onClick={() => {
                      setActiveDimensions(new Set(DIMENSIONS));
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 bg-bg-card border border-border-default rounded-lg text-sm text-text-secondary hover:border-border-hover transition-colors"
                  >
                    清除筛选
                  </button>
                </div>
              ) : (
                <motion.div
                  className="relative"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {/* Vertical timeline line */}
                  <div
                    className="absolute left-[50px] top-0 bottom-0 w-[2px] bg-border-default"
                    style={{ zIndex: 1 }}
                  />

                  {forecast.map((entry, idx) => (
                    <TimelineRow
                      key={entry.date}
                      entry={entry}
                      index={idx}
                      onCardClick={handleCardClick}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ─────────── Right: Stats Panel (30%) ─────────── */}
        <motion.div
          className="w-[300px] flex-shrink-0 space-y-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Stat Card 1: Overview */}
          <motion.div
            className="bg-bg-card border border-border-default rounded-xl p-5"
            variants={staggerItem}
          >
            <h3 className="text-base font-semibold text-text-primary mb-4">
              预告统计
            </h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="font-data text-4xl font-bold text-text-primary">
                {stats.total}
              </span>
              <span className="text-sm text-text-tertiary">个热点</span>
            </div>
            <div className="text-xs text-text-tertiary mb-4">
              {TIME_RANGES[rangeIdx].label}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-heat-5" />
                  <span className="text-text-secondary">高优先级</span>
                </span>
                <span className="font-data font-semibold text-heat-5">
                  {stats.fiveStar} 个
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-heat-3" />
                  <span className="text-text-secondary">中优先级</span>
                </span>
                <span className="font-data font-semibold text-heat-3">
                  {stats.allHotspots.filter((h) => h.heatLevel === 3).length} 个
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-heat-1" />
                  <span className="text-text-secondary">一般</span>
                </span>
                <span className="font-data font-semibold text-heat-1">
                  {stats.allHotspots.filter((h) => h.heatLevel <= 2).length} 个
                </span>
              </div>
            </div>
          </motion.div>

          {/* Stat Card 2: Dimension Distribution */}
          <motion.div
            className="bg-bg-card border border-border-default rounded-xl p-5"
            variants={staggerItem}
          >
            <h3 className="text-base font-semibold text-text-primary mb-4">
              维度分布
            </h3>
            <div className="space-y-3">
              {dimDistData.map((d) => (
                <div key={d.dimension} className="group cursor-pointer" onClick={() => toggleDimension(d.dimension)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-secondary flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      {d.label}
                    </span>
                    <span className="font-data text-sm font-semibold text-text-primary">
                      {d.count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-bg-input rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: d.color }}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${stats.total > 0 ? (d.count / Math.max(...dimDistData.map((dd) => dd.count))) * 100 : 0}%`,
                      }}
                      transition={{ duration: 0.8, ease, delay: 0.2 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Stat Card 3: Heat Trend Mini Chart */}
          <motion.div
            className="bg-bg-card border border-border-default rounded-xl p-5"
            variants={staggerItem}
          >
            <h3 className="text-base font-semibold text-text-primary mb-4">
              热度走势
            </h3>
            <div style={{ height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="forecast-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0A84FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#162033',
                      border: '1px solid #1E293B',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#F1F5F9',
                    }}
                    formatter={(value: number) => [`${value}°`, '平均热度']}
                    labelFormatter={(label: string) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgHeat"
                    stroke="#0A84FF"
                    strokeWidth={2}
                    fill="url(#forecast-grad)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#0A84FF', stroke: '#0A0E1A', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center text-xs text-text-muted font-data">
              平均热度趋势
            </div>
          </motion.div>

          {/* Stat Card 4: Action Suggestions */}
          <motion.div
            className="bg-bg-card border border-border-default rounded-xl p-5"
            variants={staggerItem}
          >
            <h3 className="text-base font-semibold text-text-primary mb-4">
              行动建议
            </h3>
            <div className="space-y-3">
              {suggestions.map((sug, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span style={{ color: sug.color, marginTop: 2, flexShrink: 0 }}>
                    {sug.icon}
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: sug.color }}>
                    {sug.text}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

/* ═══════════════════ Timeline Row Sub-Component ═══════════════════ */
interface TimelineRowProps {
  entry: ForecastEntry;
  index: number;
  onCardClick: (sourceId: string) => void;
}

const TimelineRow: React.FC<TimelineRowProps> = ({ entry, index, onCardClick }) => {
  return (
    <motion.div
      className="flex gap-4 mb-6 relative"
      variants={timelineItemAnim}
      custom={index}
    >
      {/* Date block */}
      <div
        className="w-[100px] flex-shrink-0 text-right pr-4 relative"
        style={{ zIndex: 2 }}
      >
        <div className="inline-block text-right">
          <p className="text-sm font-semibold text-text-primary">
            {entry.monthDay}
          </p>
          <p className="text-xs text-text-tertiary">{entry.weekDay}</p>
        </div>

        {/* Timeline dot */}
        <div
          className="absolute right-[-5px] top-1.5 w-[10px] h-[10px] rounded-full border-2 border-bg-base"
          style={{
            backgroundColor:
              entry.hotspots.length > 0
                ? getHeatProgressColor(
                    Math.max(...entry.hotspots.map((h) => h.heatScore))
                  )
                : '#1E293B',
            zIndex: 3,
          }}
        />
      </div>

      {/* Hotspot cards */}
      <motion.div
        className="flex-1 min-w-0 space-y-3"
        variants={cardStagger}
        initial="initial"
        animate="animate"
      >
        {entry.hotspots.map((h) => (
          <TimelineCard key={h.id} hotspot={h} onClick={() => onCardClick(h.sourceId)} />
        ))}
      </motion.div>
    </motion.div>
  );
};

/* ═══════════════════ Timeline Card Sub-Component ═══════════════════ */
interface TimelineCardProps {
  hotspot: ForecastHotspot;
  onClick: () => void;
}

const TimelineCard: React.FC<TimelineCardProps> = ({ hotspot, onClick }) => {
  const heatColor = getHeatProgressColor(hotspot.heatScore);
  const isHighHeat = hotspot.heatLevel >= 4;

  return (
    <motion.div
      className="bg-bg-card border border-border-default rounded-xl p-4 cursor-pointer relative overflow-hidden group"
      variants={cardItemAnim}
      whileHover={{ y: -2, borderColor: '#334155' }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Top shimmer on hover */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${heatColor}, transparent)`,
        }}
      />

      {/* 5-star highlight glow */}
      {hotspot.heatLevel === 5 && (
        <div
          className="absolute top-0 right-0 w-16 h-16 opacity-10"
          style={{
            background: 'radial-gradient(circle, #FF3B30 0%, transparent 70%)',
          }}
        />
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <DimensionTag dimension={hotspot.dimension} />
          <HeatBadge level={hotspot.heatLevel} showStars={false} />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-xs text-accent-blue flex items-center gap-0.5">
            详情 <ChevronRight size={12} />
          </span>
        </div>
      </div>

      <h4 className="text-base font-semibold text-text-primary mb-1 group-hover:text-white transition-colors">
        {isHighHeat && <Flame size={16} className="inline mr-1 text-heat-5" />}
        {hotspot.title}
      </h4>

      {hotspot.metricValue && (
        <div className="mb-1.5">
          <span
            className="font-data text-xs font-semibold"
            style={{
              color: hotspot.metricDirection === 'up' ? '#30D158' : '#FF453A',
            }}
          >
            {hotspot.metricLabel} {hotspot.metricValue}
          </span>
        </div>
      )}

      <p className="text-sm text-text-secondary mb-2 line-clamp-2">
        {hotspot.description}
      </p>

      <div className="flex items-center justify-between">
        {/* Heat progress */}
        <div className="flex items-center gap-2 flex-1 mr-4">
          <div className="flex-1 bg-bg-input rounded-full overflow-hidden" style={{ height: 4 }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${hotspot.heatScore}%`,
                backgroundColor: heatColor,
              }}
            />
          </div>
          <span
            className="font-data text-xs font-semibold"
            style={{ color: heatColor, minWidth: 28, textAlign: 'right' }}
          >
            {hotspot.heatScore}
          </span>
        </div>

        <span className="text-xs text-text-tertiary bg-bg-input px-2 py-0.5 rounded flex-shrink-0">
          {hotspot.productCount}款选品
        </span>
      </div>

      {/* Bottom heat indicator */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-15"
        style={{ backgroundColor: heatColor }}
      />
    </motion.div>
  );
};

export default ForecastPage;
