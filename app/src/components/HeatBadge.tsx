import React from 'react';
import { HEAT_CONFIG } from '@/data/types';
import type { HeatLevel } from '@/data/types';

interface HeatBadgeProps {
  level: HeatLevel;
  showStars?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const HeatBadge: React.FC<HeatBadgeProps> = ({ level, showStars = true, showLabel = false, size = 'sm' }) => {
  const config = HEAT_CONFIG[level];
  const paddingClass = size === 'sm' ? 'px-[10px] py-[4px]' : 'px-3 py-1.5';
  const fontClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[20px] font-medium ${paddingClass} ${fontClass}`}
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {showStars && <span className="tracking-tight">{config.stars}</span>}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

export default React.memo(HeatBadge);
