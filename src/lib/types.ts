// Pipeline data types based on the API schema

export enum ExecutionMode {
  SEQUENTIAL = "sequential",
  PARALLEL = "parallel",
  CONDITIONAL = "conditional",
  FAN_OUT = "fan_out",
}

export enum PipelineStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface StepDefinition {
  step_id: string;
  name: string;
  pipeline_type: string;
  parameters: Record<string, any>;
  depends_on: string[];
  execution_mode: ExecutionMode;
  max_parallel_workers: number;
  timeout: number;
  retry_count: number;
  continue_on_error: boolean;
  input_mapping?: Record<string, any>;
  advanced_input_mapping?: Record<string, any>;
  output_mapping?: Record<string, string[]>;
}

export interface CompositePipelineDefinition {
  name: string;
  description: string;
  steps: StepDefinition[];
  global_parameters: Record<string, any>;
  timeout: number;
}

export interface StepExecutionStatus {
  step_id: string;
  name: string;
  status: string;
  progress: number;
  started_at?: string;
  completed_at?: string;
  job_ids: string[];
  input_keys: string[];
  output_keys: string[];
  error_message?: string;
  duration_seconds: number;
}

export interface CompositePipelineStatus {
  execution_id: string;
  name: string;
  status: string;
  overall_progress: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_completion?: string;
  duration_seconds: number;
  steps: StepExecutionStatus[];
  error_message?: string;
  // Optional metadata for multi-host aggregation
  host_id?: string;
  host_label?: string;
  host_api_base_url?: string;
  host_file_base_url?: string;
}

export interface CompositePipelineResponse {
  execution_id: string;
  status: string;
  name: string;
  created_at: string;
  estimated_completion?: string;
  overall_progress: number;
}

export interface ExecutionFilters {
  limit?: number;
  include_completed_recent?: boolean;
  status_filter?: string;
}