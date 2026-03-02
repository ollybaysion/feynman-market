import { apiClient } from './client';
import type { MarketIndex } from '../types/stock';

export async function getMarketIndices(): Promise<MarketIndex[]> {
  const res = await apiClient.get('/market/indices');
  return res.data.data;
}
