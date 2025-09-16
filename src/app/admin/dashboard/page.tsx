'use client';

import { useEffect, useState, Suspense } from 'react';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { ExecutionList } from '@/components/dashboard/ExecutionList';
import { ExecutionDetail } from '@/components/dashboard/ExecutionDetail';
import StatsCards from '@/components/dashboard/StatsCards';
import type { CompositePipelineStatus } from '@/lib/types';
import { Activity } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedExecution, setSelectedExecution] = useState<CompositePipelineStatus | null>(null);

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
    router.replace(`/admin/dashboard?${params.toString()}`);
  };

  return (
    <Suspense fallback={<div />}>
      <DashboardShell>
        <div className="space-y-4">
          <StatsCards />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Pipeline Execution Dashboard</h1>
            </div>
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
      </DashboardShell>
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';


