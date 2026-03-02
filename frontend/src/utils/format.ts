import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatKRW(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPrice(value: number, market: string): string {
  const isKR = market === 'KOSPI' || market === 'KOSDAQ' || market === 'KR';
  return isKR ? formatKRW(value) : formatUSD(value);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatChange(value: number, market: string): string {
  const sign = value > 0 ? '+' : '';
  const isKR = market === 'KOSPI' || market === 'KOSDAQ' || market === 'KR';
  if (isKR) {
    return `${sign}${new Intl.NumberFormat('ko-KR').format(value)}`;
  }
  return `${sign}${value.toFixed(2)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'M월 d일', { locale: ko });
}

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'M월 d일 HH:mm', { locale: ko });
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ko });
}
