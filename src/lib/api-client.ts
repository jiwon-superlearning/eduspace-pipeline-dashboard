import axios, { AxiosInstance } from 'axios';
import type { CompositePipelineStatus, ExecutionFilters } from './types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 seconds
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
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

  /**
   * Get single execution status
   */
  async getExecutionStatus(executionId: string): Promise<CompositePipelineStatus> {
    const response = await this.client.get<CompositePipelineStatus>(
      `/composite-pipelines/${executionId}/status`
    );
    return response.data;
  }

  /**
   * Get file URL for display
   */
  async getFileUrl(fileKey: string): Promise<string> {
    // Use the external API endpoint for downloading files
    const baseUrl = process.env.NEXT_PUBLIC_FILE_DOWNLOAD_BASE_URL || 'http://classday.iptime.org:18000/api/v1';
    return `${baseUrl}/files/download/${fileKey}?raw=true`;
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