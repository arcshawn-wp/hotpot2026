import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  int,
  tinyint,
  decimal,
  date,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================================
// 热点主表
// ============================================================
export const hotspots = mysqlTable(
  "hotspots",
  {
    id: serial("id").primaryKey(),
    hotspotId: varchar("hotspot_id", { length: 64 }).notNull().unique(),
    dimension: varchar("dimension", { length: 32 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    heatLevel: tinyint("heat_level").notNull(),
    heatScore: int("heat_score").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    metricLabel: varchar("metric_label", { length: 64 }),
    metricValue: varchar("metric_value", { length: 64 }),
    metricDirection: varchar("metric_direction", { length: 16 }),
    scriptTemplate: text("script_template"),
    trend: json("trend").$type<number[]>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("idx_hotspots_date").on(table.startDate, table.endDate)]
);

// ============================================================
// 平台讨论数据表（微博/小红书/抖音）
// ============================================================
export const platformDiscussions = mysqlTable(
  "platform_discussions",
  {
    id: serial("id").primaryKey(),
    hotspotId: varchar("hotspot_id", { length: 64 }).notNull(),
    platform: varchar("platform", { length: 32 }).notNull(), // weibo | xiaohongshu | douyin
    platformName: varchar("platform_name", { length: 64 }).notNull(),
    postCount: int("post_count").notNull().default(0),
    readCount: int("read_count").notNull().default(0),
    sentiment: varchar("sentiment", { length: 16 }).notNull().default("neutral"), // positive | neutral | negative | mixed
    hotPosts: json("hot_posts").$type<string[]>(),
    topKeywords: json("top_keywords").$type<string[]>(),
    crawledAt: timestamp("crawled_at").notNull().defaultNow(),
  },
  (table) => [index("idx_platform_hotspot").on(table.hotspotId, table.platform)]
);

// ============================================================
// 选品表
// ============================================================
export const products = mysqlTable(
  "products",
  {
    id: serial("id").primaryKey(),
    productId: varchar("product_id", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 64 }),
    subCategory: varchar("sub_category", { length: 64 }),
    specs: varchar("specs", { length: 255 }),
    price: decimal("price", { precision: 10, scale: 2 }),
    heatScore: int("heat_score").notNull().default(0),
    heatLevel: tinyint("heat_level").notNull().default(1),
    reason: varchar("reason", { length: 255 }),
    dimension: varchar("dimension", { length: 32 }),
    sourceHotspot: varchar("source_hotspot", { length: 255 }),
    script: text("script"),
    scriptCount: int("script_count").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_products_hotspot").on(table.sourceHotspot)]
);

// ============================================================
// 热点-选品关联表
// ============================================================
export const hotspotProducts = mysqlTable(
  "hotspot_products",
  {
    id: serial("id").primaryKey(),
    hotspotId: varchar("hotspot_id", { length: 64 }).notNull(),
    productId: varchar("product_id", { length: 64 }).notNull(),
  },
  (table) => [index("idx_hp_hotspot").on(table.hotspotId)]
);

// ============================================================
// 话术表
// ============================================================
export const scripts = mysqlTable(
  "scripts",
  {
    id: serial("id").primaryKey(),
    scriptId: varchar("script_id", { length: 64 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    dimension: varchar("dimension", { length: 32 }),
    heatLevel: tinyint("heat_level").notNull().default(1),
    usageCount: int("usage_count").notNull().default(0),
    hotspotId: varchar("hotspot_id", { length: 64 }),
    hotspotName: varchar("hotspot_name", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_scripts_hotspot").on(table.hotspotId)]
);

// ============================================================
// 每日快照表（记录每天的热点状态）
// ============================================================
export const dailySnapshots = mysqlTable(
  "daily_snapshots",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    totalHotspots: int("total_hotspots").notNull().default(0),
    highPriorityCount: int("high_priority_count").notNull().default(0),
    description: text("description"),
    weatherCity: varchar("weather_city", { length: 64 }),
    weatherTemp: int("weather_temp"),
    weatherCondition: varchar("weather_condition", { length: 64 }),
    weatherHumidity: int("weather_humidity"),
    weatherTip: text("weather_tip"),
    solarTerm: varchar("solar_term", { length: 32 }),
    snapshot: json("snapshot").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("idx_snapshot_date").on(table.date)]
);

// ============================================================
// 数据采集日志表
// ============================================================
export const crawlLogs = mysqlTable(
  "crawl_logs",
  {
    id: serial("id").primaryKey(),
    source: varchar("source", { length: 64 }).notNull(), // weibo | douyin | xiaohongshu | weather
    status: varchar("status", { length: 16 }).notNull(), // success | error | partial
    recordsCount: int("records_count").default(0),
    errorMessage: text("error_message"),
    crawledAt: timestamp("crawled_at").notNull().defaultNow(),
  }
);
