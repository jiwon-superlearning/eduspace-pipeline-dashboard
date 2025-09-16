import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return {
          label: 'Pending',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
        };
      case 'running':
        return {
          label: 'Running',
          variant: 'default' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 animate-pulse',
        };
      case 'completed':
        return {
          label: 'Completed',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100',
        };
      case 'failed':
        return {
          label: 'Failed',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 hover:bg-red-100',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        };
      default:
        return {
          label: status,
          variant: 'outline' as const,
          className: '',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

interface HostBadgeProps {
  id?: string;
  label: string;
  className?: string;
}

export function HostBadge({ id, label, className }: HostBadgeProps) {
  const key = (id || label || '').toLowerCase();
  const labelLower = (label || '').toLowerCase();
  const colorClasses = (() => {
    // Plan priority: paid / free color first if detected in label
    if (labelLower.includes('paid')) return 'border-rose-200 text-rose-700 bg-rose-50';
    if (labelLower.includes('free')) return 'border-emerald-200 text-emerald-700 bg-emerald-50';
    if (key.includes('public')) return 'border-emerald-200 text-emerald-700 bg-emerald-50';
    if (key.includes('develop') || key.includes('dev')) return 'border-indigo-200 text-indigo-700 bg-indigo-50';
    if (key.includes('legacy')) return 'border-amber-200 text-amber-800 bg-amber-50';
    return 'border-blue-200 text-blue-700 bg-blue-50';
  })();
  return (
    <Badge
      variant="outline"
      className={cn(
        /* color */ colorClasses,
        className
      )}
    >
      {label}
    </Badge>
  );
}