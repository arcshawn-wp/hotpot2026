import React, { useState } from 'react';
import { Search, Bell, ChevronDown, Calendar } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

const TopBar: React.FC<TopBarProps> = ({ title, subtitle }) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="h-14 flex items-center justify-between bg-bg-base border-b border-border-default px-6 mb-6 sticky top-0 z-40">
      {/* Left: Title */}
      <div>
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-xs text-text-tertiary">{subtitle}</p>}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Date selector */}
        <button className="flex items-center gap-2 px-3 py-1.5 bg-bg-card border border-border-default rounded-lg text-sm text-text-secondary hover:border-border-hover transition-colors">
          <Calendar size={14} />
          <span>今天</span>
          <ChevronDown size={12} />
        </button>

        {/* Search */}
        <div
          className={`flex items-center bg-bg-card border rounded-lg transition-all duration-200 overflow-hidden ${
            searchFocused ? 'border-accent-blue w-64' : 'border-border-default w-44'
          }`}
        >
          <Search size={14} className="ml-2.5 text-text-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索热点、选品、话术..."
            className="bg-transparent text-sm text-text-primary placeholder-text-muted px-2 py-1.5 outline-none w-full"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>

        {/* Notification bell */}
        <button className="relative p-2 rounded-lg hover:bg-bg-card transition-colors">
          <Bell size={18} className="text-text-secondary" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-heat-5 rounded-full" />
        </button>
      </div>
    </div>
  );
};

export default React.memo(TopBar);
