import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReports, getReport, generateReport } from '../api/reports.api';

export function useReports(page = 1) {
  return useQuery({
    queryKey: ['reports', page],
    queryFn: () => getReports(page),
    staleTime: 5 * 60 * 1000,
  });
}

export function useReport(id: number) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => getReport(id),
    enabled: id > 0,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
