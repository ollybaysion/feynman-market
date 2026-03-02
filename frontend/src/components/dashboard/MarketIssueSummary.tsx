import { useState } from 'react';
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { useMarketBrief } from '../../hooks/useMarketBrief';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { MarketRegionBrief } from '../../types/news';

const SENTIMENT_CONFIG = {
  bullish: {
    label: '강세',
    icon: TrendingUp,
    bgClass: 'bg-green-50 border-green-200',
    headerClass: 'bg-green-100',
    iconClass: 'text-green-600',
    badgeClass: 'bg-green-100 text-green-800',
    barClass: 'bg-green-500',
  },
  bearish: {
    label: '약세',
    icon: TrendingDown,
    bgClass: 'bg-red-50 border-red-200',
    headerClass: 'bg-red-100',
    iconClass: 'text-red-600',
    badgeClass: 'bg-red-100 text-red-800',
    barClass: 'bg-red-500',
  },
  neutral: {
    label: '중립',
    icon: Minus,
    bgClass: 'bg-gray-50 border-gray-200',
    headerClass: 'bg-gray-100',
    iconClass: 'text-gray-500',
    badgeClass: 'bg-gray-100 text-gray-700',
    barClass: 'bg-gray-400',
  },
};

function RegionBriefCard({
  brief,
  flag,
  label,
}: {
  brief: MarketRegionBrief;
  flag: string;
  label: string;
}) {
  const cfg = SENTIMENT_CONFIG[brief.sentiment];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border ${cfg.bgClass} overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 ${cfg.headerClass} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{flag}</span>
          <span className="text-sm font-semibold text-gray-800">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
            <Icon size={11} className="inline mr-1" />
            {cfg.label}
          </span>
          <span className="text-xs text-gray-500 font-medium">{brief.sentimentScore}%</span>
        </div>
      </div>

      {/* Sentiment bar */}
      <div className="px-4 pt-2 pb-1">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${cfg.barClass}`}
            style={{ width: `${brief.sentimentScore}%` }}
          />
        </div>
      </div>

      {/* Summary */}
      {brief.summary && (
        <p className="px-4 pt-2 pb-1 text-xs text-gray-600 leading-relaxed italic">
          {brief.summary}
        </p>
      )}

      {/* Key issues */}
      <ul className="px-4 pb-3 pt-1 space-y-1.5">
        {brief.keyIssues.map((issue, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <ChevronRight size={14} className={`mt-0.5 shrink-0 ${cfg.iconClass}`} />
            <span>{issue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketIssueSummary() {
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useMarketBrief(enabled);

  const generatedTimeAgo = data?.generatedAt
    ? (() => {
        const diff = Math.floor((Date.now() - new Date(data.generatedAt).getTime()) / 60000);
        if (diff < 1) return '방금 전';
        if (diff < 60) return `${diff}분 전`;
        return `${Math.floor(diff / 60)}시간 전`;
      })()
    : null;

  return (
    <section className="card">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Sparkles size={14} className="text-purple-500" />
          오늘의 시장 주요 이슈
          {generatedTimeAgo && (
            <span className="text-xs font-normal text-gray-400 ml-1">· {generatedTimeAgo} 업데이트</span>
          )}
        </h2>
        {enabled && (
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-gray-400 hover:text-purple-600 p-1 disabled:opacity-40 transition-colors"
            title="다시 분석"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* States */}
      {!enabled && (
        <div className="text-center py-6">
          <Sparkles size={32} className="mx-auto mb-3 text-purple-300" />
          <p className="text-sm text-gray-500 mb-1">AI가 한국·미국 시장 주요 이슈를 분석합니다</p>
          <p className="text-xs text-gray-400 mb-4">뉴스를 수집하여 핵심 이슈와 시장 심리를 요약합니다</p>
          <button
            onClick={() => setEnabled(true)}
            className="px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Sparkles size={14} className="inline mr-1.5" />
            AI 분석 시작
          </button>
        </div>
      )}

      {enabled && isLoading && (
        <LoadingSpinner text="AI가 시장 뉴스를 분석하고 있습니다..." />
      )}

      {enabled && error && !isLoading && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-3">
            {(error as Error).message || '시장 브리핑을 불러올 수 없습니다.'}
          </p>
          <button
            onClick={() => refetch()}
            className="text-xs text-purple-600 hover:underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {data && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <RegionBriefCard brief={data.kr} flag="🇰🇷" label="한국 시장" />
          <RegionBriefCard brief={data.us} flag="🇺🇸" label="미국 시장" />
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-3 text-right">
        본 분석은 투자 권유가 아닌 정보 제공 목적입니다
      </p>
    </section>
  );
}
