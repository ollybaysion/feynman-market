import { apiClient } from './client';
import type { NewsArticle } from '../types/news';

export async function getLatestNews(market = 'KR', limit = 20): Promise<NewsArticle[]> {
  const res = await apiClient.get('/news/latest', { params: { market, limit } });
  return res.data.data;
}

export async function getStockNews(ticker: string, days = 30, market?: string, name?: string): Promise<NewsArticle[]> {
  const params: Record<string, string | number> = { days };
  if (market) params.market = market;
  if (name) params.name = name;
  const res = await apiClient.get(`/news/stock/${ticker}`, { params });
  return res.data.data;
}
