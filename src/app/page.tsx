'use client';

import { useEffect, useState } from 'react';
import { ExecutionList } from '@/components/dashboard/ExecutionList';
import { ExecutionDetail } from '@/components/dashboard/ExecutionDetail';
import StatsCards from '@/components/dashboard/StatsCards';
import type { CompositePipelineStatus } from '@/lib/types';
import { Activity } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedExecution, setSelectedExecution] = useState<CompositePipelineStatus | null>(null);

  // Initialize from URL
  useEffect(() => {
    const exec = searchParams.get('exec');
    if (!exec) return;
    setSelectedExecution((prev) => (
      prev && prev.execution_id === exec
        ? prev
        : ({ execution_id: exec } as unknown as CompositePipelineStatus)
    ));
  }, [searchParams]);

  const setSelected = (execution: CompositePipelineStatus | null) => {
    setSelectedExecution(execution);
    const params = new URLSearchParams(window.location.search);
    if (execution?.execution_id) params.set('exec', execution.execution_id);
    else params.delete('exec');
    router.replace(`/?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <StatsCards />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Pipeline Execution Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground hidden md:block">
          Real-time monitoring of Eduspace pipeline executions
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-1">
          <ExecutionList
            onSelectExecution={setSelected}
            selectedExecutionId={selectedExecution?.execution_id}
          />
        </div>
        <div className="lg:col-span-1">
          <ExecutionDetail
            executionId={selectedExecution?.execution_id || null}
            onBack={() => setSelected(null)}
          />
        </div>
      </div>
    </div>
  );
}