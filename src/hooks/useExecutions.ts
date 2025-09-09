'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CompositePipelineStatus, ExecutionFilters } from '@/lib/types';

export function useExecutions(filters?: ExecutionFilters) {
  const refreshInterval = parseInt(
    process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '5000',
    10
  );

  return useQuery<CompositePipelineStatus[]>({
    queryKey: ['executions', filters],
    queryFn: async () => {
      return await apiClient.getActiveExecutions(filters);
    },
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useExecutionDetail(executionId: string | null) {
  const refreshInterval = parseInt(
    process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '5000',
    10
  );

  return useQuery<CompositePipelineStatus | null>({
    queryKey: ['execution', executionId],
    queryFn: async () => {
      if (!executionId) return null;
      return await apiClient.getExecutionStatus(executionId);
    },
    enabled: !!executionId,
    refetchInterval: (query) => {
      // Stop polling if the execution is completed or failed
      const data = query.state.data;
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return refreshInterval;
    },
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: 1000,
  });
}