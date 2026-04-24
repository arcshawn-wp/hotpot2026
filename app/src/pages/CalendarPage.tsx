import React, { useState, useCallback, useMemo } from 'react';
import { getGlobalHotspots, setGlobalHotspots } from '@/stores/hotspotStore';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  X,
  ChevronDown,
  ArrowRight,
  Bookmark,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TopBar from '@/components/TopBar';
import DimensionTag from '@/components/DimensionTag';
import HeatBadge from '@/components/HeatBadge';
import { CALENDAR_2026, WEEKDAY_LABELS } from '@/data/calendar2026';
import type { CalendarDay } from '@/data/calendar2026';
import { useAppDate } from '@/contexts/DateContext';
import { useHotspots } from '@/hooks/useApi';
import {
  DIMENSION_CONFIG,
  HEAT_CONFIG,
} from '@/data/types';
import type { Dimension, HeatLevel, Hotspot } from '@/data/types';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FilterState {
  dimensions: Dimension[];
  heatLevels: HeatLevel[];
  keyword: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */


const ALL_DIMENSIONS: Dimension[] = ['weather', 'solar_term', 'holiday', 'trend', 'renovation'];
const ALL_HEAT_LEVELS: HeatLevel[] = [5, 4, 3, 2, 1];

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Check if a date string falls within a hotspot's date range (inclusive) */
function isDateInRange(dateStr: string, range: [string, string]): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const start = new Date(range[0] + 'T00:00:00');
  const end = new Date(range[1] + 'T00:00:00');
  return d >= start && d <= end;
}

/** Get all hotspots active on a given calendar day */
function getHotspotsForDay(day: CalendarDay): Hotspot[] {
  return getGlobalHotspots().filter((h) => isDateInRange(day.date, h.dateRange));
}

/** Get the max heat score for a day based on its hotspots */
function getDayHeatScore(day: CalendarDay): number {
  const dayHotspots = getHotspotsForDay(day);
  if (dayHotspots.length === 0) return day.heatScore;
  return Math.max(...dayHotspots.map((h) => h.heatScore));
}


/** Filter hotspots by dimension, heat level, keyword */
function filterHotspots(
  hotspots: Hotspot[],
  filters: FilterState
): Hotspot[] {
  return hotspots.filter((h) => {
    if (filters.dimensions.length > 0 && !filters.dimensions.includes(h.dimension)) return false;
    if (filters.heatLevels.length > 0 && !filters.heatLevels.includes(h.heatLevel)) return false;
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      return (
        h.title.toLowerCase().includes(kw) ||
        h.description.toLowerCase().includes(kw)
      );
    }
    return true;
  });
}

/** Get border color based on heat score */
function getHeatBorderColor(score: number): string {
  if (score >= 85) return 'rgba(255,59,48,0.6)';
  if (score >= 65) return 'rgba(255,149,0,0.5)';
  if (score >= 45) return 'rgba(255,204,0,0.4)';
  if (score >= 25) return 'rgba(52,199,89,0.35)';
  return 'transparent';
}

/** Get background tint based on heat score */
function getHeatBgTint(score: number): string {
  if (score >= 85) return 'rgba(255,59,48,0.06)';
  if (score >= 65) return 'rgba(255,149,0,0.05)';
  if (score >= 45) return 'rgba(255,204,0,0.04)';
  if (score >= 25) return 'rgba(52,199,89,0.04)';
  return 'transparent';
}

/** Format month label */
function formatMonthLabel(year: number, month: number): string {
  return `${year}年 ${month}月`;
}

/** Get month data from CALENDAR_2026 */
function getMonthData(year: number, month: number) {
  return CALENDAR_2026.find((m) => m.year === year && m.month === month) || CALENDAR_2026[0];
}

/** Get all hotspots for a month */
function getMonthHotspots(month: number): { day: CalendarDay; hotspots: Hotspot[] }[] {
  const monthData = getMonthData(2026, month);
  const result: { day: CalendarDay; hotspots: Hotspot[] }[] = [];
  monthData.days.forEach((day) => {
    const dayHotspots = getHotspotsForDay(day);
    if (dayHotspots.length > 0) {
      result.push({ day, hotspots: dayHotspots });
    }
  });
  return result;
}

/* ------------------------------------------------------------------ */
/*  CalendarCell                                                       */
/* ------------------------------------------------------------------ */

interface CalendarCellProps {
  day: CalendarDay;
  isCurrentMonth: boolean;
  isSelected: boolean;
  onSelect: (day: CalendarDay) => void;
  filters: FilterState;
}

const CalendarCell: React.FC<CalendarCellProps> = ({
  day,
  isCurrentMonth,
  isSelected,
  onSelect,
  filters,
}) => {
  const hotspots = useMemo(() => {
    const hs = getHotspotsForDay(day);
    return filterHotspots(hs, filters);
  }, [day, filters]);

  const strongest = useMemo(() => {
    const hs = getHotspotsForDay(day);
    return hs.length > 0 ? hs.reduce((a, b) => (a.heatScore >= b.heatScore ? a : b)) : null;
  }, [day]);

  const heatScore = getDayHeatScore(day);
  const hasHotspots = hotspots.length > 0;
  const isToday = day.isToday ?? false;

  const handleClick = useCallback(() => {
    onSelect(day);
  }, [day, onSelect]);

  // Limit displayed hotspots to 2 for space
  const visibleHotspots = hotspots.slice(0, 2);
  const extraCount = hotspots.length - visibleHotspots.length;

  return (
    <motion.div
      layout
      onClick={handleClick}
      className={cn(
        'relative flex flex-col p-1.5 cursor-pointer min-h-[100px] transition-colors duration-150',
        'border border-border-default rounded-sm overflow-hidden'
      )}
      style={{
        backgroundColor: isSelected
          ? 'rgba(10,132,255,0.08)'
          : isToday
          ? 'rgba(10,132,255,0.04)'
          : getHeatBgTint(heatScore),
        borderTop: isToday ? '2px solid #0A84FF' : undefined,
        borderColor: isSelected ? '#0A84FF' : undefined,
      }}
      whileHover={{
        backgroundColor: '#1A2235',
        borderColor: '#334155',
        transition: { duration: 0.15 },
      }}
    >
      {/* Date number */}
      <div className="flex items-center justify-between mb-0.5">
        <span
          className={cn(
            'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
            isToday
              ? 'bg-accent-blue/15 text-accent-blue'
              : isSelected
              ? 'bg-accent-blue text-white'
              : isCurrentMonth
              ? 'text-text-secondary'
              : 'text-text-muted'
          )}
        >
          {day.day}
        </span>
        {/* Holiday / Solar term badge */}
        {day.holidays && day.holidays.length > 0 && (
          <span className="text-[10px] font-medium text-accent-pink truncate max-w-[70px]">
            {day.holidays[0]}
          </span>
        )}
        {!day.holidays && day.solarTerm && (
          <span className="text-[10px] font-medium text-accent-teal truncate max-w-[70px]">
            {day.solarTerm}
          </span>
        )}
      </div>

      {/* Heat score indicator bar */}
      {heatScore > 0 && (
        <div className="w-full h-[2px] rounded-full mb-1" style={{ backgroundColor: getHeatBorderColor(heatScore) }} />
      )}

      {/* Hotspot items */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        {visibleHotspots.map((hotspot) => {
          const dimColor = DIMENSION_CONFIG[hotspot.dimension].color;
          return (
            <div
              key={hotspot.id}
              className="flex items-center gap-1 rounded px-1 py-[1px] truncate"
              style={{ backgroundColor: `${dimColor}12` }}
            >
              <span className="w-[3px] h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dimColor }} />
              <span className="text-[10px] truncate" style={{ color: dimColor }}>
                {hotspot.title}
              </span>
            </div>
          );
        })}
        {extraCount > 0 && (
          <span className="text-[10px] text-text-tertiary pl-1">+{extraCount} 更多</span>
        )}
      </div>

      {/* Bottom heat dot */}
      {strongest && (
        <div className="flex justify-end mt-auto pt-0.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: DIMENSION_CONFIG[strongest.dimension].color }}
            title={`${strongest.title} · 热度 ${strongest.heatScore}`}
          />
        </div>
      )}

      {/* Hover overlay hint */}
      <AnimatePresence>
        {hasHotspots && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-t from-bg-card-hover/80 to-transparent pointer-events-none flex items-end justify-center pb-1"
          >
            <span className="text-[10px] text-text-tertiary">点击查看详情</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  FilterPanel                                                        */
/* ------------------------------------------------------------------ */

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  currentMonth: number;
  onJumpToMonth: (month: number) => void;
  onSelectDate: (day: CalendarDay) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  currentMonth,
  onJumpToMonth,
  onSelectDate,
}) => {
  const toggleDimension = useCallback(
    (dim: Dimension) => {
      onChange({
        ...filters,
        dimensions: filters.dimensions.includes(dim)
          ? filters.dimensions.filter((d) => d !== dim)
          : [...filters.dimensions, dim],
      });
    },
    [filters, onChange]
  );

  const toggleHeatLevel = useCallback(
    (level: HeatLevel) => {
      onChange({
        ...filters,
        heatLevels: filters.heatLevels.includes(level)
          ? filters.heatLevels.filter((l) => l !== level)
          : [...filters.heatLevels, level],
      });
    },
    [filters, onChange]
  );

  const monthHotspots = useMemo(() => getMonthHotspots(currentMonth), [currentMonth]);

  const quickJumpButtons = [
    { label: '今天', action: () => onJumpToMonth(1) },
    { label: '本月', action: () => onJumpToMonth(currentMonth) },
    { label: '春季', action: () => onJumpToMonth(3) },
    { label: '夏季', action: () => onJumpToMonth(6) },
    { label: '秋季', action: () => onJumpToMonth(9) },
    { label: '冬季', action: () => onJumpToMonth(12) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="w-[260px] flex-shrink-0 bg-bg-card rounded-xl p-5 border border-border-default flex flex-col gap-5"
    >
      {/* Keyword search */}
      <div>
        <h4 className="text-text-primary font-semibold text-base mb-3">关键词搜索</h4>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="搜索热点..."
            value={filters.keyword}
            onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
            className="w-full bg-bg-input border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted pl-8 pr-3 py-2 outline-none focus:border-border-focus transition-colors"
          />
          {filters.keyword && (
            <button
              onClick={() => onChange({ ...filters, keyword: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Dimension filter */}
      <div>
        <h4 className="text-text-primary font-semibold text-base mb-3">热点维度</h4>
        <div className="flex flex-col gap-1.5">
          {ALL_DIMENSIONS.map((dim) => {
            const config = DIMENSION_CONFIG[dim];
            const isChecked = filters.dimensions.includes(dim);
            return (
              <motion.button
                key={dim}
                onClick={() => toggleDimension(dim)}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 text-left',
                  isChecked ? 'bg-bg-card-hover' : 'hover:bg-bg-card-hover/50'
                )}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-all',
                    isChecked ? 'border-transparent' : 'border-border-default'
                  )}
                  style={{
                    backgroundColor: isChecked ? config.color : 'transparent',
                  }}
                >
                  {isChecked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span className={isChecked ? 'text-text-primary' : 'text-text-secondary'}>
                  {config.label}
                </span>
              </motion.button>
            );
          })}
        </div>
        {filters.dimensions.length > 0 && (
          <button
            onClick={() => onChange({ ...filters, dimensions: [] })}
            className="text-xs text-accent-blue mt-2 hover:underline"
          >
            清除维度筛选
          </button>
        )}
      </div>

      {/* Heat level filter */}
      <div>
        <h4 className="text-text-primary font-semibold text-base mb-3">热度等级</h4>
        <div className="flex flex-col gap-1.5">
          {ALL_HEAT_LEVELS.map((level) => {
            const config = HEAT_CONFIG[level];
            const isChecked = filters.heatLevels.includes(level);
            return (
              <motion.button
                key={level}
                onClick={() => toggleHeatLevel(level)}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 text-left',
                  isChecked ? 'bg-bg-card-hover' : 'hover:bg-bg-card-hover/50'
                )}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-all',
                    isChecked ? 'border-transparent' : 'border-border-default'
                  )}
                  style={{
                    backgroundColor: isChecked ? config.color : 'transparent',
                  }}
                >
                  {isChecked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span style={{ color: config.color, fontSize: '11px' }} className="font-mono">
                  {config.stars}
                </span>
                <span className={isChecked ? 'text-text-primary' : 'text-text-secondary'}>
                  {config.label}
                </span>
              </motion.button>
            );
          })}
        </div>
        {filters.heatLevels.length > 0 && (
          <button
            onClick={() => onChange({ ...filters, heatLevels: [] })}
            className="text-xs text-accent-blue mt-2 hover:underline"
          >
            清除热度筛选
          </button>
        )}
      </div>

      {/* Quick jump */}
      <div>
        <h4 className="text-text-primary font-semibold text-base mb-3">快速跳转</h4>
        <div className="grid grid-cols-2 gap-2">
          {quickJumpButtons.map((btn) => (
            <motion.button
              key={btn.label}
              onClick={btn.action}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="h-9 bg-bg-input rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors border border-border-default hover:border-border-hover"
            >
              {btn.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Month hotspot list */}
      <div className="flex-1 min-h-0 flex flex-col">
        <h4 className="text-text-primary font-semibold text-base mb-3">
          {currentMonth}月热点 ({monthHotspots.reduce((s, d) => s + d.hotspots.length, 0)}个)
        </h4>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[300px]">
          {monthHotspots.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">本月暂无热点</p>
          )}
          {monthHotspots.map(({ day, hotspots }) =>
            hotspots.map((hotspot) => (
              <motion.button
                key={`${day.date}-${hotspot.id}`}
                onClick={() => onSelectDate(day)}
                whileHover={{ x: 2 }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-bg-card-hover transition-colors group"
              >
                <span className="text-xs text-text-tertiary w-8 flex-shrink-0">{day.day}日</span>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DIMENSION_CONFIG[hotspot.dimension].color }} />
                <span className="text-xs text-text-primary truncate flex-1 group-hover:text-accent-blue transition-colors">
                  {hotspot.title}
                </span>
              </motion.button>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  MonthNavigation                                                    */
/* ------------------------------------------------------------------ */

interface MonthNavigationProps {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectMonth: (month: number) => void;
}

const MonthNavigation: React.FC<MonthNavigationProps> = ({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectMonth,
}) => {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const monthLabel = formatMonthLabel(year, month);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: EASE }}
      className="flex items-center justify-between bg-bg-card rounded-xl px-5 py-3 border border-border-default mb-4"
    >
      {/* Left: month navigation */}
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-md bg-bg-input text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors border border-border-default"
        >
          <ChevronLeft size={18} />
        </motion.button>

        <div className="relative">
          <button
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            className="flex items-center gap-1.5 text-xl font-semibold text-text-primary hover:text-accent-blue transition-colors"
          >
            {monthLabel}
            <ChevronDown
              size={16}
              className={cn(
                'text-text-tertiary transition-transform',
                showMonthPicker && 'rotate-180'
              )}
            />
          </button>

          {/* Month picker dropdown */}
          <AnimatePresence>
            {showMonthPicker && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMonthPicker(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 bg-bg-elevated border border-border-default rounded-xl p-3 shadow-card z-40 grid grid-cols-3 gap-1.5 w-56"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <motion.button
                      key={m}
                      onClick={() => {
                        onSelectMonth(m);
                        setShowMonthPicker(false);
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'h-9 rounded-lg text-sm font-medium transition-colors',
                        m === month
                          ? 'bg-accent-blue text-white'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
                      )}
                    >
                      {m}月
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-md bg-bg-input text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors border border-border-default"
        >
          <ChevronRight size={18} />
        </motion.button>
      </div>

      {/* Right: today button + view info */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-tertiary hidden sm:inline">2026年</span>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToday}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-accent-blue hover:bg-accent-blue/10 transition-colors border border-accent-blue/20"
        >
          <Calendar size={14} />
          今天
        </motion.button>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  DateDetailPanel                                                    */
/* ------------------------------------------------------------------ */

interface DateDetailPanelProps {
  day: CalendarDay | null;
  filters: FilterState;
  onClose: () => void;
}

const DateDetailPanel: React.FC<DateDetailPanelProps> = ({ day, filters, onClose }) => {
  const navigate = useNavigate();

  const hotspots = useMemo(() => {
    if (!day) return [];
    const hs = getHotspotsForDay(day);
    return filterHotspots(hs, filters);
  }, [day, filters]);

  const allHotspots = useMemo(() => {
    if (!day) return [];
    return getHotspotsForDay(day);
  }, [day]);

  if (!day) return null;

  const dateLabel = `${day.month}月${day.day}日`;
  const weekdayLabel = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day.weekday];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="bg-bg-card rounded-xl border border-border-default mt-4 overflow-hidden"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-text-primary">
              {dateLabel} {weekdayLabel}
            </h3>
            {day.solarTerm && (
              <span className="text-xs text-accent-teal bg-accent-teal/10 px-2 py-0.5 rounded-md">
                {day.solarTerm}
              </span>
            )}
            {day.holidays && day.holidays.length > 0 && (
              <span className="text-xs text-accent-pink bg-accent-pink/10 px-2 py-0.5 rounded-md">
                {day.holidays.join('、')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/?date=${day.date}`)}
              className="flex items-center gap-1 text-sm text-accent-blue hover:underline"
            >
              查看今日看板
              <ArrowRight size={14} />
            </button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
            >
              <X size={16} />
            </motion.button>
          </div>
        </div>

        {/* Hotspots list */}
        {hotspots.length === 0 ? (
          <div className="text-center py-8">
            <Calendar size={40} className="mx-auto text-text-muted mb-3 opacity-50" />
            <p className="text-text-tertiary text-sm">该日暂无热点数据</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {hotspots.map((hotspot) => (
              <motion.div
                key={hotspot.id}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
                }}
                className="bg-bg-base border border-border-default rounded-lg p-4 hover:border-border-hover hover:bg-bg-card-hover/50 transition-all duration-200 group"
              >
                {/* Top row: dimension tag + heat badge */}
                <div className="flex items-center justify-between mb-2">
                  <DimensionTag dimension={hotspot.dimension} size="sm" />
                  <HeatBadge level={hotspot.heatLevel} showStars size="sm" />
                </div>

                {/* Title */}
                <h4 className="text-base font-semibold text-text-primary mb-1 group-hover:text-accent-blue transition-colors">
                  {hotspot.title}
                </h4>

                {/* Description */}
                <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                  {hotspot.description}
                </p>

                {/* Metric */}
                {hotspot.metricLabel && (
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp
                      size={14}
                      className={
                        hotspot.metricDirection === 'up' ? 'text-accent-green' : 'text-accent-red'
                      }
                    />
                    <span className="text-xs text-text-tertiary">{hotspot.metricLabel}</span>
                    <span
                      className={cn(
                        'text-sm font-semibold font-mono',
                        hotspot.metricDirection === 'up' ? 'text-accent-green' : 'text-accent-red'
                      )}
                    >
                      {hotspot.metricValue}
                    </span>
                  </div>
                )}

                {/* Bottom actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-default">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/hotspot/${hotspot.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-accent-blue/10 text-accent-blue text-xs font-medium hover:bg-accent-blue/20 transition-colors"
                  >
                    查看详情
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-1.5 rounded-md text-text-tertiary hover:text-accent-blue hover:bg-bg-card transition-colors"
                    title="收藏"
                  >
                    <Bookmark size={14} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-1.5 rounded-md text-text-tertiary hover:text-accent-blue hover:bg-bg-card transition-colors"
                    title="选品"
                  >
                    <ShoppingBag size={14} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Show filtered out count */}
        {allHotspots.length > hotspots.length && (
          <p className="text-xs text-text-muted mt-3 text-center">
            已隐藏 {allHotspots.length - hotspots.length} 个不匹配筛选条件的热点
          </p>
        )}
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  CalendarLegend                                                     */
/* ------------------------------------------------------------------ */

const CalendarLegend: React.FC = React.memo(() => {
  return (
    <div className="flex items-center gap-4 text-xs text-text-tertiary flex-wrap">
      <span>热度:</span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255,59,48,0.3)', border: '1px solid rgba(255,59,48,0.6)' }} />
        极强
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255,149,0,0.25)', border: '1px solid rgba(255,149,0,0.5)' }} />
        强
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255,204,0,0.2)', border: '1px solid rgba(255,204,0,0.4)' }} />
        中
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.35)' }} />
        低
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm bg-bg-card border border-border-default" />
        无
      </span>
    </div>
  );
});
CalendarLegend.displayName = 'CalendarLegend';

/* ------------------------------------------------------------------ */
/*  Main CalendarPage                                                  */
/* ------------------------------------------------------------------ */

const CalendarPage: React.FC = () => {
  const { dateStr } = useAppDate();
  const { data: apiHotspots } = useHotspots(dateStr);

  // 将API数据同步到全局存储（用于模块级别函数访问）
  useMemo(() => {
    if (apiHotspots) {
      setGlobalHotspots(apiHotspots as any);
    }
  }, [apiHotspots]);

  // 使用API数据或本地热点列表
  const hotspotList = apiHotspots || [];

  const [currentMonth, setCurrentMonth] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    dimensions: [],
    heatLevels: [],
    keyword: '',
  });
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');

  const monthData = useMemo(() => getMonthData(2026, currentMonth), [currentMonth]);

  const handlePrevMonth = useCallback(() => {
    setSlideDirection('right');
    setCurrentMonth((m) => Math.max(1, m - 1));
    setSelectedDate(null);
  }, []);

  const handleNextMonth = useCallback(() => {
    setSlideDirection('left');
    setCurrentMonth((m) => Math.min(12, m + 1));
    setSelectedDate(null);
  }, []);

  const handleToday = useCallback(() => {
    setSlideDirection(currentMonth > 1 ? 'right' : 'left');
    setCurrentMonth(1);
    setSelectedDate('2026-04-22');
  }, [currentMonth]);

  const handleSelectMonth = useCallback((month: number) => {
    setSlideDirection(month > currentMonth ? 'left' : 'right');
    setCurrentMonth(month);
    setSelectedDate(null);
  }, [currentMonth]);

  const handleSelectDate = useCallback((day: CalendarDay) => {
    setSelectedDate((prev) => (prev === day.date ? null : day.date));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const selectedDay = useMemo(
    () => monthData.days.find((d) => d.date === selectedDate) || null,
    [monthData, selectedDate]
  );

  // Month transition variants
  const monthVariants = {
    enter: (dir: 'left' | 'right') => ({
      x: dir === 'left' ? '8%' : '-8%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: 'left' | 'right') => ({
      x: dir === 'left' ? '-8%' : '8%',
      opacity: 0,
    }),
  };

  return (
    <div>
      <TopBar title="热点日历" subtitle="按月/天展示全年消费热点，支持筛选和导航" />

      <div className="flex gap-5">
        {/* Filter Panel */}
        <div className="hidden lg:block">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            currentMonth={currentMonth}
            onJumpToMonth={handleSelectMonth}
            onSelectDate={(day) => {
              handleSelectMonth(day.month);
              setTimeout(() => handleSelectDate(day), 50);
            }}
          />
        </div>

        {/* Main calendar area */}
        <div className="flex-1 min-w-0">
          {/* Month Navigation */}
          <MonthNavigation
            year={2026}
            month={currentMonth}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
            onSelectMonth={handleSelectMonth}
          />

          {/* Legend */}
          <div className="flex justify-end mb-3">
            <CalendarLegend />
          </div>

          {/* Calendar Grid */}
          <div className="bg-bg-card rounded-xl border border-border-default overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7">
              {WEEKDAY_LABELS.map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    'h-10 flex items-center justify-center text-xs font-medium bg-bg-input border-b border-border-default',
                    i === 0 || i === 6 ? 'text-heat-3' : 'text-text-tertiary'
                  )}
                >
                  周{label}
                </div>
              ))}
            </div>

            {/* Animated month grid */}
            <div className="relative overflow-hidden">
              <AnimatePresence mode="wait" custom={slideDirection}>
                <motion.div
                  key={currentMonth}
                  custom={slideDirection}
                  variants={monthVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="grid grid-cols-7"
                >
                  {monthData.days.map((day, index) => (
                    <motion.div
                      key={day.date}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.25,
                        delay: index * 0.005,
                        ease: EASE,
                      }}
                    >
                      <CalendarCell
                        day={day}
                        isCurrentMonth={day.month === currentMonth}
                        isSelected={selectedDate === day.date}
                        onSelect={handleSelectDate}
                        filters={filters}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Date Detail Panel */}
          <AnimatePresence mode="wait">
            {selectedDate && selectedDay && (
              <DateDetailPanel
                key={selectedDate}
                day={selectedDay}
                filters={filters}
                onClose={handleCloseDetail}
              />
            )}
          </AnimatePresence>

          {/* Mobile filter panel (bottom sheet) */}
          <div className="lg:hidden mt-4">
            <div className="bg-bg-card rounded-xl p-4 border border-border-default">
              <h4 className="text-text-primary font-semibold mb-3">筛选</h4>
              <div className="flex flex-wrap gap-2">
                {ALL_DIMENSIONS.map((dim) => {
                  const config = DIMENSION_CONFIG[dim];
                  const isChecked = filters.dimensions.includes(dim);
                  return (
                    <button
                      key={dim}
                      onClick={() => {
                        setFilters({
                          ...filters,
                          dimensions: isChecked
                            ? filters.dimensions.filter((d) => d !== dim)
                            : [...filters.dimensions, dim],
                        });
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors',
                        isChecked
                          ? 'border-transparent text-white'
                          : 'border-border-default text-text-secondary'
                      )}
                      style={{
                        backgroundColor: isChecked ? config.color : 'transparent',
                      }}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
              {filters.keyword && (
                <div className="mt-2 text-xs text-text-tertiary">
                  搜索: &quot;{filters.keyword}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
