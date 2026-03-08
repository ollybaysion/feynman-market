import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Plus, X, Tag, Archive, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useIssueTrackers, useCreateIssueTracker, useUpdateIssueStatus } from '../hooks/useIssueTrackers';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import type { IssueTracker } from '../types/news';

function TrackerCard({ tracker, onArchive, onActivate }: {
  tracker: IssueTracker;
  onArchive: (id: number) => void;
  onActivate: (id: number) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => navigate(`/issues/${tracker.id}`)}
          className="flex-1 text-left min-w-0"
        >
          <div className="flex items-center gap-2 mb-1">
            <Crosshair size={14} className="text-primary-600 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">{tracker.title}</h3>
          </div>
          {tracker.description && (
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{tracker.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tracker.keywords.map((kw, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full">
                <Tag size={8} />
                {kw}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span>{tracker.entryCount}회 추적</span>
            {tracker.latestEntry && (
              <span>최근: {formatDistanceToNow(new Date(tracker.latestEntry), { addSuffix: true, locale: ko })}</span>
            )}
          </div>
        </button>
        <div className="shrink-0">
          {tracker.status === 'active' ? (
            <button
              onClick={() => onArchive(tracker.id)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              title="보관"
            >
              <Archive size={14} />
            </button>
          ) : (
            <button
              onClick={() => onActivate(tracker.id)}
              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
              title="활성화"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTrackerForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const createMutation = useCreateIssueTracker();

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setKeywordInput('');
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || keywords.length === 0) return;
    createMutation.mutate(
      { title: title.trim(), keywords, description: description.trim() },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="card p-4 space-y-3 border-2 border-primary-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">새 이슈 트래커</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <input
        type="text"
        placeholder="이슈 제목 (예: 미국 사모 신용 펀드 환매 요청 증가)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      <div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="검색 키워드 추가"
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button onClick={addKeyword} className="btn-primary text-sm px-3">추가</button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {keywords.map((kw, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                {kw}
                <button onClick={() => setKeywords(keywords.filter((_, j) => j !== i))}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <textarea
        placeholder="설명 (선택)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
      />

      <button
        onClick={handleSubmit}
        disabled={!title.trim() || keywords.length === 0 || createMutation.isPending}
        className="btn-primary text-sm w-full disabled:opacity-50"
      >
        {createMutation.isPending ? '생성 중...' : '트래커 생성'}
      </button>
    </div>
  );
}

export function IssueTrackersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { data: trackers, isLoading, error, refetch } = useIssueTrackers(showArchived ? 'archived' : 'active');
  const statusMutation = useUpdateIssueStatus();

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair size={20} className="text-primary-600" />
          <h1 className="text-lg font-bold text-gray-900">이슈 트래커</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              showArchived ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {showArchived ? '활성 보기' : '보관함'}
          </button>
          {!showArchived && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Plus size={14} />
              새 트래커
            </button>
          )}
        </div>
      </div>

      {showCreate && <CreateTrackerForm onClose={() => setShowCreate(false)} />}

      {isLoading ? (
        <LoadingSpinner text="트래커 목록 로딩 중..." />
      ) : error ? (
        <ErrorMessage message="트래커 목록을 불러올 수 없습니다." onRetry={() => refetch()} />
      ) : !trackers || trackers.length === 0 ? (
        <div className="card text-center py-12">
          <Crosshair size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            {showArchived ? '보관된 트래커가 없습니다.' : '아직 추적 중인 이슈가 없습니다.'}
          </p>
          {!showArchived && (
            <p className="text-xs text-gray-400 mt-1">"새 트래커" 버튼을 눌러 추적할 이슈를 등록하세요.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {trackers.map(tracker => (
            <TrackerCard
              key={tracker.id}
              tracker={tracker}
              onArchive={id => statusMutation.mutate({ id, status: 'archived' })}
              onActivate={id => statusMutation.mutate({ id, status: 'active' })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
