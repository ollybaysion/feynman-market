import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { getMarketBrief } from '../api/ai.api';

export function useMarketBrief() {
  const queryClient = useQueryClient();
  const refreshRef = useRef(false);

  const query = useQuery({
    queryKey: ['marketBrief'],
    queryFn: () => {
      const refresh = refreshRef.current;
      refreshRef.current = false;
      return getMarketBrief(refresh);
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });

  const refresh = useCallback(() => {
    refreshRef.current = true;
    queryClient.invalidateQueries({ queryKey: ['marketBrief'] });
  }, [queryClient]);

  return { ...query, refresh };
}
