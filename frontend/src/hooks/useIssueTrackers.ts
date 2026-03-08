import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getIssueTrackers,
  getIssueTracker,
  createIssueTracker,
  trackIssue,
  updateIssueStatus,
  deleteIssueTracker,
} from '../api/issue-trackers.api';

export function useIssueTrackers(status?: 'active' | 'archived') {
  return useQuery({
    queryKey: ['issueTrackers', status],
    queryFn: () => getIssueTrackers(status),
    staleTime: 60 * 1000,
  });
}

export function useIssueTracker(id: number, page = 1) {
  return useQuery({
    queryKey: ['issueTracker', id, page],
    queryFn: () => getIssueTracker(id, page),
    enabled: id > 0,
  });
}

export function useCreateIssueTracker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { title: string; keywords: string[]; description?: string }) =>
      createIssueTracker(params.title, params.keywords, params.description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issueTrackers'] });
    },
  });
}

export function useTrackIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => trackIssue(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['issueTracker', id] });
      queryClient.invalidateQueries({ queryKey: ['issueTrackers'] });
    },
  });
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: number; status: 'active' | 'archived' }) =>
      updateIssueStatus(params.id, params.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issueTrackers'] });
    },
  });
}

export function useDeleteIssueTracker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteIssueTracker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issueTrackers'] });
    },
  });
}
