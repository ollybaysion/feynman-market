import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Crosshair, RefreshCw, Tag, ExternalLink, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useIssueTracker, useTrackIssue, useDeleteIssueTracker } from '../hooks/useIssueTrackers';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { SentimentBadge } from '../components/common/SentimentBadge';
import type { IssueEntry } from '../types/news';

const SENTIMENT_COLOR = {
  bullish: 'border-green-400 bg-green-50',
  bearish: 'border-red-400 bg-red-50',
  neutral: 'border-gray-300 bg-gray-50',
} as const;

const SENTIMENT_DOT = {
  bullish: 'bg-green-500',
  bearish: 'bg-red-500',
  neutral: 'bg-gray-400',
} as const;

function EntryCard({ entry }: { entry: IssueEntry }) {
  const dateObj = new Date(entry.date);
  const formattedDate = format(dateObj, 'M월 d일 (EEE)', { locale: ko });

  return (
    <div className="relative pl-6">
      {/* Timeline dot */}
      <div className={`absolute left-0 top-2 w-3 h-3 rounded-full border-2 border-white ${SENTIMENT_DOT[entry.sentiment]}`} />

      <div className={`card p-4 border-l-4 ${SENTIMENT_COLOR[entry.sentiment]}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">{formattedDate}</span>
          <SentimentBadge sentiment={entry.sentiment} score={entry.sentimentScore} />
        </div>

        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{entry.summary}</p>

        {entry.articles.length > 0 && (
          <details className="mt-3">
            <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">
              참고 기사 ({entry.articles.length}건)
            </summary>
            <ul className="mt-1.5 space-y-1">
              {entry.articles.map((a, i) => (
                <li key={i}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:underline flex items-start gap-1"
                  >
                    <ExternalLink size={10} className="mt-0.5 shrink-0" />
                    <span className="flex-1 line-clamp-1">{a.title}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{a.source}</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

export function IssueTrackerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const trackerId = Number(id) || 0;
  const { data: tracker, isLoading, error, refetch } = useIssueTracker(trackerId);
  const trackMutation = useTrackIssue();
  const deleteMutation = useDeleteIssueTracker();

  if (!id || trackerId <= 0) return <ErrorMessage message="유효하지 않은 트래커 ID입니다." />;
  if (isLoading) return <LoadingSpinner text="트래커 로딩 중..." />;
  if (error || !tracker) return <ErrorMessage message="트래커를 불러올 수 없습니다." onRetry={() => refetch()} />;

  const handleDelete = () => {
    if (!confirm('이 트래커와 모든 분석 기록을 삭제하시겠습니까?')) return;
    deleteMutation.mutate(trackerId, {
      onSuccess: () => navigate('/issues'),
    });
  };

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/issues')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft size={14} />
          이슈 트래커 목록
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Crosshair size={22} className="text-primary-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900">{tracker.title}</h1>
              {tracker.description && (
                <p className="text-xs text-gray-500 mt-0.5">{tracker.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tracker.keywords.map((kw, i) => (
                  <span key={i} className="inline-flex items-center gap-0.5 text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full">
                    <Tag size={8} />
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => trackMutation.mutate(trackerId)}
              disabled={trackMutation.isPending}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={trackMutation.isPending ? 'animate-spin' : ''} />
              {trackMutation.isPending ? '분석 중...' : '지금 추적'}
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              title="삭제"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {trackMutation.isError && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
          {(trackMutation.error as Error).message || '추적에 실패했습니다.'}
        </div>
      )}

      {/* Timeline */}
      {tracker.entries.length === 0 ? (
        <div className="card text-center py-12">
          <Crosshair size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">아직 추적 기록이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">"지금 추적" 버튼을 눌러 첫 분석을 시작하세요.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[5px] top-4 bottom-4 w-0.5 bg-gray-200" />

          <div className="space-y-3">
            {tracker.entries.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-right">
        총 {tracker.totalEntries}건의 분석 기록
      </p>
    </div>
  );
}
