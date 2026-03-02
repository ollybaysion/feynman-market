import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatPercent, formatChange } from '../../utils/format';

interface PriceChangeProps {
  change: number;
  changePercent: number;
  market: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceChange({ change, changePercent, market, showIcon = true, size = 'md' }: PriceChangeProps) {
  const isKR = market === 'KOSPI' || market === 'KOSDAQ' || market === 'KR';

  // Korean: up=red, down=blue / US: up=green, down=red
  let colorClass: string;
  if (change > 0) {
    colorClass = isKR ? 'text-red-500' : 'text-green-500';
  } else if (change < 0) {
    colorClass = isKR ? 'text-blue-500' : 'text-red-500';
  } else {
    colorClass = 'text-gray-500';
  }

  const sizeClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base font-semibold',
  }[size];

  const iconSize = size === 'lg' ? 18 : size === 'md' ? 14 : 12;

  return (
    <span className={`inline-flex items-center gap-1 ${colorClass} ${sizeClass}`}>
      {showIcon && (
        change > 0 ? <TrendingUp size={iconSize} /> :
        change < 0 ? <TrendingDown size={iconSize} /> :
        <Minus size={iconSize} />
      )}
      <span>{formatChange(change, market)}</span>
      <span>({formatPercent(changePercent)})</span>
    </span>
  );
}
