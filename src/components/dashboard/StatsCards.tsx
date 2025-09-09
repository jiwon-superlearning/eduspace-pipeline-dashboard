'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExecutions } from '@/hooks/useExecutions';
import { cn } from '@/lib/utils';
import { Timer, CheckCircle2, Activity, BarChart3 } from 'lucide-react';

function formatDurationAvg(seconds: number) {
  if (!isFinite(seconds) || seconds <= 0) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function StatsCards() {
  const { data: executions = [], isLoading } = useExecutions({ limit: 50, include_completed_recent: true });

  const { total, running, successRate, avgDuration } = useMemo(() => {
    const totalCount = executions.length;
    const runningCount = executions.filter(e => e.status === 'running').length;
    const completedCount = executions.filter(e => e.status === 'completed').length;
    const successRatePct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const durations = executions.map(e => e.duration_seconds || 0).filter(Boolean);
    const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return { total: totalCount, running: runningCount, successRate: successRatePct, avgDuration: avg };
  }, [executions]);

  return (
    <div className={cn(
      /* grid */ 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      /* spacing */ 'gap-4'
    )}>
      <StatCard
        title="Total Executions"
        value={isLoading ? '—' : String(total)}
        icon={<BarChart3 className={cn('h-4 w-4 text-primary')} />}
      />
      <StatCard
        title="Running"
        value={isLoading ? '—' : String(running)}
        icon={<Activity className={cn('h-4 w-4 text-blue-600')} />}
      />
      <StatCard
        title="Success Rate"
        value={isLoading ? '—' : `${successRate}%`}
        icon={<CheckCircle2 className={cn('h-4 w-4 text-green-600')} />}
      />
      <StatCard
        title="Avg Duration"
        value={isLoading ? '—' : formatDurationAvg(avgDuration)}
        icon={<Timer className={cn('h-4 w-4 text-amber-600')} />}
      />
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className={cn(
        /* layout */ 'flex flex-row items-center justify-between',
        /* spacing */ 'space-y-0 pb-2'
      )}>
        <CardTitle className={cn(
          /* text */ 'text-sm font-medium'
        )}>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold')}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default StatsCards;


