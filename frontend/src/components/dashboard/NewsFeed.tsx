import { useQuery } from '@tanstack/react-query';
import { getLatestNews } from '../../api/news.api';
import { NewsCard } from './NewsCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { useAppStore } from '../../store/app.store';
import { REFETCH_INTERVALS } from '../../utils/constants';

export function NewsFeed() {
  const marketFilter = useAppStore(s => s.marketFilter);

  const krNews = useQuery({
    queryKey: ['latestNews', 'KR'],
    queryFn: () => getLatestNews('KR', 20),
    refetchInterval: REFETCH_INTERVALS.news,
    enabled: marketFilter === 'ALL' || marketFilter === 'KR',
  });

  const usNews = useQuery({
    queryKey: ['latestNews', 'US'],
    queryFn: () => getLatestNews('US', 20),
    refetchInterval: REFETCH_INTERVALS.news,
    enabled: marketFilter === 'ALL' || marketFilter === 'US',
  });

  const isLoading = krNews.isLoading || usNews.isLoading;
  const hasError = krNews.error && usNews.error;

  if (isLoading) return <LoadingSpinner text="뉴스 로딩 중..." />;
  if (hasError) return <ErrorMessage message="뉴스를 불러올 수 없습니다." onRetry={() => { krNews.refetch(); usNews.refetch(); }} />;

  const allNews = [
    ...(krNews.data || []),
    ...(usNews.data || []),
  ].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        실시간 뉴스
        <span className="text-xs font-normal text-gray-400 ml-2">
          {allNews.length}개 기사
        </span>
      </h2>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {allNews.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">표시할 뉴스가 없습니다.</p>
        ) : (
          allNews.map((article, i) => (
            <NewsCard key={`${article.url}-${i}`} article={article} />
          ))
        )}
      </div>
    </section>
  );
}
