import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useReports, useGenerateReport } from '../hooks/useReports';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import type { MarketReportListItem } from '../types/news';

const SENTIMENT_CONFIG = {
  bullish: { label: '긍정적', bgClass: 'bg-green-100 text-green-800', icon: TrendingUp },
  bearish: { label: '부정적', bgClass: 'bg-red-100 text-red-800', icon: TrendingDown },
  neutral: { label: '중립', bgClass: 'bg-gray-100 text-gray-800', icon: Minus },
} as const;

function SentimentTag({ sentiment, score, market }: { sentiment: 'bullish' | 'bearish' | 'neutral'; score: number; market: string }) {
  const config = SENTIMENT_CONFIG[sentiment];
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase">{market}</span>
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${config.bgClass}`}>
        <Icon size={10} />
        {config.label}
      </span>
      <span className="text-xs text-gray-500">{score}%</span>
    </div>
  );
}

function ReportCard({ report }: { report: MarketReportListItem }) {
  const navigate = useNavigate();
  const dateObj = new Date(report.date);
  const formattedDate = format(dateObj, 'M월 d일 (EEE)', { locale: ko });

  return (
    <button
      onClick={() => navigate(`/reports/${report.id}`)}
      className="w-full text-left card hover:shadow-md transition-shadow p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-1">{formattedDate}</p>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{report.title}</h3>
          <div className="flex flex-wrap gap-3 mt-2">
            <SentimentTag sentiment={report.krSentiment} score={report.krSentimentScore} market="KR" />
            <SentimentTag sentiment={report.usSentiment} score={report.usSentimentScore} market="US" />
          </div>
        </div>
        <FileText size={20} className="text-gray-300 shrink-0 mt-1" />
      </div>
    </button>
  );
}

export function ReportsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useReports(page);
  const generateMutation = useGenerateReport();

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-primary-600" />
          <h1 className="text-lg font-bold text-gray-900">시장 리포트</h1>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="btn-primary text-sm flex items-center gap-1.5"
        >
          <Plus size={14} />
          {generateMutation.isPending ? '생성 중...' : '리포트 생성'}
        </button>
      </div>

      {generateMutation.isError && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
          리포트 생성에 실패했습니다. 다시 시도해주세요.
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner text="리포트 목록 로딩 중..." />
      ) : error ? (
        <ErrorMessage message="리포트 목록을 불러올 수 없습니다." onRetry={() => refetch()} />
      ) : !data || data.reports.length === 0 ? (
        <div className="card text-center py-12">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">아직 생성된 리포트가 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">위의 "리포트 생성" 버튼을 눌러 첫 리포트를 만들어보세요.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {data.reports.map(report => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
