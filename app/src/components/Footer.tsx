import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="h-12 flex items-center justify-between px-6 border-t border-border-default bg-bg-base text-text-muted text-xs">
      <span>热点挖掘器 v1.0</span>
      <span>数据驱动直播运营决策</span>
    </footer>
  );
};

export default React.memo(Footer);
