import { useStockNews } from '../../hooks/useStockNews';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ExternalLink, Newspaper } from 'lucide-react';
import { formatDate } from '../../utils/format';

interface StockNewsListProps {
  ticker: string;
  stockName: string;
  market: string;
}

export function StockNewsList({ ticker, stockName, market }: StockNewsListProps) {
  const marketCode = market === 'KOSPI' || market === 'KOSDAQ' ? 'KR' : 'US';
  const { data: articles, isLoading } = useStockNews(ticker, 30, marketCode, stockName);

  if (isLoading) return <LoadingSpinner text="뉴스 로딩 중..." />;

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
        <Newspaper size={14} />
        최근 30일 뉴스
        {articles && (
          <span className="text-xs font-normal text-gray-400">{articles.length}개</span>
        )}
      </h3>

      {!articles || articles.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">뉴스가 없습니다.</p>
      ) : (
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {articles.map((article, i) => (
            <a
              key={`${article.url}-${i}`}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                {formatDate(article.publishedAt)}
              </span>
              <span className="text-sm text-gray-700 flex-1 line-clamp-2 group-hover:text-primary-600">
                {article.title}
              </span>
              <ExternalLink size={12} className="text-gray-300 shrink-0 mt-1" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
