import { Star } from 'lucide-react';
import type { StockQuote } from '../../types/stock';
import { PriceChange } from '../common/PriceChange';
import { MarketBadge } from '../common/MarketBadge';
import { formatPrice } from '../../utils/format';
import { useAppStore } from '../../store/app.store';

export function StockHeader({ quote }: { quote: StockQuote }) {
  const { favorites, toggleFavorite } = useAppStore();
  const isFavorite = favorites.includes(quote.ticker);

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-gray-900">{quote.name}</h1>
          <span className="text-sm text-gray-400">({quote.ticker})</span>
          <MarketBadge market={quote.market} />
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-gray-900">
            {formatPrice(quote.price, quote.market)}
          </span>
          <PriceChange
            change={quote.change}
            changePercent={quote.changePercent}
            market={quote.market}
            size="lg"
          />
        </div>
      </div>
      <button
        onClick={() => toggleFavorite(quote.ticker)}
        className={`p-2 rounded-lg transition-colors ${
          isFavorite
            ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
            : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
