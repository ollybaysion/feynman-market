import { useMarketOverview } from '../../hooks/useMarketOverview';
import { MarketIndexCard } from './MarketIndexCard';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function MarketOverview() {
  const { data: indices, isLoading, error } = useMarketOverview();

  if (isLoading) return <LoadingSpinner text="시장 지수 로딩 중..." />;

  if (error || !indices) {
    return (
      <div className="card text-center py-4">
        <p className="text-sm text-gray-500">시장 지수를 불러올 수 없습니다.</p>
        <p className="text-xs text-gray-400 mt-1">API 키를 확인해주세요.</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 mb-3">시장 개요</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {indices.map(idx => (
          <MarketIndexCard key={idx.symbol} index={idx} />
        ))}
      </div>
    </section>
  );
}
