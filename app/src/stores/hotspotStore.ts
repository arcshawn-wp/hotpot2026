/**
 * 全局热点状态存储
 * 用于在模块级别函数和React组件之间共享热点数据
 */

import type { Hotspot } from '@/data/types';

let globalHotspots: Hotspot[] = [];

export function setGlobalHotspots(hotspots: Hotspot[]) {
  globalHotspots = hotspots;
}

export function getGlobalHotspots(): Hotspot[] {
  return globalHotspots;
}
