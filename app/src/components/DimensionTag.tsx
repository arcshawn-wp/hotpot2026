import React from 'react';
import { Cloud, Leaf, Gift, Flame, Home } from 'lucide-react';
import { DIMENSION_CONFIG } from '@/data/types';
import type { Dimension } from '@/data/types';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Cloud,
  Leaf,
  Gift,
  Flame,
  Home,
};

interface DimensionTagProps {
  dimension: Dimension;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const DimensionTag: React.FC<DimensionTagProps> = ({ dimension, showIcon = true, size = 'sm' }) => {
  const config = DIMENSION_CONFIG[dimension];
  const IconComponent = ICON_MAP[config.icon];
  const paddingClass = size === 'sm' ? 'px-[10px] py-[3px] text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium ${paddingClass}`}
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {showIcon && IconComponent && <IconComponent size={size === 'sm' ? 12 : 14} />}
      <span>{config.label}</span>
    </span>
  );
};

export default React.memo(DimensionTag);
