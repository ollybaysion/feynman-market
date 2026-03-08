import { apiClient } from './client';
import type { IssueTracker, IssueTrackerDetail, IssueEntry } from '../types/news';

export async function getIssueTrackers(status?: 'active' | 'archived') {
  const { data } = await apiClient.get<{
    success: boolean;
    data: IssueTracker[];
  }>('/issues', { params: status ? { status } : {} });
  return data.data;
}

export async function getIssueTracker(id: number, page = 1) {
  const { data } = await apiClient.get<{
    success: boolean;
    data: IssueTrackerDetail;
  }>(`/issues/${id}`, { params: { page } });
  return data.data;
}

export async function createIssueTracker(title: string, keywords: string[], description = '') {
  const { data } = await apiClient.post<{
    success: boolean;
    data: IssueTracker;
  }>('/issues', { title, keywords, description });
  return data.data;
}

export async function trackIssue(id: number) {
  const { data } = await apiClient.post<{
    success: boolean;
    data: IssueEntry;
  }>(`/issues/${id}/track`);
  return data.data;
}

export async function updateIssueStatus(id: number, status: 'active' | 'archived') {
  await apiClient.patch(`/issues/${id}/status`, { status });
}

export async function deleteIssueTracker(id: number) {
  await apiClient.delete(`/issues/${id}`);
}
