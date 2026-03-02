import { useQuery } from '@tanstack/react-query';
import { getMarketBrief } from '../api/ai.api';

export function useMarketBrief(enabled = false) {
  return useQuery({
    queryKey: ['marketBrief'],
    queryFn: getMarketBrief,
    enabled,
    staleTime: 3 * 60 * 60 * 1000, // 3 hours
    retry: 1,
  });
}
