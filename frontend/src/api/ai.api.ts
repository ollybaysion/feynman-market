import { apiClient } from './client';
import type { AISummary, MarketBrief } from '../types/news';

export async function getAISummary(ticker: string, market?: string, name?: string): Promise<AISummary> {
  const params: Record<string, string> = {};
  if (market) params.market = market;
  if (name) params.name = name;
  const res = await apiClient.get(`/ai/summary/${ticker}`, { params });
  return res.data.data;
}

export async function getMarketBrief(refresh = false): Promise<MarketBrief> {
  const params: Record<string, string> = {};
  if (refresh) params.refresh = 'true';
  const res = await apiClient.get('/ai/market-brief', { params });
  return res.data.data;
}
