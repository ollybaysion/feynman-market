import { useQuery } from '@tanstack/react-query';
import { getStockQuote } from '../api/stocks.api';
import { REFETCH_INTERVALS } from '../utils/constants';

export function useStockQuote(ticker: string, market?: string) {
  return useQuery({
    queryKey: ['stockQuote', ticker, market],
    queryFn: () => getStockQuote(ticker, market),
    enabled: !!ticker,
    refetchInterval: REFETCH_INTERVALS.quote,
    staleTime: 10_000,
  });
}
