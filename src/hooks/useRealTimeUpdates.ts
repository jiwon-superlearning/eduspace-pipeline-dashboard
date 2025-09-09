'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CompositePipelineStatus } from '@/lib/types';

export function useRealTimeUpdates(executionIds: string[]) {
  const refreshInterval = parseInt(
    process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '5000',
    10
  );

  return useQuery<CompositePipelineStatus[]>({
    queryKey: ['realtime-status', executionIds],
    queryFn: async () => {
      if (executionIds.length === 0) {
        return [];
      }
      return await apiClient.getRealtimeStatus(executionIds);
    },
    enabled: executionIds.length > 0,
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: 1000,
  });
}