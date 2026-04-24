import React, { useEffect, useState } from 'react';
import { getHeatProgressColor } from '@/data/hotspotRulebook';

interface HeatProgressBarProps {
  value: number;
  height?: number;
  showValue?: boolean;
  animated?: boolean;
  delay?: number;
}

const HeatProgressBar: React.FC<HeatProgressBarProps> = ({
  value,
  height = 6,
  showValue = false,
  animated = true,
  delay = 0,
}) => {
  const [width, setWidth] = useState(animated ? 0 : value);
  const color = getHeatProgressColor(value);

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => {
      setWidth(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, animated, delay]);

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 bg-bg-input rounded-full overflow-hidden" style={{ height }}>
        <div
          className="h-full rounded-full transition-all duration-[800ms] ease-out"
          style={{
            width: `${width}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {showValue && (
        <span className="text-xs font-data font-semibold" style={{ color, minWidth: '28px', textAlign: 'right' }}>
          {value}
        </span>
      )}
    </div>
  );
};

export default React.memo(HeatProgressBar);
