import axios, { AxiosInstance } from 'axios';
import { getRuntimeApiBaseUrl, getRuntimeFileDownloadBaseUrl } from './runtime-config';
import type { CompositePipelineStatus, ExecutionFilters } from './types';
import type { HostConfig } from './runtime-config';
import { getEnabledHosts } from './runtime-config';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: getRuntimeApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 seconds
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        // Always use latest baseURL
        config.baseURL = getRuntimeApiBaseUrl();
        // Global X-Plan removed; use per-host headers instead
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get active pipeline executions
   */
  async getActiveExecutions(filters?: ExecutionFilters): Promise<CompositePipelineStatus[]> {
    const params = new URLSearchParams();
    
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.include_completed_recent !== undefined) {
      params.append('include_completed_recent', filters.include_completed_recent.toString());
    }
    if (filters?.status_filter) {
      params.append('status_filter', filters.status_filter);
    }

    const response = await this.client.get<CompositePipelineStatus[]>(
      `/composite-pipelines/executions/active`,
      { params }
    );
    return response.data;
  }

  /**
   * Get active executions from a specific host
   */
  async getActiveExecutionsFromHost(host: HostConfig, filters?: ExecutionFilters): Promise<CompositePipelineStatus[]> {
    const client = axios.create({
      baseURL: host.apiBaseUrl,
      headers: { 'Content-Type': 'application/json', ...(host.headers || {}) },
      timeout: 10000,
    });
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.include_completed_recent !== undefined) params.append('include_completed_recent', String(filters.include_completed_recent));
    if (filters?.status_filter) params.append('status_filter', filters.status_filter);
    const apiPath = (host.apiPath || '/composite-pipelines').replace(/\/$/, '');
    const { data } = await client.get<CompositePipelineStatus[]>(`${apiPath}/executions/active`, { params });
    // annotate with host metadata
    return data.map((e) => ({
      ...e,
      host_id: host.id,
      host_label: host.label,
      host_api_base_url: host.apiBaseUrl,
      host_file_base_url: host.fileDownloadBaseUrl,
    }));
  }

  /**
   * Get real-time status for specific executions
   */
  async getRealtimeStatus(executionIds: string[]): Promise<CompositePipelineStatus[]> {
    if (executionIds.length === 0) {
      return [];
    }

    const params = new URLSearchParams();
    executionIds.forEach(id => params.append('execution_ids', id));

    const response = await this.client.get<CompositePipelineStatus[]>(
      `/composite-pipelines/executions/realtime-status`,
      { params }
    );
    return response.data;
  }

  async getRealtimeStatusFromHost(host: HostConfig, executionIds: string[]): Promise<CompositePipelineStatus[]> {
    if (executionIds.length === 0) return [];
    const client = axios.create({
      baseURL: host.apiBaseUrl,
      headers: { 'Content-Type': 'application/json', ...(host.headers || {}) },
      timeout: 10000,
    });
    const params = new URLSearchParams();
    executionIds.forEach((id) => params.append('execution_ids', id));
    const apiPath = (host.apiPath || '/composite-pipelines').replace(/\/$/, '');
    const { data } = await client.get<CompositePipelineStatus[]>(`${apiPath}/executions/realtime-status`, { params });
    return data.map((e) => ({
      ...e,
      host_id: host.id,
      host_label: host.label,
      host_api_base_url: host.apiBaseUrl,
      host_file_base_url: host.fileDownloadBaseUrl,
    }));
  }

  /**
   * Get single execution status
   */
  async getExecutionStatus(executionId: string): Promise<CompositePipelineStatus> {
    const response = await this.client.get<CompositePipelineStatus>(
      `/composite-pipelines/${executionId}/status`
    );
    return { ...response.data };
  }

  async getExecutionStatusFromHost(host: HostConfig, executionId: string): Promise<CompositePipelineStatus> {
    const client = axios.create({
      baseURL: host.apiBaseUrl,
      headers: { 'Content-Type': 'application/json', ...(host.headers || {}) },
      timeout: 10000,
    });
    const apiPath = (host.apiPath || '/composite-pipelines').replace(/\/$/, '');
    const { data } = await client.get<CompositePipelineStatus>(`${apiPath}/${executionId}/status`);
    return {
      ...data,
      host_id: host.id,
      host_label: host.label,
      host_api_base_url: host.apiBaseUrl,
      host_file_base_url: host.fileDownloadBaseUrl,
    };
  }

  /**
   * Get file URL for display
   */
  async getFileUrl(fileKey: string): Promise<string> {
    // Use the external API endpoint for downloading files
    const baseUrl = getRuntimeFileDownloadBaseUrl();
    return `${baseUrl}/files/download/${fileKey}?raw=true`;
  }

  async getFileUrlFromHost(host: HostConfig, fileKey: string): Promise<string> {
    const filePath = (host.fileDownloadPath || '/files').replace(/\/$/, '');
    // If headers configured in runtime-config for this host id, use them
    let effectiveHeaders: Record<string, string> | undefined = host.headers;
    try {
      const hosts = getEnabledHosts();
      const match = hosts.find((h) => h.id === host.id);
      if (match && match.headers && Object.keys(match.headers).length > 0) {
        effectiveHeaders = match.headers;
      }
    } catch {}
    if (effectiveHeaders && Object.keys(effectiveHeaders).length > 0) {
      const url = `${host.fileDownloadBaseUrl}${filePath}/download/${fileKey}?raw=true`;
      const resp = await axios.get(url, { headers: { ...effectiveHeaders }, responseType: 'blob' });
      const blobUrl = URL.createObjectURL(resp.data);
      return blobUrl;
    }
    return `${host.fileDownloadBaseUrl}${filePath}/download/${fileKey}?raw=true`;
  }

  /**
   * Download file as blob
   */
  async downloadFile(fileKey: string): Promise<Blob> {
    const response = await this.client.get(
      `/files/download/${fileKey}`,
      { responseType: 'blob' }
    );
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();