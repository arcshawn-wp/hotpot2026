import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import DimensionTag from './DimensionTag';
import HeatBadge from './HeatBadge';
import type { Hotspot } from '@/data/types';

interface HotspotCardProps {
  hotspot: Hotspot;
  index?: number;
  showActions?: boolean;
}

const HotspotCard: React.FC<HotspotCardProps> = ({ hotspot, index, showActions = true }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/hotspot/${hotspot.id}`);
  };

  const heatColorMap: Record<number, string> = {
    5: '#FF3B30',
    4: '#FF9500',
    3: '#FFCC00',
    2: '#34C759',
    1: '#8E8E93',
  };

  const bgColor = heatColorMap[hotspot.heatLevel] || '#8E8E93';

  return (
    <motion.div
      className="bg-bg-card border border-border-default rounded-xl p-5 cursor-pointer relative overflow-hidden group"
      whileHover={{ y: -2, borderColor: '#334155' }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      style={{ boxShadow: 'none' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Top shimmer effect on hover */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${bgColor}, transparent)`,
        }}
      />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {index !== undefined && (
            <span
              className="font-data font-bold text-lg mr-1"
              style={{ color: bgColor }}
            >
              #{index + 1}
            </span>
          )}
          <DimensionTag dimension={hotspot.dimension} />
        </div>
        <HeatBadge level={hotspot.heatLevel} />
      </div>

      <h4 className="text-lg font-semibold text-text-primary mb-1 group-hover:text-white transition-colors">
        {hotspot.title}
      </h4>

      {hotspot.metricValue && (
        <div className="flex items-center gap-2 mb-2">
          <span
            className="font-data text-sm font-semibold"
            style={{ color: hotspot.metricDirection === 'up' ? '#30D158' : '#FF453A' }}
          >
            {hotspot.metricLabel} {hotspot.metricValue}
          </span>
        </div>
      )}

      <p className="text-sm text-text-secondary mb-3 line-clamp-2">{hotspot.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-tertiary bg-bg-input px-2 py-1 rounded">
          {hotspot.relatedProducts.length}款选品
        </span>
        {showActions && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              className="p-1.5 rounded-md hover:bg-bg-elevated transition-colors"
              onClick={(e) => {
                e.stopPropagation();
              }}
              title="收藏"
            >
              <Star size={14} className="text-text-tertiary hover:text-heat-4 transition-colors" />
            </button>
            <span className="flex items-center gap-1 text-xs text-accent-blue">
              查看详情 <ArrowRight size={12} />
            </span>
          </div>
        )}
      </div>

      {/* Bottom heat progress background */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] opacity-10"
        style={{ backgroundColor: bgColor }}
      />
    </motion.div>
  );
};

export default React.memo(HotspotCard);
