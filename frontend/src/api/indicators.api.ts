import { apiClient } from './client';
import type { IndicatorQuote, IndicatorChart } from '../types/indicators';

export async function getIndicatorQuotes(): Promise<IndicatorQuote[]> {
  const res = await apiClient.get('/indicators');
  return res.data.data;
}

export async function getIndicatorChart(symbol: string, days = 90): Promise<IndicatorChart> {
  const res = await apiClient.get('/indicators/chart', { params: { symbol, days } });
  return res.data.data;
}
