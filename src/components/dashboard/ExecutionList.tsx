'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { useExecutions } from '@/hooks/useExecutions';
import type { CompositePipelineStatus } from '@/lib/types';
import { ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';

interface ExecutionListProps {
  onSelectExecution: (execution: CompositePipelineStatus) => void;
  selectedExecutionId?: string;
}

export function ExecutionList({ onSelectExecution, selectedExecutionId }: ExecutionListProps) {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: executions = [], isLoading, error, refetch } = useExecutions({
    limit: 50,
    include_completed_recent: true,
    status_filter: statusFilter,
  });

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '-';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return dateString;
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load executions. Please check your connection.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pipeline Executions</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {['all', 'running', 'pending', 'completed', 'failed'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === (status === 'all' ? undefined : status) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status === 'all' ? undefined : status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && executions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading executions...
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No executions found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => (
                <TableRow
                  key={execution.execution_id}
                  className={cn(
                    'cursor-pointer hover:bg-muted/50',
                    selectedExecutionId === execution.execution_id && 'bg-muted'
                  )}
                  onClick={() => onSelectExecution(execution)}
                >
                  <TableCell className="font-medium">
                    <div>
                      <div>{execution.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {execution.execution_id.substring(0, 8)}...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={execution.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={execution.overall_progress} 
                        className="h-2 w-20"
                      />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(execution.overall_progress)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(execution.duration_seconds)}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {formatDate(execution.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}