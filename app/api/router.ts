import { createRouter, publicQuery } from "./middleware";
import { hotspotRouter } from "./routers/hotspot";
import { productRouter } from "./routers/product";
import { scriptRouter } from "./routers/script";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  /** 热点管理 */
  hotspot: hotspotRouter,

  /** 选品管理 */
  product: productRouter,

  /** 话术管理 */
  script: scriptRouter,
});

export type AppRouter = typeof appRouter;
