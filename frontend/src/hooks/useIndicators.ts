import { useQuery } from '@tanstack/react-query';
import { getIndicatorQuotes, getIndicatorChart } from '../api/indicators.api';

export function useIndicatorQuotes() {
  return useQuery({
    queryKey: ['indicatorQuotes'],
    queryFn: getIndicatorQuotes,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

export function useIndicatorChart(symbol: string, days = 90) {
  return useQuery({
    queryKey: ['indicatorChart', symbol, days],
    queryFn: () => getIndicatorChart(symbol, days),
    enabled: !!symbol,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  });
}
