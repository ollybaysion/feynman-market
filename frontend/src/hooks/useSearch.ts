import { useQuery } from '@tanstack/react-query';
import { searchStocks } from '../api/stocks.api';

export function useSearch(query: string, market?: string) {
  return useQuery({
    queryKey: ['search', query, market],
    queryFn: () => searchStocks(query, market),
    enabled: query.length >= 1,
    staleTime: 30_000,
  });
}
