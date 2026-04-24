import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, TrendingUp, ShoppingBag, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { to: '/', label: '今日热点', icon: LayoutDashboard },
  { to: '/calendar', label: '热点日历', icon: Calendar },
  { to: '/forecast', label: '未来预告', icon: TrendingUp },
  { to: '/products', label: '选品引擎', icon: ShoppingBag },
  { to: '/scripts', label: '话术助手', icon: MessageSquare },
];

const Navbar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className="fixed left-0 top-0 h-screen bg-bg-sidebar border-r border-border-default flex flex-col z-50 transition-all duration-300"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo area */}
      <div className="h-16 flex items-center justify-center border-b border-border-default px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <img src="/logo.svg" alt="热点挖掘器" className="w-8 h-8 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-text-primary font-semibold text-base whitespace-nowrap overflow-hidden"
              >
                热点挖掘器
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 h-11 px-3 rounded-lg transition-all duration-200 relative overflow-hidden group ${
                  isActive
                    ? 'bg-bg-card text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                }`
              }
              style={({ isActive }) => ({
                borderLeft: isActive ? '3px solid #0A84FF' : '3px solid transparent',
              })}
            >
              <Icon size={22} className="flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </div>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border-default">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full h-10 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-card transition-all"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Bottom user area */}
      <div className="h-14 border-t border-border-default flex items-center justify-center px-4 gap-3">
        <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
          <span className="text-accent-blue text-xs font-semibold">运营</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden"
            >
              <p className="text-sm text-text-primary font-medium truncate">运营人员</p>
              <p className="text-xs text-text-tertiary truncate">运营部</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;
