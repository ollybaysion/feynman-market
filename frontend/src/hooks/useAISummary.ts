import { useQuery } from '@tanstack/react-query';
import { getAISummary } from '../api/ai.api';

export function useAISummary(ticker: string, market?: string, name?: string, enabled = false) {
  return useQuery({
    queryKey: ['aiSummary', ticker, market],
    queryFn: () => getAISummary(ticker, market, name),
    enabled: enabled && !!ticker,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });
}
