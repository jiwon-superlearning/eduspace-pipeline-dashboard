'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from './StatusBadge';
import { StepProgress } from './StepProgress';
import { PDFViewer } from './PDFViewer';
import { OutputPreview } from './OutputPreview';
import { useExecutionDetail } from '@/hooks/useExecutions';
import { ArrowLeft, Clock, Calendar, AlertCircle, CheckCircle, XCircle, FileText, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CompositePipelineStatus } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import VLMResultsViewer from './VLMResultsViewer';
import { cn } from '@/lib/utils';

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {execution.name}
                  <StatusBadge status={execution.status} />
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  ID: {execution.execution_id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(execution.status)}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  /* layout */ 'ml-2',
                  /* color */ 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
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
                          const url = await (await import('@/lib/api-client')).apiClient.getFileUrl(k);
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
                수율 체크
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm font-medium">{formatDate(execution.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Started</p>
              <p className="text-sm font-medium">{formatDate(execution.started_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-sm font-medium">{formatDuration(execution.duration_seconds)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-sm font-medium">{Math.round(execution.overall_progress)}%</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">Overall Progress</p>
            <Progress value={execution.overall_progress} className="h-3" />
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

      {/* Input Files Section */}
      {execution.steps.length > 0 && execution.steps[0].input_keys.length > 0 && (
        <Card>
          <CardHeader>
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
          <CardHeader>
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
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Steps</CardTitle>
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
        <DialogHeader>
          <DialogTitle>수율 체크</DialogTitle>
        </DialogHeader>
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