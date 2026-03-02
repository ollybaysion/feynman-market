import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSearch } from '../hooks/useSearch';
import { useAppStore } from '../store/app.store';
import { MarketBadge } from '../components/common/MarketBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Search } from 'lucide-react';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const { marketFilter } = useAppStore();
  const market = marketFilter === 'ALL' ? undefined : marketFilter;

  const { data: results, isLoading } = useSearch(query, market);

  function handleSelect(ticker: string) {
    navigate(`/stock/${ticker}`);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Search size={18} />
        "{query}" 검색 결과
      </h1>

      {isLoading ? (
        <LoadingSpinner text="검색 중..." />
      ) : !results || results.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">검색 결과가 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">다른 키워드로 검색해보세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map(stock => (
            <button
              key={stock.ticker}
              onClick={() => handleSelect(stock.ticker)}
              className="card w-full flex items-center gap-3 text-left hover:shadow-md transition-shadow"
            >
              <span className="font-bold text-gray-900 text-sm w-24">{stock.ticker}</span>
              <span className="text-sm text-gray-600 flex-1">{stock.name}</span>
              <MarketBadge market={stock.market} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
