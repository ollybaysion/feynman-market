import type { MarketIndex } from '../../types/stock';
import { PriceChange } from '../common/PriceChange';
import { formatNumber } from '../../utils/format';

export function MarketIndexCard({ index }: { index: MarketIndex }) {
  const isKR = index.symbol === 'KOSPI' || index.symbol === 'KOSDAQ';
  const market = isKR ? 'KR' : 'US';

  return (
    <div className="card flex flex-col gap-1 min-w-[140px]">
      <p className="text-xs text-gray-500 font-medium">{index.name}</p>
      <p className="text-lg font-bold text-gray-900">
        {formatNumber(Math.round(index.value * 100) / 100)}
      </p>
      <PriceChange
        change={index.change}
        changePercent={index.changePercent}
        market={market}
        size="sm"
      />
    </div>
  );
}
