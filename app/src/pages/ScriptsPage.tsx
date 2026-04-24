import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Copy,
  Check,
  Star,
  Plus,
  X,
  Edit3,
  Heart,
  Cloud,
  Leaf,
  Gift,
  Flame,
  Home,
  Mic,
  Package,
  Zap,
  Users,
  Flag,
  Trash2,
  Sparkles,
} from 'lucide-react';
import type { Script, Dimension } from '@/data/types';
import { DIMENSION_CONFIG, HEAT_CONFIG } from '@/data/types';
import { useAppDate } from '@/contexts/DateContext';
import { useAllScripts } from '@/hooks/useApi';
import TopBar from '@/components/TopBar';

/* ------------------------------------------------------------------ */
/*  types                                                              */
/* ------------------------------------------------------------------ */
type ScriptCategory = 'opening' | 'product' | 'conversion' | 'interaction' | 'closing' | 'all';

interface CustomScript extends Script {
  category: ScriptCategory;
  scenario?: string;
  tags?: string[];
  isCustom?: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info';
}

/* ------------------------------------------------------------------ */
/*  constants                                                          */
/* ------------------------------------------------------------------ */
const CATEGORY_LIST: { key: ScriptCategory; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'all', label: '全部', icon: Sparkles },
  { key: 'opening', label: '开场话术', icon: Mic },
  { key: 'product', label: '产品介绍', icon: Package },
  { key: 'conversion', label: '促单逼单', icon: Zap },
  { key: 'interaction', label: '互动留人', icon: Users },
  { key: 'closing', label: '收尾话术', icon: Flag },
];

const CATEGORY_LABEL_MAP: Record<string, string> = {
  opening: '开场话术',
  product: '产品介绍',
  conversion: '促单逼单',
  interaction: '互动留人',
  closing: '收尾话术',
};

const DIMENSION_LIST: { key: Dimension; label: string }[] = [
  { key: 'weather', label: '天气' },
  { key: 'solar_term', label: '节气' },
  { key: 'holiday', label: '节假日' },
  { key: 'trend', label: '热梗' },
  { key: 'renovation', label: '家装' },
];

const FAVORITES_KEY = 'favoritedScripts';
const CUSTOM_SCRIPTS_KEY = 'customScripts';

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */
function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* map dimension to icon component */
function DimensionIcon({ dimension, size = 14 }: { dimension: Dimension; size?: number }) {
  switch (dimension) {
    case 'weather': return <Cloud size={size} />;
    case 'solar_term': return <Leaf size={size} />;
    case 'holiday': return <Gift size={size} />;
    case 'trend': return <Flame size={size} />;
    case 'renovation': return <Home size={size} />;
  }
}

/* derive category from script content heuristic */
function deriveCategory(_script: Script): ScriptCategory {
  return 'opening';
}

/* ------------------------------------------------------------------ */
/*  enriched initial data                                              */
/* ------------------------------------------------------------------ */
function enrichScripts(scripts: Script[]): CustomScript[] {
  const categoryMap: Record<string, ScriptCategory> = {
    s001: 'conversion',
    s002: 'product',
    s003: 'product',
  };

  return scripts.map((s) => ({
    ...s,
    category: categoryMap[s.id] || deriveCategory(s),
    scenario: s.hotspotName || '通用场景',
    tags: [DIMENSION_CONFIG[s.dimension].label, `热度${s.heatLevel}`],
    isCustom: false,
  }));
}

/* Additional demo scripts to populate the page */
const DEMO_SCRIPTS: CustomScript[] = [
  {
    id: 'demo-001', title: '开场欢迎', content: '欢迎来到直播间！新来的朋友们点个关注不迷路，今天给大家准备超多福利，保证不让你们白来！',
    dimension: 'holiday', heatLevel: 3, usageCount: 234, hotspotId: 'hotspot-001',
    category: 'opening', scenario: '日常开场', tags: ['开场', '日常'],
  },
  {
    id: 'demo-002', title: '节日开场', content: '家人们！年货节来了！今天给你们准备了超级年货清单！空气炸锅、微波炉、电烤箱，全部底价值得抢！库存有限，手慢无！',
    dimension: 'holiday', heatLevel: 5, usageCount: 456, hotspotId: 'hotspot-001',
    category: 'opening', scenario: '年货节开场', tags: ['年货节', '开场'],
  },
  {
    id: 'demo-003', title: '天气关怀开场', content: '家人们，最近连续下雨是不是特别难受？衣服晾不干，屋里潮乎乎的？今天给大家带来除湿神器，让梅雨季不再难熬！',
    dimension: 'weather', heatLevel: 4, usageCount: 178, hotspotId: 'hotspot-002',
    category: 'opening', scenario: '梅雨季开场', tags: ['天气', '开场'],
  },
  {
    id: 'demo-004', title: '产品介绍-空气炸锅', content: '这款空气炸锅，360度热风循环，不用放油也能炸出金黄酥脆的口感！4.5升大容量，够一家人使用。清洗也超级方便，抽篮就能洗！',
    dimension: 'holiday', heatLevel: 4, usageCount: 312, hotspotId: 'hotspot-001',
    category: 'product', scenario: '年货节产品介绍', tags: ['产品介绍', '年货节'],
  },
  {
    id: 'demo-005', title: '产品介绍-除湿机', content: '美的这款除湿机，每天12升除湿量，卧室两个小时湿度就能降30%！智能恒湿功能，到了设定湿度自动停机，省电又省心！',
    dimension: 'weather', heatLevel: 4, usageCount: 198, hotspotId: 'hotspot-002',
    category: 'product', scenario: '梅雨季产品介绍', tags: ['产品介绍', '天气'],
  },
  {
    id: 'demo-006', title: '洗地机介绍', content: '吸拖洗一体，干湿垃圾一次搞定！滚刷自清洁，不用手洗拖把。续航35分钟，120平的房子一次搞定！',
    dimension: 'trend', heatLevel: 4, usageCount: 156, hotspotId: 'hotspot-003',
    category: 'product', scenario: '大扫除推荐', tags: ['产品介绍', '清洁'],
  },
  {
    id: 'demo-007', title: '促单-限时秒杀', content: '倒计时3分钟！这个价格只有今天，下播就恢复原价！库存只剩最后12件了，抢到的扣个1让我看看！',
    dimension: 'holiday', heatLevel: 5, usageCount: 567, hotspotId: 'hotspot-001',
    category: 'conversion', scenario: '限时秒杀', tags: ['促单', '限时'],
  },
  {
    id: 'demo-008', title: '促单-价格对比', content: '线下门店599，旗舰店499，今天直播间专属价259！直接对半砍！这个价格你出去绝对找不到第二家！',
    dimension: 'holiday', heatLevel: 5, usageCount: 423, hotspotId: 'hotspot-001',
    category: 'conversion', scenario: '价格促单', tags: ['促单', '比价'],
  },
  {
    id: 'demo-009', title: '促单-赠品加码', content: '今天下单的粉丝，再送价值99元的食谱大全+硅油纸50张！赠品数量有限，送完即止！相当于你花259，带走价值500的大礼包！',
    dimension: 'holiday', heatLevel: 4, usageCount: 345, hotspotId: 'hotspot-001',
    category: 'conversion', scenario: '赠品促单', tags: ['促单', '赠品'],
  },
  {
    id: 'demo-010', title: '互动-提问留人', content: '家里有小宝宝的扣个1，家里有老人的扣个2，租房的扣个3！让我看看今天都是什么类型的家人，好给你们推荐最合适的款式！',
    dimension: 'trend', heatLevel: 3, usageCount: 289, hotspotId: 'hotspot-003',
    category: 'interaction', scenario: '互动留人', tags: ['互动', '留人'],
  },
  {
    id: 'demo-011', title: '互动-福利预告', content: '别走！10分钟后有一波福袋雨！关注+点赞就能参与，中奖率超高！先预告一下，福袋里有免单大奖！',
    dimension: 'holiday', heatLevel: 4, usageCount: 367, hotspotId: 'hotspot-001',
    category: 'interaction', scenario: '福袋预告', tags: ['互动', '福袋'],
  },
  {
    id: 'demo-012', title: '互动-点赞引导', content: '觉得今天价格给力的，双击屏幕给我点个赞！点赞到1万，我再给大家上一波限量秒杀！点赞不要停！',
    dimension: 'renovation', heatLevel: 3, usageCount: 234, hotspotId: 'hotspot-005',
    category: 'interaction', scenario: '点赞引导', tags: ['互动', '点赞'],
  },
  {
    id: 'demo-013', title: '收尾-总结催付', content: '今天所有的福利款都给大家介绍完了，还在犹豫的家人抓紧下单！库存真的不多了，客服已经在催我下播了，最后一波订单接完就下播！',
    dimension: 'holiday', heatLevel: 4, usageCount: 198, hotspotId: 'hotspot-001',
    category: 'closing', scenario: '收尾催付', tags: ['收尾', '催付'],
  },
  {
    id: 'demo-014', title: '收尾-关注引导', content: '今天没抢到的家人别灰心，点关注，明天同一时间开播！明天有新款首发，关注了的粉丝优先抢购！',
    dimension: 'weather', heatLevel: 3, usageCount: 156, hotspotId: 'hotspot-002',
    category: 'closing', scenario: '关注引导', tags: ['收尾', '关注'],
  },
  {
    id: 'demo-015', title: '收尾-感谢话术', content: '感谢大家今晚的陪伴！每一个下单的家人我都会记住，明天直播间抽取一位幸运粉丝送神秘大礼！爱你们，晚安！',
    dimension: 'solar_term', heatLevel: 3, usageCount: 134, hotspotId: 'hotspot-004',
    category: 'closing', scenario: '感谢收尾', tags: ['收尾', '感谢'],
  },
];

/* ------------------------------------------------------------------ */
/*  Toast component                                                    */
/* ------------------------------------------------------------------ */
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-20 right-6 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg-elevated border border-border-default shadow-card"
          >
            {t.type === 'success' ? (
              <Check size={16} className="text-accent-green flex-shrink-0" />
            ) : (
              <Sparkles size={16} className="text-accent-blue flex-shrink-0" />
            )}
            <span className="text-sm text-text-primary">{t.message}</span>
            <button onClick={() => onRemove(t.id)} className="ml-2 text-text-muted hover:text-text-secondary">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Edit Modal                                                         */
/* ------------------------------------------------------------------ */
const ScriptEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (script: Omit<CustomScript, 'id' | 'usageCount'>) => void;
  editScript?: CustomScript | null;
}> = ({ isOpen, onClose, onSave, editScript }) => {
  const [category, setCategory] = useState<ScriptCategory>('opening');
  const [dimension, setDimension] = useState<Dimension>('holiday');
  const [scenario, setScenario] = useState('');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (editScript) {
      setCategory(editScript.category);
      setDimension(editScript.dimension);
      setScenario(editScript.scenario || '');
      setContent(editScript.content);
      setTitle(editScript.title);
    } else {
      setCategory('opening');
      setDimension('holiday');
      setScenario('');
      setContent('');
      setTitle('');
    }
  }, [editScript, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !title.trim()) return;
    onSave({
      title: title.trim(),
      content: content.trim(),
      dimension,
      heatLevel: 3,
      category,
      scenario: scenario.trim() || undefined,
      tags: [CATEGORY_LABEL_MAP[category], DIMENSION_CONFIG[dimension].label],
      isCustom: true,
      hotspotId: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60" />
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-[640px] bg-bg-elevated rounded-2xl border border-border-default shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
            <h2 className="text-xl font-semibold text-text-primary">
              {editScript ? '编辑话术' : '新建话术'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-secondary transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-tertiary mb-1.5">话术分类</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ScriptCategory)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-sm text-text-primary outline-none focus:border-border-focus transition-colors"
                >
                  {CATEGORY_LIST.filter((c) => c.key !== 'all').map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-tertiary mb-1.5">关联维度</label>
                <select
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value as Dimension)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-sm text-text-primary outline-none focus:border-border-focus transition-colors"
                >
                  {DIMENSION_LIST.map((d) => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">话术标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给话术起个名字..."
                className="w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">适用场景</label>
              <input
                type="text"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="例如：年货节开场、梅雨季产品介绍..."
                className="w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">话术内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="输入话术内容..."
                rows={6}
                className="w-full px-3 py-2 bg-bg-input border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus transition-colors resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-bg-input border border-border-default rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-all"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-all"
              >
                {editScript ? '保存修改' : '保存话术'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ------------------------------------------------------------------ */
/*  Script Card                                                        */
/* ------------------------------------------------------------------ */
const ScriptCard: React.FC<{
  script: CustomScript;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onCopy: (content: string) => void;
  onEdit: (script: CustomScript) => void;
  onDelete?: (id: string) => void;
}> = ({ script, isFavorited, onToggleFavorite, onCopy, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const dimConfig = DIMENSION_CONFIG[script.dimension];
  const heatConfig = HEAT_CONFIG[script.heatLevel];
  const categoryLabel = CATEGORY_LABEL_MAP[script.category] || '通用';

  const handleCopy = () => {
    onCopy(script.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 30, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="bg-bg-card border border-border-default rounded-xl p-5 hover:border-border-hover hover:shadow-card transition-all duration-200 group"
    >
      {/* Top: tags + actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category tag */}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-blue/10 text-accent-blue">
            {categoryLabel}
          </span>
          {/* Dimension tag */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
            style={{ backgroundColor: dimConfig.bgColor, color: dimConfig.color }}
          >
            <DimensionIcon dimension={script.dimension} size={12} />
            {dimConfig.label}
          </span>
          {/* Heat badge */}
          <span
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: heatConfig.bgColor, color: heatConfig.color }}
          >
            {heatConfig.stars}
          </span>
          {/* Scenario */}
          {script.scenario && (
            <span className="text-xs text-text-tertiary">{script.scenario}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {script.isCustom && (
            <button
              onClick={() => onEdit(script)}
              className="p-1.5 rounded-lg text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-all"
              title="编辑"
            >
              <Edit3 size={14} />
            </button>
          )}
          {script.isCustom && onDelete && (
            <button
              onClick={() => onDelete(script.id)}
              className="p-1.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p
          className={cn(
            'text-sm text-text-primary leading-relaxed whitespace-pre-wrap',
            !expanded && 'line-clamp-3'
          )}
        >
          {script.content}
        </p>
        {script.content.length > 120 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent-blue hover:text-accent-blue/80 mt-1 transition-colors"
          >
            {expanded ? '收起' : '展开'}
          </button>
        )}
      </div>

      {/* Bottom info */}
      <div className="flex items-center justify-between pt-3 border-t border-border-default/60">
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span>使用 {script.usageCount}次</span>
          {script.tags?.map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-bg-input rounded text-text-muted">{tag}</span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleFavorite(script.id)}
            className={cn(
              'p-2 rounded-lg transition-all duration-200',
              isFavorited
                ? 'text-heat-4 bg-heat-4/10'
                : 'text-text-muted hover:text-heat-4 hover:bg-heat-4/10'
            )}
            title={isFavorited ? '取消收藏' : '收藏'}
          >
            <motion.div
              whileTap={{ scale: 1.3 }}
              transition={{ duration: 0.15 }}
            >
              <Star size={16} fill={isFavorited ? 'currentColor' : 'none'} />
            </motion.div>
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              'p-2 rounded-lg transition-all duration-200 flex items-center gap-1',
              copied
                ? 'text-accent-green bg-accent-green/10'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-card-hover'
            )}
            title="复制"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span className="text-xs">{copied ? '已复制' : '复制'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */
const EmptyState: React.FC<{ type: 'no-results' | 'no-favorites'; onClear?: () => void }> = ({ type, onClear }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20"
  >
    <img src="/empty-state.svg" alt="" className="w-32 h-32 mb-4 opacity-60" />
    <h3 className="text-lg font-semibold text-text-secondary mb-2">
      {type === 'no-favorites' ? '还没有收藏的话术' : '没有找到匹配的话术'}
    </h3>
    <p className="text-sm text-text-tertiary mb-4">
      {type === 'no-favorites'
        ? '浏览话术库，点击星形图标收藏'
        : '尝试调整筛选条件或搜索关键词'}
    </p>
    {type === 'no-results' && onClear && (
      <button
        onClick={onClear}
        className="px-4 py-2 bg-bg-card border border-border-default rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-all"
      >
        清除筛选
      </button>
    )}
  </motion.div>
);

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
const ScriptsPage: React.FC = () => {
  const { data: apiScripts, isLoading } = useAllScripts();

  const [activeCategory, setActiveCategory] = useState<ScriptCategory>('all');
  const [activeDimension, setActiveDimension] = useState<Dimension | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [customScripts, setCustomScripts] = useState<CustomScript[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<CustomScript | null>(null);

  // 从API加载话术数据
  const builtInScripts = useMemo(() => {
    return apiScripts ? enrichScripts(apiScripts) : [];
  }, [apiScripts]);

  /* Load from localStorage */
  useEffect(() => {
    try {
      const fav = localStorage.getItem(FAVORITES_KEY);
      if (fav) setFavorites(new Set(JSON.parse(fav)));
      const custom = localStorage.getItem(CUSTOM_SCRIPTS_KEY);
      if (custom) setCustomScripts(JSON.parse(custom));
    } catch {
      // ignore
    }
  }, []);

  /* Persist favorites */
  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  /* Persist custom scripts */
  useEffect(() => {
    localStorage.setItem(CUSTOM_SCRIPTS_KEY, JSON.stringify(customScripts));
  }, [customScripts]);

  /* Toast helper */
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = uid();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* All scripts combined */
  const allScripts = useMemo(() => {
    const demo = DEMO_SCRIPTS;
    return [...builtInScripts, ...demo, ...customScripts];
  }, [builtInScripts, customScripts]);

  /* Filtering */
  const filteredScripts = useMemo(() => {
    let result = allScripts;

    // Category filter
    if (activeCategory !== 'all') {
      result = result.filter((s) => s.category === activeCategory);
    }

    // Dimension filter
    if (activeDimension !== 'all') {
      result = result.filter((s) => s.dimension === activeDimension);
    }

    // Favorites filter
    if (showFavorites) {
      result = result.filter((s) => favorites.has(s.id));
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.content.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          (s.scenario && s.scenario.toLowerCase().includes(q)) ||
          s.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allScripts, activeCategory, activeDimension, showFavorites, favorites, searchQuery]);

  /* Stats */
  const stats = useMemo(() => {
    const byCategory = CATEGORY_LIST.filter((c) => c.key !== 'all').map((c) => ({
      ...c,
      count: allScripts.filter((s) => s.category === c.key).length,
    }));
    return { total: allScripts.length, byCategory };
  }, [allScripts]);

  /* Handlers */
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCopy = useCallback(
    async (content: string) => {
      try {
        await navigator.clipboard.writeText(content);
        addToast('话术已复制到剪贴板');
      } catch {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        addToast('话术已复制到剪贴板');
      }
    },
    [addToast]
  );

  const handleSaveScript = useCallback(
    (data: Omit<CustomScript, 'id' | 'usageCount'>) => {
      if (editingScript) {
        setCustomScripts((prev) =>
          prev.map((s) =>
            s.id === editingScript.id
              ? { ...s, ...data }
              : s
          )
        );
        addToast('话术已更新');
      } else {
        const newScript: CustomScript = {
          ...data,
          id: `custom-${uid()}`,
          usageCount: 0,
        };
        setCustomScripts((prev) => [...prev, newScript]);
        addToast('话术已创建');
      }
      setEditingScript(null);
    },
    [editingScript, addToast]
  );

  const handleDeleteScript = useCallback(
    (id: string) => {
      setCustomScripts((prev) => prev.filter((s) => s.id !== id));
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      addToast('话术已删除');
    },
    [addToast]
  );

  const openNewModal = useCallback(() => {
    setEditingScript(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((script: CustomScript) => {
    setEditingScript(script);
    setIsModalOpen(true);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveCategory('all');
    setActiveDimension('all');
    setSearchQuery('');
    setShowFavorites(false);
  }, []);

  /* Animation variants */
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  return (
    <div>
      <TopBar title="话术助手" subtitle="直播话术和内容创作建议库" />

      {/* Toast container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Edit Modal */}
      <ScriptEditModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingScript(null);
        }}
        onSave={handleSaveScript}
        editScript={editingScript}
      />

      <div className="space-y-6">
        {/* ========== Top Control Bar ========== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full lg:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="搜索话术内容、场景、标签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-bg-card border border-border-default rounded-xl text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
                showFavorites
                  ? 'bg-heat-4/10 border-heat-4/30 text-heat-4'
                  : 'bg-bg-card border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
              )}
            >
              <Heart size={16} fill={showFavorites ? 'currentColor' : 'none'} />
              <span>收藏夹</span>
              {favorites.size > 0 && (
                <span className="ml-0.5 text-xs bg-heat-4/20 text-heat-4 px-1.5 py-0.5 rounded-full">
                  {favorites.size}
                </span>
              )}
            </button>
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-xl text-sm font-medium hover:bg-accent-blue/90 transition-all"
            >
              <Plus size={16} />
              <span>新建话术</span>
            </button>
          </div>
        </div>

        {/* ========== Category Tabs ========== */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_LIST.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key && !showFavorites;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setShowFavorites(false);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border',
                  isActive
                    ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                    : 'bg-bg-card border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
                )}
              >
                <Icon size={15} />
                <span>{cat.label}</span>
                {cat.key !== 'all' && (
                  <span className={cn('text-xs', isActive ? 'text-accent-blue/70' : 'text-text-muted')}>
                    {stats.byCategory.find((c) => c.key === cat.key)?.count || 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========== Dimension Filters ========== */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-tertiary mr-1">热点维度：</span>
          <button
            onClick={() => setActiveDimension('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              activeDimension === 'all'
                ? 'bg-bg-elevated border-border-hover text-text-primary'
                : 'bg-transparent border-transparent text-text-tertiary hover:text-text-secondary'
            )}
          >
            全部
          </button>
          {DIMENSION_LIST.map((dim) => (
            <button
              key={dim.key}
              onClick={() => setActiveDimension(dim.key)}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                activeDimension === dim.key
                  ? 'text-text-primary border-border-hover'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary'
              )}
              style={
                activeDimension === dim.key
                  ? { backgroundColor: DIMENSION_CONFIG[dim.key].bgColor, borderColor: DIMENSION_CONFIG[dim.key].color + '40' }
                  : {}
              }
            >
              <DimensionIcon dimension={dim.key} size={12} />
              <span style={activeDimension === dim.key ? { color: DIMENSION_CONFIG[dim.key].color } : {}}>
                {dim.label}
              </span>
            </button>
          ))}
        </div>

        {/* ========== Stats Bar ========== */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-primary font-medium">
            {showFavorites ? `我的收藏 (${filteredScripts.length}条)` : `共 ${filteredScripts.length} 条话术`}
          </span>
          {!showFavorites && (
            <>
              <span className="text-text-muted">|</span>
              {stats.byCategory.map((cat, idx) => (
                <span key={cat.key} className="flex items-center gap-1 text-xs text-text-tertiary">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        ['#0A84FF', '#BF5AF2', '#FF9500', '#34C759', '#FF375F'][idx] || '#64748B',
                    }}
                  />
                  {cat.label} {cat.count}
                  {idx < stats.byCategory.length - 1 && <span className="ml-1 text-text-muted">|</span>}
                </span>
              ))}
            </>
          )}
        </div>

        {/* ========== Script List ========== */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-bg-card border border-border-default rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 bg-bg-input rounded w-20" />
                  <div className="h-5 bg-bg-input rounded w-16" />
                </div>
                <div className="h-4 bg-bg-input rounded w-full mb-2" />
                <div className="h-4 bg-bg-input rounded w-2/3" />
              </div>
            ))}
          </div>
        )}
        <AnimatePresence mode="wait">
          {!isLoading && filteredScripts.length === 0 ? (
            <EmptyState
              key="empty"
              type={showFavorites ? 'no-favorites' : 'no-results'}
              onClear={clearFilters}
            />
          ) : (
            <motion.div
              key={`${activeCategory}-${activeDimension}-${showFavorites}-${searchQuery}`}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              <AnimatePresence>
                {filteredScripts.map((script) => (
                  <ScriptCard
                    key={script.id}
                    script={script}
                    isFavorited={favorites.has(script.id)}
                    onToggleFavorite={toggleFavorite}
                    onCopy={handleCopy}
                    onEdit={openEditModal}
                    onDelete={script.isCustom ? handleDeleteScript : undefined}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ScriptsPage;
