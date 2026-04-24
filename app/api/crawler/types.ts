// ============================================================
// 爬虫模块类型定义
// ============================================================

export interface CrawlResult {
  source: string;
  status: "success" | "error" | "partial";
  recordsCount: number;
  errorMessage?: string;
}

export interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  tip: string;
  icon: string;
}

export interface HotSearchItem {
  rank: number;
  title: string;
  heat?: number;
  url?: string;
  tag?: string;
}

export interface PlatformCrawlData {
  platform: "weibo" | "douyin" | "xiaohongshu";
  platformName: string;
  postCount: number;
  readCount: number;
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  hotPosts: string[];
  topKeywords: string[];
}

export interface DailySnapshotInput {
  date: string;
  totalHotspots: number;
  highPriorityCount: number;
  description: string;
  weatherCity?: string;
  weatherTemp?: number;
  weatherCondition?: string;
  weatherHumidity?: number;
  weatherTip?: string;
  solarTerm?: string;
  snapshot?: Record<string, unknown>;
}
