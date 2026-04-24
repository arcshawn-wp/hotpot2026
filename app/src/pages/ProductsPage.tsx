import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Star, X, ShoppingCart, Download, Copy,
  Check, SlidersHorizontal, Package, ExternalLink
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import HeatProgressBar from '@/components/HeatProgressBar';
import DimensionTag from '@/components/DimensionTag';
import HeatBadge from '@/components/HeatBadge';
import { DIMENSION_CONFIG, HEAT_CONFIG } from '@/data/types';
import type { Dimension, HeatLevel } from '@/data/types';
import { useAppDate } from '@/contexts/DateContext';
import { useAllProducts } from '@/hooks/useApi';

// ------------------------------------------------------------------
// Product type from API
// ------------------------------------------------------------------
interface ProductDisplay {
  id: string;
  name: string;
  image: string;
  heatScore: number;
  heatLevel: HeatLevel;
  reason: string;
  dimension: Dimension;
  sourceHotspot?: string;
  script?: string;
  price: number;
  category: string;
  subCategory: string;
  specs: string;
  scriptCount: number;
}

// ------------------------------------------------------------------
// Adapt API product to display format
// ------------------------------------------------------------------
function adaptProduct(apiProduct: any): ProductDisplay {
  return {
    id: apiProduct.productId || apiProduct.id,
    name: apiProduct.name,
    image: apiProduct.image || '',
    heatScore: apiProduct.heatScore,
    heatLevel: (apiProduct.heatLevel || 1) as HeatLevel,
    reason: apiProduct.reason || '',
    dimension: (apiProduct.dimension || 'trend') as Dimension,
    sourceHotspot: apiProduct.sourceHotspot,
    script: apiProduct.script,
    price: parseFloat(apiProduct.price) || 0,
    category: apiProduct.category || '其他',
    subCategory: apiProduct.subCategory || '其他',
    specs: apiProduct.specs || '',
    scriptCount: apiProduct.scriptCount || 0,
  };
}

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------
const CATEGORIES = ['大家电', '小家电', '家装建材', '家居软装', '智能设备'];

const SORT_OPTIONS = [
  { key: 'heat_desc', label: '按热度降序' },
  { key: 'price_asc', label: '按价格升序' },
  { key: 'price_desc', label: '按价格降序' },
  { key: 'name', label: '按名称排序' },
] as const;

const PRICE_PRESETS = [
  { label: '0-100', min: 0, max: 100 },
  { label: '100-300', min: 100, max: 300 },
  { label: '300-500', min: 300, max: 500 },
  { label: '500-1000', min: 500, max: 1000 },
  { label: '1000+', min: 1000, max: 5000 },
];

const EASE_CUBIC = [0.16, 1, 0.3, 1] as [number, number, number, number];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// Product Card Component
// ------------------------------------------------------------------
interface ProductCardProps {
  product: ProductDisplay;
  index: number;
  isSelected: boolean;
  isBatchMode: boolean;
  isFavorited: boolean;
  onToggleSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpenDetail: (product: ProductDisplay) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product, index, isSelected, isBatchMode, isFavorited,
  onToggleSelect, onToggleFavorite, onOpenDetail,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: EASE_CUBIC, delay: index * 0.05 }}
      className={`group relative bg-bg-card border rounded-xl overflow-hidden transition-all duration-250 cursor-pointer
        ${isSelected ? 'border-accent-blue bg-[rgba(10,132,255,0.05)]' : 'border-border-default hover:border-border-hover hover:-translate-y-1 hover:shadow-card'}
      `}
      style={{ boxShadow: isSelected ? '0 0 0 1px #0A84FF' : undefined }}
      onClick={() => isBatchMode ? onToggleSelect(product.id) : onOpenDetail(product)}
    >
      {/* Checkbox for batch mode */}
      <AnimatePresence>
        {isBatchMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-3 left-3 z-20 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors"
            style={{
              borderColor: isSelected ? '#0A84FF' : '#475569',
              backgroundColor: isSelected ? '#0A84FF' : 'transparent',
            }}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(product.id); }}
          >
            {isSelected && <Check size={14} className="text-white" />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Favorite button */}
      <button
        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:bg-black/60"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id); }}
      >
        <motion.div
          animate={isFavorited ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Star
            size={16}
            className={isFavorited ? 'text-heat-4 fill-heat-4' : 'text-text-secondary'}
          />
        </motion.div>
      </button>

      {/* Image area with 16:10 aspect ratio */}
      <div className="relative aspect-[16/10] bg-bg-input flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-bg-input to-bg-card" />
        <div className="relative z-10 flex flex-col items-center gap-1">
          <Package size={32} className="text-text-muted" />
          <span className="text-xs text-text-muted font-medium">{product.name.charAt(0)}</span>
        </div>
        {/* Dimension tag on image */}
        <div className="absolute top-3 left-3 z-10">
          <DimensionTag dimension={product.dimension} size="sm" />
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-accent-blue/0 group-hover:bg-accent-blue/5 transition-colors duration-250" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-250">
          <span className="px-3 py-1.5 bg-bg-elevated/90 text-text-primary text-xs rounded-md flex items-center gap-1">
            <ExternalLink size={12} /> 查看详情
          </span>
        </div>
      </div>

      {/* Info area */}
      <div className="p-4 space-y-2.5">
        {/* Name */}
        <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Specs */}
        <p className="text-xs text-text-tertiary">{product.specs}</p>

        {/* Dimension + Heat Badge row */}
        <div className="flex items-center gap-2 flex-wrap">
          <HeatBadge level={product.heatLevel} showStars showLabel={false} size="sm" />
          <span className="text-xs font-data font-semibold" style={{ color: HEAT_CONFIG[product.heatLevel].color }}>
            热度 {product.heatScore}
          </span>
        </div>

        {/* Heat progress bar */}
        <HeatProgressBar value={product.heatScore} height={4} animated delay={index * 80} />

        {/* Source hotspot */}
        {product.sourceHotspot && (
          <div className="flex items-center gap-1.5 py-1">
            <span className="text-[10px] text-text-muted leading-none">来自</span>
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded"
              style={{
                color: DIMENSION_CONFIG[product.dimension].color,
                backgroundColor: DIMENSION_CONFIG[product.dimension].bgColor,
              }}
            >
              {product.sourceHotspot}
            </span>
          </div>
        )}

        {/* Price + Script count */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-data font-bold text-text-primary">
            &yen;{product.price}
          </span>
          <span className="text-xs text-text-tertiary flex items-center gap-1">
            <Copy size={11} /> 话术 {product.scriptCount}条
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            className="flex-1 h-8 bg-accent-blue/10 text-accent-blue text-xs font-medium rounded-lg hover:bg-accent-blue/20 transition-colors flex items-center justify-center gap-1"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <ShoppingCart size={12} /> 快速添加
          </button>
          <button
            className="flex-1 h-8 bg-bg-input text-text-secondary text-xs font-medium rounded-lg hover:bg-bg-elevated hover:text-text-primary transition-colors flex items-center justify-center gap-1"
            onClick={(e) => { e.stopPropagation(); onOpenDetail(product); }}
          >
            <ExternalLink size={12} /> 查看详情
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ------------------------------------------------------------------
// Product Detail Drawer
// ------------------------------------------------------------------
interface ProductDetailDrawerProps {
  product: ProductDisplay | null;
  onClose: () => void;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
}

const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  product, onClose, isFavorited, onToggleFavorite,
}) => {
  return (
    <AnimatePresence>
      {product && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: EASE_CUBIC }}
            className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-bg-elevated z-50 overflow-y-auto"
            style={{ boxShadow: '-8px 0 32px rgba(0,0,0,0.3)' }}
          >
            {product && (
              <div className="pb-8">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <X size={16} className="text-text-primary" />
                </button>

                {/* Product image area */}
                <div className="h-[200px] bg-bg-input flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-bg-input to-bg-card" />
                  <Package size={64} className="text-text-muted relative z-10" />
                  <DimensionTag dimension={product.dimension} size="md" />
                </div>

                {/* Product info */}
                <div className="p-6 space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-text-primary mb-1">{product.name}</h2>
                    <p className="text-sm text-text-tertiary">{product.specs}</p>
                  </div>

                  {/* Price + Heat */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-data font-bold text-text-primary">&yen;{product.price}</span>
                    <div className="flex items-center gap-2">
                      <HeatBadge level={product.heatLevel} showStars showLabel size="md" />
                    </div>
                  </div>

                  <HeatProgressBar value={product.heatScore} height={6} showValue animated />

                  {/* Associated hotspot */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-text-primary">关联热点</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <DimensionTag dimension={product.dimension} size="md" />
                      <span className="text-sm text-text-secondary">{product.reason}</span>
                    </div>
                  </div>

                  {/* Script preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <Copy size={14} /> 推荐话术
                    </h4>
                    <div className="bg-bg-card border border-border-default rounded-lg p-4">
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {product.script || `${product.name}，现在入手正当时！品质保证，价格优惠，赶紧下单吧！`}
                      </p>
                    </div>
                  </div>

                  {/* Category info */}
                  <div className="flex items-center gap-4 text-xs text-text-tertiary">
                    <span>品类: {product.category}</span>
                    <span>子类: {product.subCategory}</span>
                    <span>话术: {product.scriptCount}条</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button className="flex-1 h-11 bg-accent-blue text-white text-sm font-semibold rounded-lg hover:bg-accent-blue/90 transition-colors flex items-center justify-center gap-2">
                      <ShoppingCart size={16} /> 加入排期
                    </button>
                    <button
                      onClick={() => onToggleFavorite(product.id)}
                      className={`flex-1 h-11 border text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        isFavorited
                          ? 'border-heat-4 text-heat-4 bg-heat-4/10'
                          : 'border-border-default text-text-secondary hover:border-border-hover hover:text-text-primary'
                      }`}
                    >
                      <Star size={16} className={isFavorited ? 'fill-heat-4' : ''} /> {isFavorited ? '已收藏' : '收藏'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ------------------------------------------------------------------
// Main Products Page
// ------------------------------------------------------------------
const ProductsPage: React.FC = () => {
  // -- API data --
  const { data: apiProducts, isLoading } = useAllProducts();

  // -- State --
  const [selectedDimensions, setSelectedDimensions] = useState<Dimension[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedHeatLevels, setSelectedHeatLevels] = useState<HeatLevel[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [sortKey, setSortKey] = useState<string>('heat_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [detailProduct, setDetailProduct] = useState<ProductDisplay | null>(null);
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  // Convert API data to display format
  const allProducts = useMemo(() => {
    return (apiProducts || []).map(adaptProduct);
  }, [apiProducts]);

  // -- Toggle helpers --
  const toggleDimension = useCallback((dim: Dimension) => {
    setSelectedDimensions(prev =>
      prev.includes(dim) ? prev.filter(d => d !== dim) : [...prev, dim]
    );
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }, []);

  const toggleHeatLevel = useCallback((level: HeatLevel) => {
    setSelectedHeatLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavoritedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredProducts.map(p => p.id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setBatchMode(false);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedDimensions([]);
    setSelectedCategories([]);
    setSelectedHeatLevels([]);
    setPriceRange([0, 5000]);
    setSearchQuery('');
  }, []);

  // -- Filtered & sorted products --
  const filteredProducts = useMemo(() => {
    let list = [...allProducts];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.reason.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // Dimensions
    if (selectedDimensions.length > 0) {
      list = list.filter(p => selectedDimensions.includes(p.dimension));
    }

    // Categories
    if (selectedCategories.length > 0) {
      list = list.filter(p => selectedCategories.includes(p.category));
    }

    // Heat levels
    if (selectedHeatLevels.length > 0) {
      list = list.filter(p => selectedHeatLevels.includes(p.heatLevel));
    }

    // Price range
    list = list.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Sort
    switch (sortKey) {
      case 'heat_desc':
        list.sort((a, b) => b.heatScore - a.heatScore);
        break;
      case 'price_asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        break;
    }

    return list;
  }, [searchQuery, selectedDimensions, selectedCategories, selectedHeatLevels, priceRange, sortKey, allProducts]);

  // -- Active filter tags --
  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string; onRemove: () => void }[] = [];

    selectedDimensions.forEach(dim => {
      tags.push({
        key: `dim-${dim}`,
        label: DIMENSION_CONFIG[dim].label,
        onRemove: () => toggleDimension(dim),
      });
    });

    selectedCategories.forEach(cat => {
      tags.push({
        key: `cat-${cat}`,
        label: cat,
        onRemove: () => toggleCategory(cat),
      });
    });

    selectedHeatLevels.forEach(level => {
      tags.push({
        key: `heat-${level}`,
        label: HEAT_CONFIG[level].stars,
        onRemove: () => toggleHeatLevel(level),
      });
    });

    if (priceRange[0] > 0 || priceRange[1] < 5000) {
      tags.push({
        key: 'price',
        label: `\u00A5${priceRange[0]}-${priceRange[1]}`,
        onRemove: () => setPriceRange([0, 5000]),
      });
    }

    return tags;
  }, [selectedDimensions, selectedCategories, selectedHeatLevels, priceRange, toggleDimension, toggleCategory, toggleHeatLevel]);

  const hasActiveFilters = activeFilterTags.length > 0 || searchQuery.trim().length > 0;

  // -- Render --
  return (
    <div className="min-h-[100dvh]">
      <TopBar title="选品引擎" subtitle="按热点维度筛选选品推荐" />

      {/* ===== Search bar + Batch controls ===== */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center flex-1 min-w-[200px] bg-bg-card border border-border-default rounded-lg px-3 py-2 gap-2 focus-within:border-accent-blue transition-colors">
          <Search size={16} className="text-text-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索选品名称、品类、热点..."
            className="bg-transparent text-sm text-text-primary placeholder-text-muted outline-none w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-text-muted hover:text-text-secondary">
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => { setBatchMode(!batchMode); if (batchMode) setSelectedIds(new Set()); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            batchMode ? 'bg-accent-blue text-white' : 'bg-bg-card border border-border-default text-text-secondary hover:text-text-primary hover:border-border-hover'
          }`}
        >
          <Check size={14} /> 批量选择
        </button>

        <button className="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-default rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors">
          <Download size={14} /> 导出
        </button>

        <button
          onClick={() => setFilterCollapsed(!filterCollapsed)}
          className="lg:hidden flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-default rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <SlidersHorizontal size={14} /> 筛选
        </button>
      </div>

      <div className="flex gap-4">
        {/* ===== Filter Panel (Left Sidebar) ===== */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: EASE_CUBIC }}
          className={`w-[260px] flex-shrink-0 bg-bg-card border border-border-default rounded-xl p-5 space-y-5 overflow-y-auto max-h-[calc(100dvh-180px)] sticky top-0 transition-all
            ${filterCollapsed ? 'hidden lg:block' : 'block'}
          `}
        >
          {/* Dimension filter */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">热点维度</h4>
            <div className="space-y-1.5">
              {(['weather', 'solar_term', 'holiday', 'trend', 'renovation'] as Dimension[]).map(dim => {
                const cfg = DIMENSION_CONFIG[dim];
                const checked = selectedDimensions.includes(dim);
                return (
                  <label
                    key={dim}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-bg-input transition-colors group"
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors"
                      style={{
                        borderColor: checked ? cfg.color : '#475569',
                        backgroundColor: checked ? cfg.color : 'transparent',
                      }}
                    >
                      {checked && <Check size={10} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleDimension(dim)}
                    />
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{cfg.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Category filter */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">品类</h4>
            <div className="space-y-1.5">
              {CATEGORIES.map(cat => {
                const checked = selectedCategories.includes(cat);
                return (
                  <label
                    key={cat}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-bg-input transition-colors group"
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-sm border border-border-hover flex items-center justify-center transition-colors"
                      style={{
                        borderColor: checked ? '#0A84FF' : '#475569',
                        backgroundColor: checked ? '#0A84FF' : 'transparent',
                      }}
                    >
                      {checked && <Check size={10} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleCategory(cat)}
                    />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{cat}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Heat level filter */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">热度等级</h4>
            <div className="space-y-1.5">
              {([5, 4, 3, 2, 1] as HeatLevel[]).map(level => {
                const cfg = HEAT_CONFIG[level];
                const checked = selectedHeatLevels.includes(level);
                return (
                  <label
                    key={level}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-bg-input transition-colors group"
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors"
                      style={{
                        borderColor: checked ? cfg.color : '#475569',
                        backgroundColor: checked ? cfg.color : 'transparent',
                      }}
                    >
                      {checked && <Check size={10} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleHeatLevel(level)}
                    />
                    <span className="text-xs tracking-tight" style={{ color: cfg.color }}>{cfg.stars}</span>
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{cfg.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Price range */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">价格区间</h4>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="number"
                min={0}
                max={5000}
                value={priceRange[0]}
                onChange={(e) => setPriceRange([Math.max(0, Number(e.target.value)), priceRange[1]])}
                className="w-full bg-bg-input border border-border-default rounded-md px-2 py-1.5 text-sm text-text-primary text-center outline-none focus:border-accent-blue"
              />
              <span className="text-text-muted">-</span>
              <input
                type="number"
                min={0}
                max={5000}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Math.min(5000, Number(e.target.value))])}
                className="w-full bg-bg-input border border-border-default rounded-md px-2 py-1.5 text-sm text-text-primary text-center outline-none focus:border-accent-blue"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setPriceRange([preset.min, preset.max])}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    priceRange[0] === preset.min && priceRange[1] === preset.max
                      ? 'bg-accent-blue/15 text-accent-blue'
                      : 'bg-bg-input text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">排序方式</h4>
            <div className="space-y-1">
              {SORT_OPTIONS.map(opt => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer hover:bg-bg-input transition-colors group"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors"
                    style={{
                      borderColor: sortKey === opt.key ? '#0A84FF' : '#475569',
                    }}
                  >
                    {sortKey === opt.key && <div className="w-2 h-2 rounded-full bg-accent-blue" />}
                  </div>
                  <input
                    type="radio"
                    name="sort"
                    className="sr-only"
                    checked={sortKey === opt.key}
                    onChange={() => setSortKey(opt.key)}
                  />
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={clearAllFilters}
              className="w-full text-center text-xs text-text-tertiary hover:text-accent-blue transition-colors pt-2 border-t border-border-default"
            >
              清除全部筛选
            </motion.button>
          )}
        </motion.aside>

        {/* ===== Main Content ===== */}
        <div className="flex-1 min-w-0">
          {/* Active filter tags */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 mb-4 flex-wrap overflow-hidden"
              >
                {activeFilterTags.map(tag => (
                  <motion.span
                    key={tag.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-bg-input rounded-md text-xs text-text-primary"
                  >
                    {tag.label}
                    <button onClick={tag.onRemove} className="hover:text-accent-blue transition-colors">
                      <X size={12} />
                    </button>
                  </motion.span>
                ))}
                {searchQuery && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-bg-input rounded-md text-xs text-text-primary"
                  >
                    搜索: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="hover:text-accent-blue transition-colors">
                      <X size={12} />
                    </button>
                  </motion.span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-accent-blue hover:underline ml-1"
                >
                  清除全部
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-text-tertiary">
              共 <span className="text-text-primary font-semibold">{isLoading ? '...' : filteredProducts.length}</span> 款选品
            </span>
            {batchMode && (
              <span className="text-sm text-accent-blue font-medium">
                已选 {selectedIds.size} 款
              </span>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-bg-card border border-border-default rounded-xl p-4 animate-pulse">
                  <div className="w-full h-32 bg-bg-input rounded-lg mb-3" />
                  <div className="h-4 bg-bg-input rounded w-2/3 mb-2" />
                  <div className="h-3 bg-bg-input rounded w-1/2 mb-2" />
                  <div className="h-3 bg-bg-input rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* Product Grid */}
          {!isLoading && filteredProducts.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={idx}
                    isSelected={selectedIds.has(product.id)}
                    isBatchMode={batchMode}
                    isFavorited={favoritedIds.has(product.id)}
                    onToggleSelect={toggleSelect}
                    onToggleFavorite={toggleFavorite}
                    onOpenDetail={setDetailProduct}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24"
            >
              <div className="w-24 h-24 mb-4 opacity-60">
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="80" cy="80" r="50" stroke="#475569" strokeWidth="6" />
                  <line x1="115" y1="115" x2="160" y2="160" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="65" cy="70" r="6" fill="#475569" />
                  <circle cx="95" cy="70" r="6" fill="#475569" />
                  <path d="M55 95 Q80 115 105 95" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-secondary mb-1">没有找到匹配的选品</h3>
              <p className="text-sm text-text-tertiary mb-4">尝试调整筛选条件</p>
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-bg-card border border-border-default text-text-secondary text-sm rounded-lg hover:border-border-hover hover:text-text-primary transition-colors"
              >
                清除筛选
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ===== Batch Action Bar ===== */}
      <AnimatePresence>
        {batchMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.25, ease: EASE_CUBIC }}
            className="fixed bottom-0 left-[240px] right-0 h-14 bg-bg-elevated border-t border-border-default flex items-center justify-between px-6 z-40"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-primary">
                已选 <span className="font-semibold">{selectedIds.size}</span> 款选品
              </span>
              <button
                onClick={selectAll}
                className="text-xs text-accent-blue hover:underline"
              >
                全选
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-text-tertiary hover:text-text-secondary"
              >
                清空
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors">
                <ShoppingCart size={14} /> 加入排期
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-bg-input text-text-secondary text-sm font-medium rounded-lg hover:bg-bg-card hover:text-text-primary transition-colors">
                <Copy size={14} /> 复制话术
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-bg-input text-text-secondary text-sm font-medium rounded-lg hover:bg-bg-card hover:text-text-primary transition-colors">
                <Download size={14} /> 导出清单
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
              >
                取消
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Product Detail Drawer ===== */}
      <ProductDetailDrawer
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        isFavorited={detailProduct ? favoritedIds.has(detailProduct.id) : false}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
};

export default ProductsPage;
