import { apiClient } from './client';
import type { MarketReport, MarketReportListItem } from '../types/news';

export async function getReports(page = 1, limit = 20) {
  const { data } = await apiClient.get<{
    success: boolean;
    data: { reports: MarketReportListItem[]; total: number; page: number; limit: number };
  }>('/reports', { params: { page, limit } });
  return data.data;
}

export async function getReport(id: number) {
  const { data } = await apiClient.get<{ success: boolean; data: MarketReport }>(`/reports/${id}`);
  return data.data;
}

export async function generateReport() {
  const { data } = await apiClient.post<{ success: boolean; data: MarketReport }>('/reports/generate');
  return data.data;
}

export async function getSentimentTrend(days = 30) {
  const { data } = await apiClient.get<{
    success: boolean;
    data: { date: string; krScore: number; usScore: number }[];
  }>('/reports/trend/sentiment', { params: { days } });
  return data.data;
}
