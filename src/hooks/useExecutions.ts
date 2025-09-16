'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CompositePipelineStatus, ExecutionFilters } from '@/lib/types';
import { getEnabledHosts } from '@/lib/runtime-config.tsx';

export function useExecutions(filters?: ExecutionFilters) {
  const refreshInterval = parseInt(
    process.env.NEXT_PUBLIC_REFRESH_INTERVAL || '5000',
    10
  );

  return useQuery<CompositePipelineStatus[]>({
    queryKey: ['executions', filters],
    queryFn: async () => {
      const hosts = getEnabledHosts();
      const hasMultiStatuses = Array.isArray(filters?.status_filters) && (filters?.status_filters?.length || 0) > 0;
      if (hosts.length <= 1) {
        // single host
        const data = await apiClient.getActiveExecutions(filters);
        // annotate with default host if missing
        if (hosts.length === 1) {
          const host = hosts[0];
          return data.map((e) => ({
            ...e,
            host_id: e.host_id || host.id,
            host_label: e.host_label || host.label,
            host_api_base_url: e.host_api_base_url || host.apiBaseUrl,
            host_file_base_url: e.host_file_base_url || host.fileDownloadBaseUrl,
          }));
        }
        return data;
      }
      // multi-host: fetch in parallel and merge
      const results = await Promise.all(
        hosts.map((host) => apiClient.getActiveExecutionsFromHost(host, filters).catch(() => []))
      );
      // flatten and sort by created_at desc
      const merged = results.flat();
      // If multiple statuses requested, keep all; backend already filters per status and we appended multiple params
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return merged;
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
      // Without knowing the host, try all enabled hosts until found
      const hosts = getEnabledHosts();
      if (hosts.length === 0) return await apiClient.getExecutionStatus(executionId);
      for (const host of hosts) {
        try {
          const data = await apiClient.getExecutionStatusFromHost(host, executionId);
          if (data) return data;
        } catch {}
      }
      // fallback to default client
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