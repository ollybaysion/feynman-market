import { MARKET_LABELS } from '../../utils/constants';

const BADGE_COLORS: Record<string, string> = {
  KOSPI: 'bg-blue-100 text-blue-700',
  KOSDAQ: 'bg-purple-100 text-purple-700',
  NYSE: 'bg-amber-100 text-amber-700',
  NASDAQ: 'bg-emerald-100 text-emerald-700',
};

export function MarketBadge({ market }: { market: string }) {
  const colorClass = BADGE_COLORS[market] || 'bg-gray-100 text-gray-700';
  const label = MARKET_LABELS[market] || market;

  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colorClass}`}>
      {label}
    </span>
  );
}
