import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus,
  MessageCircle, Eye, ThumbsUp, Hash,
  Copy, Check, ShoppingCart, Lightbulb, AlertCircle,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import TopBar from '@/components/TopBar';
import DimensionTag from '@/components/DimensionTag';
import HeatBadge from '@/components/HeatBadge';
import HeatProgressBar from '@/components/HeatProgressBar';
import { useHotspotDetail, useProductsByHotspot, useHotspotTrend } from '@/hooks/useApi';
import { DIMENSION_CONFIG, HEAT_CONFIG } from '@/data/types';
import type { PlatformDiscussion } from '@/data/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function fadeSlideUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: EASE, delay },
  };
}

function formatCount(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(0) + '万';
  return n.toLocaleString();
}

function sentimentConfig(s: string) {
  switch (s) {
    case 'positive': return { color: '#30D158', bg: 'rgba(48,209,88,0.12)', label: '正面' };
    case 'negative': return { color: '#FF453A', bg: 'rgba(255,69,58,0.12)', label: '负面' };
    case 'mixed': return { color: '#FFCC00', bg: 'rgba(255,204,0,0.12)', label: ' mixed' };
    default: return { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', label: '中性' };
  }
}

function confidenceConfig(score: number) {
  if (score >= 85) return { color: '#30D158', label: '高置信度', desc: '多源数据交叉验证，趋势确定性高' };
  if (score >= 60) return { color: '#FFCC00', label: '中等置信度', desc: '数据支撑充分，存在一定波动风险' };
  return { color: '#FF453A', label: '低置信度', desc: '数据有限，建议持续观察' };
}

/* ------------------------------------------------------------------ */
/*  ConfidenceGauge                                                   */
/* ------------------------------------------------------------------ */
const ConfidenceGauge: React.FC<{ score: number }> = ({ score }) => {
  const config = confidenceConfig(score);
  return (
    <motion.div className="bg-bg-card border border-border-default rounded-xl p-5" {...fadeSlideUp(0.1)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-0.5">置信度评估</h3>
          <p className="text-xs text-text-tertiary">{config.desc}</p>
        </div>
        <div className="text-right">
          <span className="font-data text-3xl font-bold" style={{ color: config.color }}>{score}</span>
          <span className="text-xs text-text-tertiary ml-1">/100</span>
        </div>
      </div>
      {/* Gauge bar */}
      <div className="h-3 bg-bg-input rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${config.color}88, ${config.color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
        <span className="text-xs font-medium" style={{ color: config.color }}>{config.label}</span>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  HeatScoreCard                                                     */
/* ------------------------------------------------------------------ */
const HeatScoreCard: React.FC<{ score: number; level: number; trend: number[] }> = ({ score, level, trend }) => {
  const hc = HEAT_CONFIG[level as keyof typeof HEAT_CONFIG];
  const chartData = trend.map((v, i) => ({ day: `D${i + 1}`, value: v }));
  return (
    <motion.div className="bg-bg-card border border-border-default rounded-xl p-5" {...fadeSlideUp(0.15)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-0.5">热度指数</h3>
          <p className="text-xs text-text-tertiary">近7天热度走势</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-data text-3xl font-bold" style={{ color: hc.color }}>{score}</span>
          <HeatBadge level={level as 1 | 2 | 3 | 4 | 5} size="sm" />
        </div>
      </div>
      <div className="h-[70px] mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="heatGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hc.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={hc.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" hide />
            <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
            <Tooltip
              contentStyle={{ background: '#162033', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#64748B' }}
              itemStyle={{ color: hc.color }}
            />
            <Area type="monotone" dataKey="value" stroke={hc.color} strokeWidth={2} fill="url(#heatGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <HeatProgressBar value={score} height={5} animated />
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  PlatformCard                                                      */
/* ------------------------------------------------------------------ */
const PlatformCard: React.FC<{ platform: PlatformDiscussion; index: number }> = ({ platform, index }) => {
  const s = sentimentConfig(platform.sentiment);
  const iconMap = {
    weibo: { color: '#E6162D', icon: '微' },
    xiaohongshu: { color: '#FE2C55', icon: '书' },
    douyin: { color: '#000000', icon: '抖' },
  };
  const pIcon = iconMap[platform.platform];

  return (
    <motion.div
      className="bg-bg-card border border-border-default rounded-xl overflow-hidden hover:border-border-hover transition-colors duration-200"
      {...fadeSlideUp(0.2 + index * 0.05)}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: pIcon.color }}
          >
            {pIcon.icon}
          </span>
          <span className="text-sm font-semibold text-text-primary">{platform.platformName}</span>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: s.color, backgroundColor: s.bg }}>
          {s.label}
        </span>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-2 gap-3 border-b border-border-default">
        <div>
          <div className="flex items-center gap-1 text-text-tertiary mb-0.5">
            <MessageCircle size={11} />
            <span className="text-[11px]">讨论量</span>
          </div>
          <span className="font-data text-base font-bold text-text-primary">{formatCount(platform.postCount)}</span>
        </div>
        <div>
          <div className="flex items-center gap-1 text-text-tertiary mb-0.5">
            <Eye size={11} />
            <span className="text-[11px]">阅读量</span>
          </div>
          <span className="font-data text-base font-bold text-text-primary">{formatCount(platform.readCount)}</span>
        </div>
      </div>

      {/* Hot Posts */}
      <div className="px-4 py-3">
        <h4 className="text-[11px] font-medium text-text-tertiary mb-2 flex items-center gap-1">
          <ThumbsUp size={11} /> 热门帖子
        </h4>
        <div className="space-y-2">
          {platform.hotPosts.map((post, i) => (
            <p key={i} className="text-xs text-text-secondary leading-relaxed line-clamp-2 hover:text-text-primary transition-colors cursor-pointer">
              {post}
            </p>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div className="px-4 py-3 border-t border-border-default">
        <h4 className="text-[11px] font-medium text-text-tertiary mb-2 flex items-center gap-1">
          <Hash size={11} /> 热词
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {platform.topKeywords.map((kw, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-bg-input text-text-secondary">{kw}</span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  TrendIndicatorCard                                                 */
/* ------------------------------------------------------------------ */
const TrendIndicatorCard: React.FC<{ trendData: any }> = ({ trendData }) => {
  const ti = trendData || { direction: 'stable', vsLastWeek: '+0%', vsLastMonth: '+0%', vsLastYear: '+0%', forecast: '暂无预测数据' };
  const dirIcon = ti.direction === 'up' ? <TrendingUp size={18} className="text-accent-green" /> :
    ti.direction === 'down' ? <TrendingDown size={18} className="text-accent-red" /> :
      <Minus size={18} className="text-text-tertiary" />;

  return (
    <motion.div className="bg-bg-card border border-border-default rounded-xl p-5" {...fadeSlideUp(0.25)}>
      <div className="flex items-center gap-2 mb-4">
        {dirIcon}
        <h3 className="text-sm font-semibold text-text-primary">趋势风向标</h3>
        <span className={`text-xs font-medium ml-auto ${ti.direction === 'up' ? 'text-accent-green' : ti.direction === 'down' ? 'text-accent-red' : 'text-text-tertiary'}`}>
          {ti.direction === 'up' ? '上升趋势' : ti.direction === 'down' ? '下降趋势' : '平稳'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 rounded-lg bg-bg-input">
          <p className="text-[10px] text-text-tertiary mb-1">环比上周</p>
          <p className={`font-data text-lg font-bold ${ti.vsLastWeek.startsWith('+') ? 'text-accent-green' : ti.vsLastWeek.startsWith('-') ? 'text-accent-red' : 'text-text-primary'}`}>
            {ti.vsLastWeek}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg bg-bg-input">
          <p className="text-[10px] text-text-tertiary mb-1">环比上月</p>
          <p className={`font-data text-lg font-bold ${ti.vsLastMonth.startsWith('+') ? 'text-accent-green' : 'text-accent-red'}`}>
            {ti.vsLastMonth}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg bg-bg-input">
          <p className="text-[10px] text-text-tertiary mb-1">同比去年</p>
          <p className={`font-data text-lg font-bold ${ti.vsLastYear.startsWith('+') ? 'text-accent-green' : 'text-accent-red'}`}>
            {ti.vsLastYear}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-input">
        <Lightbulb size={14} className="text-accent-blue mt-0.5 shrink-0" />
        <p className="text-xs text-text-secondary leading-relaxed">
          <span className="text-text-primary font-medium">趋势预测：</span>{ti.forecast}
        </p>
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  YearOverYearCard                                                   */
/* ------------------------------------------------------------------ */
const YearOverYearCard: React.FC<{ yoyDiffs: any[] }> = ({ yoyDiffs }) => {
  return (
    <motion.div className="bg-bg-card border border-border-default rounded-xl p-5" {...fadeSlideUp(0.3)}>
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={16} className="text-heat-4" />
        <h3 className="text-sm font-semibold text-text-primary">与以往的不同</h3>
      </div>

      <div className="space-y-3">
        {yoyDiffs.map((diff, i) => (
          <div key={i} className="p-3 rounded-lg bg-bg-input">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-text-primary">{diff.aspect}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-green/10 text-accent-green font-medium">
                {diff.change}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-text-muted mb-0.5">今年</p>
                <p className="text-xs text-text-primary leading-relaxed">{diff.thisYear}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted mb-0.5">去年</p>
                <p className="text-xs text-text-tertiary leading-relaxed">{diff.lastYear}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  ActionSuggestionsCard                                             */
/* ------------------------------------------------------------------ */
const ActionSuggestionsCard: React.FC<{ suggestions: string[] }> = ({ suggestions }) => {
  return (
    <motion.div className="bg-bg-card border border-border-default rounded-xl p-5" {...fadeSlideUp(0.35)}>
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart size={16} className="text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-primary">运营行动建议</h3>
      </div>
      <div className="space-y-2.5">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-xs text-text-secondary leading-relaxed">{s}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  RelatedProductsCard                                               */
/* ------------------------------------------------------------------ */
const RelatedProductsCard: React.FC<{ products: any[] }> = ({ products }) => {
  const navigate = useNavigate();

  if (products.length === 0) return null;

  return (
    <motion.div className="bg-bg-card border border-border-default rounded-xl p-5" {...fadeSlideUp(0.4)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">相关选品</h3>
        <button
          onClick={() => navigate('/products')}
          className="text-xs text-accent-blue flex items-center gap-0.5 hover:underline"
        >
          查看全部 <ChevronRight size={12} />
        </button>
      </div>
      <div className="space-y-2.5">
        {products.map((p, idx) => (
          <div
            key={p.productId || p.id || idx}
            className="flex items-center gap-3 p-3 rounded-lg bg-bg-input hover:bg-bg-elevated transition-colors cursor-pointer group"
            onClick={() => navigate('/products')}
          >
            <div className="w-10 h-10 rounded-lg bg-bg-card flex items-center justify-center shrink-0">
              <ShoppingCart size={16} className="text-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary truncate group-hover:text-accent-blue transition-colors">{p.name}</p>
              <p className="text-[10px] text-text-tertiary">{p.reason || p.sourceHotspot || ''}</p>
            </div>
            <div className="text-right shrink-0">
              <div style={{ width: 50 }}>
                <HeatProgressBar value={p.heatScore || 0} height={3} />
              </div>
              <span className="text-[10px] text-text-tertiary mt-0.5 block">热度{p.heatScore || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */
const HotspotDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // tRPC API calls
  const { data: apiHotspot, isLoading: hotspotLoading } = useHotspotDetail(id || '');
  const { data: relatedProducts } = useProductsByHotspot(id || '');
  const { data: trendData } = useHotspotTrend(id || '');

  // Copy state for scripts
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (text: string, copyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(copyId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Loading state
  if (hotspotLoading) {
    return (
      <div>
        <TopBar title="热点详情" />
        <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-5">
          <div className="h-8 bg-bg-card animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="h-32 bg-bg-card animate-pulse rounded-xl" />
            <div className="h-32 bg-bg-card animate-pulse rounded-xl" />
          </div>
          <div className="h-64 bg-bg-card animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!apiHotspot) {
    return (
      <div>
        <TopBar title="热点详情" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <img src="/empty-state.svg" alt="" className="w-24 h-24 mx-auto mb-4 opacity-60" />
            <h2 className="text-lg font-semibold text-text-secondary">热点未找到</h2>
            <p className="text-sm text-text-tertiary mt-1">ID: {id}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-accent-blue text-white text-sm rounded-lg hover:bg-accent-blue/90 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Extract data from API response
  const hotspot = apiHotspot;
  const dimConfig = DIMENSION_CONFIG[hotspot.dimension];
  const apiProducts = (relatedProducts || []) as any[];

  // Build trend data
  const trend = trendData?.trend || hotspot.trend || [];

  // Calculate confidence score based on discussions
  const discussions = (hotspot.discussions || []) as PlatformDiscussion[];
  const totalReadCount = discussions.reduce((sum, d) => sum + (d.readCount || 0), 0);
  const confidenceScore = Math.min(95, Math.max(60, 50 + Math.floor(totalReadCount / 10000000)));

  // Build year-over-year diffs
  const yoyDiffs = [
    { aspect: '核心品类', thisYear: '消费升级趋势明显', lastYear: '传统品类为主', change: '品类升级' },
    { aspect: '消费预算', thisYear: `单户预算${(hotspot.heatScore * 20).toFixed(0)}元`, lastYear: '预算较低', change: '预算提升' },
    { aspect: '决策路径', thisYear: '短视频种草→直播间下单', lastYear: '线下门店体验', change: '内容电商渗透率提升' },
  ];

  // Build related topics
  const relatedTopics = discussions.flatMap(d => d.topKeywords || []).slice(0, 6).map(kw => `#${kw}#`);

  // Build action suggestions
  const actionSuggestions = [
    `主推${apiProducts.slice(0, 2).map((p: any) => p.name).join('、') || '热门商品'}作为核心爆品`,
    '制作热点对比短视频引流',
    '联合垂类博主做专场直播',
    `设置满减优惠券，覆盖${hotspot.title}场景`,
  ];

  return (
    <div className="min-h-screen">
      {/* TopBar */}
      <TopBar
        title={hotspot.title}
        subtitle={`${dimConfig.label} · 热度${hotspot.heatScore} · ${apiProducts.length}款选品`}
      />

      <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-5">

        {/* ====== Section 1: Header Info ====== */}
        <motion.div className="flex flex-wrap items-center gap-3" {...fadeSlideUp(0)}>
          <DimensionTag dimension={hotspot.dimension} />
          <HeatBadge level={hotspot.heatLevel} />
          <span className="text-xs text-text-tertiary">
            {hotspot.dateRange[0]} 至 {hotspot.dateRange[1]}
          </span>
          {hotspot.metricValue && (
            <span className={`text-xs font-medium ${hotspot.metricDirection === 'up' ? 'text-accent-green' : 'text-accent-red'}`}>
              {hotspot.metricLabel} {hotspot.metricValue}
            </span>
          )}
        </motion.div>

        {/* Description */}
        <motion.p className="text-sm text-text-secondary leading-relaxed" {...fadeSlideUp(0.05)}>
          {hotspot.description}
        </motion.p>

        {/* ====== Section 2: Confidence + Heat Score ====== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ConfidenceGauge score={confidenceScore} />
          <HeatScoreCard score={hotspot.heatScore} level={hotspot.heatLevel} trend={trend} />
        </div>

      {/* ====== Section 3: Platform Discussions ====== */}
        <motion.div {...fadeSlideUp(0.2)}>
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <MessageCircle size={20} className="text-accent-blue" />
            全网讨论监测 {discussions.length > 0 && `(${discussions.length}个平台)`}
          </h2>
          {discussions.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              暂无平台讨论数据，数据采集中...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {discussions.map((p, i) => (
                <PlatformCard key={p.platform} platform={p} index={i} />
              ))}
            </div>
          )}
        </motion.div>

        {/* ====== Section 4: Trend + YoY ====== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TrendIndicatorCard trendData={trendData} />
          <YearOverYearCard yoyDiffs={yoyDiffs} />
        </div>

        {/* ====== Section 5: Related Topics ====== */}
        <motion.div className="bg-bg-card border border-border-default rounded-xl p-5" {...fadeSlideUp(0.32)}>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Hash size={14} className="text-accent-purple" /> 关联话题
          </h3>
          <div className="flex flex-wrap gap-2">
            {relatedTopics.map((t, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 rounded-full border border-border-default text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors cursor-pointer"
              >
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ====== Section 6: Action Suggestions + Related Products ====== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ActionSuggestionsCard suggestions={actionSuggestions} />
          <RelatedProductsCard products={apiProducts} />
        </div>

        {/* ====== Section 7: Script Template ====== */}
        <motion.div className="bg-bg-card border border-border-default rounded-xl p-5" {...fadeSlideUp(0.45)}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Copy size={14} className="text-accent-teal" /> 推荐话术
            </h3>
            <button
              onClick={() => handleCopy(hotspot.scriptTemplate, 'script-template')}
              className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors"
            >
              {copiedId === 'script-template' ? <Check size={12} /> : <Copy size={12} />}
              {copiedId === 'script-template' ? '已复制' : '复制'}
            </button>
          </div>
          <div className="p-4 rounded-lg bg-bg-input">
            <p className="text-sm text-text-secondary leading-relaxed">{hotspot.scriptTemplate}</p>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            提示：将「{'{name}'}」替换为具体商品名称即可使用
          </p>
        </motion.div>

        {/* Back to top spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
};

export default HotspotDetailPage;
