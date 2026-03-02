import { apiClient } from './client';
import type { StockQuote, OHLCV, Stock } from '../types/stock';

export async function searchStocks(query: string, market?: string): Promise<Stock[]> {
  const params: Record<string, string> = { q: query };
  if (market) params.market = market;
  const res = await apiClient.get('/stocks/search', { params });
  return res.data.data;
}

export async function getStockQuote(ticker: string, market?: string): Promise<StockQuote> {
  const params: Record<string, string> = {};
  if (market) params.market = market;
  const res = await apiClient.get(`/stocks/${ticker}/quote`, { params });
  return res.data.data;
}

export async function getStockChart(ticker: string, days = 30, market?: string): Promise<OHLCV[]> {
  const params: Record<string, string | number> = { days };
  if (market) params.market = market;
  const res = await apiClient.get(`/stocks/${ticker}/chart`, { params });
  return res.data.data;
}
