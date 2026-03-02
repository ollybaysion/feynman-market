import { useQuery } from '@tanstack/react-query';
import { getMarketIndices } from '../api/market.api';
import { REFETCH_INTERVALS } from '../utils/constants';

export function useMarketOverview() {
  return useQuery({
    queryKey: ['marketIndices'],
    queryFn: getMarketIndices,
    refetchInterval: REFETCH_INTERVALS.indices,
    staleTime: 10_000,
  });
}
