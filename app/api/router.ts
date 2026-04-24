import { createRouter, publicQuery } from "./middleware";
import { hotspotRouter } from "./routers/hotspot";
import { productRouter } from "./routers/product";
import { scriptRouter } from "./routers/script";
import { crawlerRouter } from "./routers/crawler";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  /** 热点管理 */
  hotspot: hotspotRouter,

  /** 选品管理 */
  product: productRouter,

  /** 话术管理 */
  script: scriptRouter,

  /** 爬虫采集 */
  crawler: crawlerRouter,
});

export type AppRouter = typeof appRouter;
