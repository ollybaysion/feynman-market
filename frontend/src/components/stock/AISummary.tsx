import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useAISummary } from '../../hooks/useAISummary';
import { SentimentBadge } from '../common/SentimentBadge';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface AISummaryProps {
  ticker: string;
  stockName: string;
  market: string;
}

export function AISummary({ ticker, stockName, market }: AISummaryProps) {
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading, error, refetch } = useAISummary(
    ticker,
    market === 'KOSPI' || market === 'KOSDAQ' ? 'KR' : 'US',
    stockName,
    enabled
  );

  if (!enabled) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Sparkles size={14} className="text-purple-500" />
            AI 분석
          </h3>
        </div>
        <button
          onClick={() => setEnabled(true)}
          className="w-full py-6 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors"
        >
          <Sparkles size={20} className="mx-auto mb-2" />
          AI 분석 요약 생성하기
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-2">
          Claude AI가 최근 뉴스를 분석하여 요약합니다
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
          <Sparkles size={14} className="text-purple-500" />
          AI 분석
        </h3>
        <LoadingSpinner text="AI가 뉴스를 분석하고 있습니다..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
          <Sparkles size={14} className="text-purple-500" />
          AI 분석
        </h3>
        <p className="text-sm text-gray-500 text-center py-4">
          {error?.message || 'AI 분석을 불러올 수 없습니다.'}
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Sparkles size={14} className="text-purple-500" />
          AI 분석
        </h3>
        <button
          onClick={() => refetch()}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="다시 분석"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <SentimentBadge sentiment={data.sentiment} score={data.sentimentScore} />

      <div className="mt-3 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
        {data.summaryText}
      </div>

      <p className="text-[10px] text-gray-400 mt-3">
        분석일: {data.summaryDate} | 본 분석은 투자 권유가 아닙니다.
      </p>
    </div>
  );
}
