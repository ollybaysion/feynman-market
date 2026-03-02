import { useQuery } from '@tanstack/react-query';
import { getStockNews } from '../api/news.api';
import { REFETCH_INTERVALS } from '../utils/constants';

export function useStockNews(ticker: string, days = 30, market?: string, name?: string) {
  return useQuery({
    queryKey: ['stockNews', ticker, days, market],
    queryFn: () => getStockNews(ticker, days, market, name),
    enabled: !!ticker,
    refetchInterval: REFETCH_INTERVALS.news,
    staleTime: 60_000,
  });
}
