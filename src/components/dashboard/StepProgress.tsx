import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from './StatusBadge';
import { OutputPreview } from './OutputPreview';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, FileStack } from 'lucide-react';
import type { StepExecutionStatus } from '@/lib/types';

interface StepProgressProps {
  step: StepExecutionStatus;
  className?: string;
  showOutputs?: boolean;
}

export function StepProgress({ step, className, showOutputs = true }: StepProgressProps) {
  const [isOutputsExpanded, setIsOutputsExpanded] = useState(false);
  
  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const hasOutputs = step.output_keys.length > 0;
  const outputCount = step.output_keys.length;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{step.name}</span>
          <StatusBadge status={step.status} />
          {hasOutputs && showOutputs && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => setIsOutputsExpanded(!isOutputsExpanded)}
            >
              <FileStack className="h-3 w-3 mr-1" />
              {outputCount} {outputCount === 1 ? 'output' : 'outputs'}
              {isOutputsExpanded ? (
                <ChevronUp className="h-3 w-3 ml-1" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-1" />
              )}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {step.duration_seconds > 0 && (
            <span>{formatDuration(step.duration_seconds)}</span>
          )}
          <span>{Math.round(step.progress)}%</span>
        </div>
      </div>
      <Progress value={step.progress} className="h-2" />
      {step.error_message && (
        <p className="text-xs text-red-600 mt-1">{step.error_message}</p>
      )}
      {hasOutputs && showOutputs && isOutputsExpanded && (
        <div className="mt-3">
          <OutputPreview 
            outputKeys={step.output_keys}
            title={`${step.name} Outputs`}
            defaultExpanded={true}
          />
        </div>
      )}
    </div>
  );
}