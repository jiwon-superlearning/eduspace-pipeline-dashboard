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