import type { DataProvider } from '@refinedev/core';
import { apiClient } from './api-client';
import { getEnabledHosts } from './runtime-config';

// Minimal dataProvider for read-only executions resource using existing apiClient
export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters }) => {
    if (resource !== 'executions') {
      return { data: [], total: 0 } as any;
    }

    const limit = pagination?.pageSize ?? 50;
    // Derive status filters with OR semantics: collect all 'status' filters/arrays; default to running/completed/pending
    const statusValues = new Set<string>();
    (filters || []).forEach((f: any) => {
      if (f?.field !== 'status') return;
      const val = f?.value;
      if (Array.isArray(val)) val.forEach((v) => statusValues.add(String(v)));
      else if (val !== undefined && val !== null) statusValues.add(String(val));
    });
    const derivedStatusFilters: string[] = statusValues.size > 0
      ? Array.from(statusValues)
      : ['running', 'completed', 'failed', 'pending'];
    const includeCompletedRecent = derivedStatusFilters.includes('completed');

    try {
      const hosts = getEnabledHosts();
      if (hosts && hosts.length > 0) {
        const calls: Promise<any[]>[] = [];
        for (const h of hosts) {
          if (derivedStatusFilters.length > 0) {
            for (const s of derivedStatusFilters) {
              calls.push(
                apiClient.getActiveExecutionsFromHost(h, {
                  limit,
                  status_filters: [s],
                  include_completed_recent: includeCompletedRecent,
                })
              );
            }
          } else {
            calls.push(
              apiClient.getActiveExecutionsFromHost(h, {
                limit,
                include_completed_recent: includeCompletedRecent,
              })
            );
          }
        }
        const results = await Promise.allSettled(calls);
        const merged = results
          .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
          .flatMap((r) => r.value);
        if (merged.length > 0) {
          const withIds = merged.map((e) => ({ id: e.host_id ? `${e.host_id}:${e.execution_id}` : e.execution_id, ...e }));
          return {
            data: withIds,
            total: withIds.length,
          } as any;
        }
        // If multi-host returned nothing (all failed or empty), fall back to default aggregated endpoint
      }
    } catch {}
    const data = await apiClient.getActiveExecutions({
      limit,
      status_filters: derivedStatusFilters,
      include_completed_recent: includeCompletedRecent,
    });
    return {
      data: data.map((e) => ({ id: e.execution_id, ...e })),
      total: data.length,
    } as any;
  },

  getOne: async ({ resource, id }) => {
    if (resource !== 'executions') {
      return { data: { id } } as any;
    }
    const rawId = String(id);
    const execId = rawId.includes(':') ? rawId.split(':').pop() as string : rawId;
    try {
      const hosts = getEnabledHosts();
      if (hosts && hosts.length > 0) {
        for (const h of hosts) {
          try {
            const d = await apiClient.getExecutionStatusFromHost(h, execId);
            return { data: { id: d.execution_id, ...d } } as any;
          } catch {}
        }
      }
    } catch {}
    const data = await apiClient.getExecutionStatus(execId);
    return { data: { id: data.execution_id, ...data } } as any;
  },

  // Unused operations for now
  create: async () => ({ data: {} as any }),
  update: async () => ({ data: {} as any }),
  deleteOne: async () => ({ data: {} as any }),
  getApiUrl: () => '',
  custom: async () => ({ data: {} as any }),
};


