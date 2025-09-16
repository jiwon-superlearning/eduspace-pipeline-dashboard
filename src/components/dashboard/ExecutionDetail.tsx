'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge, HostBadge } from './StatusBadge';
import { StepProgress } from './StepProgress';
import { PDFViewer } from './PDFViewer';
import { OutputPreview } from './OutputPreview';
import { useExecutionDetail } from '@/hooks/useExecutions';
import { ArrowLeft, Clock, Calendar, AlertCircle, CheckCircle, XCircle, FileText, Eye, Loader2, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CompositePipelineStatus } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import VLMResultsViewer from './VLMResultsViewer';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

interface ExecutionDetailProps {
  executionId: string | null;
  onBack: () => void;
}

export function ExecutionDetail({ executionId, onBack }: ExecutionDetailProps) {
  const { data: execution, isLoading, error } = useExecutionDetail(executionId);
  const [isVlmOpen, setIsVlmOpen] = useState(false);
  const [vlmLoading, setVlmLoading] = useState(false);
  const [vlmResults, setVlmResults] = useState<any[]>([]);

  if (!executionId) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Select an execution to view details
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading execution details...
        </CardContent>
      </Card>
    );
  }

  if (error || !execution) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load execution details</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return dateString;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '-';
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes} min ${remainingSeconds} sec`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getDownloadUrl = async (fileKey: string) => {
    // Prefer host-aware file url with headers if available
    if (execution?.host_id && execution?.host_file_base_url) {
      // Rebuild a minimal HostConfig for file fetch
      const host = {
        id: execution.host_id,
        label: execution.host_label || 'Host',
        apiBaseUrl: execution.host_api_base_url || '',
        fileDownloadBaseUrl: execution.host_file_base_url || '',
        enabled: true,
      } as any;
      try {
        // Use host-specific method which applies host headers if configured
        // Note: headers are configured in settings and stored inside runtime-config hosts;
        // execution object doesn't carry headers so api-client will use defaults if found.
        // If no headers configured for that host, this returns a direct URL.
        const url = await apiClient.getFileUrlFromHost(host, fileKey);
        return url;
      } catch {}
    }
    // fallback to inferred base without headers
    const base = execution?.host_file_base_url;
    if (base) return `${base}/files/download/${fileKey}?raw=true`;
    return `${window.location.origin}/files/download/${fileKey}?raw=true`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className={cn(
          /* surface */ 'bg-muted/30 border-b'
        )}>
          <div className={cn(
            /* layout */ 'flex items-center justify-between'
          )}>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className={cn(
                  /* layout */ 'flex items-center gap-2'
                )}>
                  {execution.name}
                  <StatusBadge status={execution.status} />
                  {execution.host_label ? <HostBadge id={execution.host_id} label={execution.host_label} /> : null}
                </CardTitle>
                <div className={cn(
                  /* layout */ 'flex items-center gap-2',
                  /* spacing */ 'mt-1'
                )}>
                  <span className={cn(
                    /* font */ 'font-mono',
                    /* text */ 'text-xs text-muted-foreground'
                  )}>{execution.execution_id.substring(0, 8)}...</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      /* sizing */ 'h-6 w-6',
                      /* state */ 'opacity-70 hover:opacity-100',
                      /* transition */ 'transition-opacity'
                    )}
                    onClick={() => navigator.clipboard.writeText(execution.execution_id)}
                    title="Copy full ID"
                  >
                    <FileText className={cn('h-3.5 w-3.5 text-muted-foreground')} />
                  </Button>
                </div>
              </div>
            </div>
            <div className={cn(
              /* layout */ 'flex items-center gap-2'
            )}>
              {getStatusIcon(execution.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn(
            /* layout */ 'flex flex-wrap items-center gap-2',
            /* spacing */ 'mb-4'
          )}>
            <div className={cn(
              /* layout */ 'inline-flex items-center gap-2',
              /* surface */ 'bg-muted/40 border',
              /* radius */ 'rounded-full',
              /* spacing */ 'px-2 py-1'
            )}>
              <Calendar className={cn('h-3.5 w-3.5 text-muted-foreground')} />
              <span className={cn('text-[11px] text-muted-foreground')}>Created</span>
              <span className={cn('text-[11px] font-medium')}>{formatDate(execution.created_at)}</span>
            </div>
            <div className={cn('inline-flex items-center gap-2 bg-muted/40 border rounded-full px-2 py-1')}>
              <Clock className={cn('h-3.5 w-3.5 text-muted-foreground')} />
              <span className={cn('text-[11px] text-muted-foreground')}>Started</span>
              <span className={cn('text-[11px] font-medium')}>{formatDate(execution.started_at)}</span>
            </div>
            <div className={cn('inline-flex items-center gap-2 bg-muted/40 border rounded-full px-2 py-1')}>
              <Timer className={cn('h-3.5 w-3.5 text-muted-foreground')} />
              <span className={cn('text-[11px] text-muted-foreground')}>Duration</span>
              <span className={cn('text-[11px] font-medium')}>{formatDuration(execution.duration_seconds)}</span>
            </div>
            <div className={cn('inline-flex items-center gap-2 bg-muted/40 border rounded-full px-2 py-1')}>
              <div className={cn('h-2 w-2 rounded-full bg-primary/60')} />
              <span className={cn('text-[11px] text-muted-foreground')}>Progress</span>
              <span className={cn('text-[11px] font-medium')}>{Math.round(execution.overall_progress)}%</span>
            </div>
          </div>

          <div className={cn(
            /* spacing */ 'mb-4'
          )}>
            <div className={cn(
              /* layout */ 'flex items-center justify-between',
              /* spacing */ 'mb-2'
            )}>
              <p className={cn(
                /* text */ 'text-sm text-muted-foreground'
              )}>Overall Progress</p>
              <span className={cn(
                /* surface */ 'bg-primary/10',
                /* text */ 'text-primary',
                /* radius */ 'rounded-full',
                /* spacing */ 'px-2 py-0.5',
                /* text size */ 'text-xs font-medium'
              )}>{Math.round(execution.overall_progress)}%</span>
            </div>
            <Progress value={execution.overall_progress} className="h-2" />
          </div>

          {execution.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-800 mt-1">{execution.error_message}</p>
                </div>
              </div>
            </div>
          )}

          {execution.estimated_completion && execution.status === 'running' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Estimated Completion</p>
                  <p className="text-sm text-blue-800 mt-1">
                    {formatDate(execution.estimated_completion)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="lg"
        className={cn(
          /* layout */ 'ml-2 w-full',
          /* color */ 'bg-blue-600 hover:bg-blue-700 text-white text-md font-medium'
        )}
        disabled={execution.status !== 'completed'}
        onClick={async () => {
          setIsVlmOpen(true);
          setVlmLoading(true);
          try {
            const jsonKeys: string[] = [];
            for (const step of execution.steps) {
              for (const key of step.output_keys) {
                const name = (key.split('/').pop() || '').toLowerCase();
                if (name.endsWith('_results.json')) jsonKeys.push(key);
              }
            }
            const results: any[] = [];
            await Promise.all(
              jsonKeys.map(async (k) => {
                try {
                  const url = await getDownloadUrl(k);
                  const resp = await fetch(url);
                  if (!resp.ok) return;
                  const data = await resp.json();
                  if (Array.isArray(data?.vlm_results)) {
                    results.push(...data.vlm_results);
                  }
                } catch {}
              })
            );
            setVlmResults(results);
          } finally {
            setVlmLoading(false);
          }
        }}
      >
        수율 체크 시작하기
      </Button>
      {/* Input Files Section */}
      {execution.steps.length > 0 && execution.steps[0].input_keys.length > 0 && (
        <Card>
          <CardHeader className={cn('bg-muted/20 border-b')}>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Input Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {execution.steps[0].input_keys.map((inputKey, index) => {
                const fileName = inputKey.split('/').pop() || 'document.pdf';
                const isPDF = fileName.toLowerCase().endsWith('.pdf');
                
                return (
                  <div key={inputKey} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{fileName}</span>
                      </div>
                      {isPDF && (
                        <span className="text-xs text-muted-foreground">
                          Click to view PDF
                        </span>
                      )}
                    </div>
                    {isPDF && (
                      <PDFViewer
                        fileKey={inputKey}
                        fileName={fileName}
                        className="mt-2"
                        getDownloadUrl={getDownloadUrl}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Intermediate Outputs Section */}
      {execution.steps.some(step => step.output_keys.length > 0 && step.status === 'completed') && (
        <Card>
          <CardHeader className={cn('bg-muted/20 border-b')}>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Intermediate Outputs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {execution.steps
                .filter(step => step.output_keys.length > 0 && step.status === 'completed')
                .map((step) => (
                  <OutputPreview
                    key={step.step_id}
                    outputKeys={step.output_keys}
                    title={`${step.name} (${step.output_keys.length} files)`}
                    defaultExpanded={false}
                    getDownloadUrl={getDownloadUrl}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className={cn('bg-muted/20 border-b')}>
          <CardTitle className={cn(
            /* layout */ 'flex items-center justify-between'
          )}>
            <span>Pipeline Steps</span>
            <span className={cn(
              /* surface */ 'bg-muted',
              /* text */ 'text-xs text-muted-foreground',
              /* radius */ 'rounded-full',
              /* spacing */ 'px-2 py-0.5'
            )}>{execution.steps.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {execution.steps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No steps to display
              </p>
            ) : (
              execution.steps.map((step, index) => (
                <div key={step.step_id} className="relative">
                  {index < execution.steps.length - 1 && (
                    <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-muted" />
                  )}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <StepProgress step={step} showOutputs={true} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* VLM Results Modal */}
      <Dialog open={isVlmOpen} onOpenChange={setIsVlmOpen}>
        <DialogContent className={cn(
          /* layout */ 'w-[95vw] h-[90vh]',
          /* responsive width */ 'sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[1600px] xl:max-w-[1920px] 2xl:max-w-[1920px]'
        )}>
          <div className={cn(
            /* layout */ 'flex-1 overflow-auto'
          )}>
            {vlmLoading ? (
              <div className={cn(
                /* layout */ 'flex items-center justify-center h-full',
                /* color */ 'text-muted-foreground'
              )}>
                <Loader2 className={cn(
                  /* size */ 'h-6 w-6',
                  /* animation */ 'animate-spin'
                )} />
              </div>
            ) : vlmResults.length === 0 ? (
              <div className={cn(
                /* typography */ 'text-sm',
                /* color */ 'text-muted-foreground'
              )}>표시할 문항이 없습니다.</div>
            ) : (
              <VLMResultsViewer results={vlmResults} executionId={execution.execution_id} durationSeconds={execution.duration_seconds} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}