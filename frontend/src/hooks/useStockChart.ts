import { useQuery } from '@tanstack/react-query';
import { getStockChart } from '../api/stocks.api';
import { REFETCH_INTERVALS } from '../utils/constants';

export function useStockChart(ticker: string, days = 30, market?: string) {
  return useQuery({
    queryKey: ['stockChart', ticker, days, market],
    queryFn: () => getStockChart(ticker, days, market),
    enabled: !!ticker,
    refetchInterval: REFETCH_INTERVALS.chart,
    staleTime: 30_000,
  });
}
