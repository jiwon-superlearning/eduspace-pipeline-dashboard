'use client';

import { useState } from 'react';
import { ExecutionList } from '@/components/dashboard/ExecutionList';
import { ExecutionDetail } from '@/components/dashboard/ExecutionDetail';
import type { CompositePipelineStatus } from '@/lib/types';
import { Activity } from 'lucide-react';

export default function DashboardPage() {
  const [selectedExecution, setSelectedExecution] = useState<CompositePipelineStatus | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Pipeline Execution Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time monitoring of Eduspace pipeline executions
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Execution List */}
          <div className="lg:col-span-1">
            <ExecutionList
              onSelectExecution={setSelectedExecution}
              selectedExecutionId={selectedExecution?.execution_id}
            />
          </div>

          {/* Right Column - Execution Details */}
          <div className="lg:col-span-1">
            <ExecutionDetail
              executionId={selectedExecution?.execution_id || null}
              onBack={() => setSelectedExecution(null)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}