export type Dimension = 'weather' | 'solar_term' | 'holiday' | 'trend' | 'renovation';

export type HeatLevel = 1 | 2 | 3 | 4 | 5;

export interface Hotspot {
  id: string;
  dimension: Dimension;
  title: string;
  description: string;
  heatLevel: HeatLevel;
  heatScore: number;
  dateRange: [string, string];
  relatedProducts: Product[];
  scriptTemplate: string;
  trend: number[];
  metricLabel?: string;
  metricValue?: string;
  metricDirection?: 'up' | 'down';
}

export interface Product {
  id: string;
  name: string;
  image: string;
  heatScore: number;
  reason: string;
  dimension: Dimension;
  script?: string;
  sourceHotspot?: string;
}

export interface Script {
  id: string;
  title: string;
  content: string;
  dimension: Dimension;
  heatLevel: HeatLevel;
  usageCount: number;
  hotspotId: string;
  hotspotName?: string;
  isFavorited?: boolean;
}

export interface WeatherInfo {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  tip: string;
  icon: 'sunny' | 'rainy' | 'snowy' | 'hot' | 'cloudy';
}

export interface SolarTerm {
  name: string;
  description: string;
  current: boolean;
  daysToNext: number;
  nextName: string;
  nextTip: string;
}

export interface UpcomingHoliday {
  id: string;
  name: string;
  date: string;
  monthDay: string;
  daysLeft: number;
  description: string;
  heatLevel: HeatLevel;
}

export interface DimensionSummary {
  dimension: Dimension;
  label: string;
  currentHotspot: string;
  heatScore: number;
  heatLevel: HeatLevel;
  icon: string;
}

export interface TrendingItem {
  id: string;
  name: string;
  dimension: Dimension;
  changePercent: number;
  trend: number[];
}

// ---- 热点详情页新增类型 ----

export interface PlatformDiscussion {
  platform: 'weibo' | 'xiaohongshu' | 'douyin';
  platformName: string;
  postCount: number;
  readCount: number;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  hotPosts: string[];
  topKeywords: string[];
}

export interface TrendIndicator {
  direction: 'up' | 'stable' | 'down';
  vsLastWeek: string;
  vsLastMonth: string;
  vsLastYear: string;
  forecast: string;
}

export interface YearOverYearDiff {
  aspect: string;
  thisYear: string;
  lastYear: string;
  change: string;
}

export interface ConfidenceScore {
  score: number;
  level: 'high' | 'medium' | 'low';
  factors: string[];
}

export interface HotspotDetail {
  hotspotId: string;
  confidence: ConfidenceScore;
  platforms: PlatformDiscussion[];
  trendIndicator: TrendIndicator;
  yoyDiffs: YearOverYearDiff[];
  relatedTopics: string[];
  actionSuggestions: string[];
}

export interface DailySummary {
  totalHotspots: number;
  highPriorityCount: number;
  description: string;
}

export const DIMENSION_CONFIG: Record<Dimension, { label: string; color: string; bgColor: string; icon: string }> = {
  weather: { label: '天气', color: '#0A84FF', bgColor: 'rgba(10,132,255,0.12)', icon: 'Cloud' },
  solar_term: { label: '节气', color: '#5AC8FA', bgColor: 'rgba(90,200,250,0.12)', icon: 'Leaf' },
  holiday: { label: '节假日', color: '#FF375F', bgColor: 'rgba(255,55,95,0.12)', icon: 'Gift' },
  trend: { label: '热梗', color: '#BF5AF2', bgColor: 'rgba(191,90,242,0.12)', icon: 'Flame' },
  renovation: { label: '家装', color: '#FF9500', bgColor: 'rgba(255,149,0,0.12)', icon: 'Home' },
};

export const HEAT_CONFIG: Record<HeatLevel, { color: string; bgColor: string; label: string; stars: string }> = {
  5: { color: '#FF3B30', bgColor: 'rgba(255,59,48,0.15)', label: '极强', stars: '★★★★★' },
  4: { color: '#FF9500', bgColor: 'rgba(255,149,0,0.15)', label: '强', stars: '★★★★' },
  3: { color: '#FFCC00', bgColor: 'rgba(255,204,0,0.15)', label: '中等', stars: '★★★' },
  2: { color: '#34C759', bgColor: 'rgba(52,199,89,0.15)', label: '一般', stars: '★★' },
  1: { color: '#8E8E93', bgColor: 'rgba(142,142,147,0.15)', label: '弱', stars: '★' },
};
