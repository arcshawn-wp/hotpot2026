/**
 * tRPC API Hooks - 前端数据层
 * 
 * 所有数据通过 tRPC 从后端实时获取：
 * - 热点列表（按日期筛选）
 * - 热点详情（含平台讨论数据）
 * - 选品列表
 * - 话术列表
 * - 每日快照
 */

import { trpc } from "@/providers/trpc";

/** 获取指定日期的活跃热点 */
export function useHotspots(date: string) {
  return trpc.hotspot.listByDate.useQuery({ date });
}

/** 获取热点详情（含平台讨论） */
export function useHotspotDetail(hotspotId: string) {
  return trpc.hotspot.detail.useQuery({ hotspotId });
}

/** 获取指定日期的维度总览 */
export function useDimensions(date: string) {
  return trpc.hotspot.dimensions.useQuery({ date });
}

/** 获取每日快照 */
export function useDailySnapshot(date: string) {
  return trpc.hotspot.snapshot.useQuery({ date });
}

/** 获取指定日期的选品 */
export function useProductsByDate(date: string) {
  return trpc.product.listByDate.useQuery({ date });
}

/** 获取所有选品 */
export function useAllProducts() {
  return trpc.product.list.useQuery();
}

/** 获取指定热点关联的选品 */
export function useProductsByHotspot(hotspotId: string) {
  return trpc.product.byHotspot.useQuery({ hotspotId });
}

/** 获取指定日期的话术 */
export function useScriptsByDate(date: string) {
  return trpc.script.listByDate.useQuery({ date });
}

/** 获取所有话术 */
export function useAllScripts() {
  return trpc.script.list.useQuery();
}

/** 获取指定热点关联的话术 */
export function useScriptsByHotspot(hotspotId: string) {
  return trpc.script.byHotspot.useQuery({ hotspotId });
}

/** 获取热点趋势 */
export function useHotspotTrend(hotspotId: string) {
  return trpc.hotspot.trend.useQuery({ hotspotId });
}
