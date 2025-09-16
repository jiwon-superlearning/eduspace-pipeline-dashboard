'use client';

import { useMemo, useState } from 'react';
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
import { StatusBadge, HostBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
const ZipExporter = dynamic(() => import('./ZipExporter'), { ssr: false });
import { useExecutions } from '@/hooks/useExecutions';
import { useSearchParams } from 'next/navigation';
import type { CompositePipelineStatus } from '@/lib/types';
import { ChevronRight, RefreshCw, AlertCircle, Copy as CopyIcon, ChevronDown, Download, CheckSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEnabledHosts, getRuntimeConverterBaseUrl } from '@/lib/runtime-config';
import { apiClient } from '@/lib/api-client';

interface ExecutionListProps {
  onSelectExecution: (execution: CompositePipelineStatus) => void;
  selectedExecutionId?: string;
}

export function ExecutionList({ onSelectExecution, selectedExecutionId }: ExecutionListProps) {
  const searchParams = useSearchParams();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [includeCompletedRecent, setIncludeCompletedRecent] = useState<boolean>(true);
  const { data: executions = [], isLoading, error, refetch } = useExecutions({
    limit: 50,
    include_completed_recent: includeCompletedRecent,
    status_filter: (selectedStatuses.length === 1 ? selectedStatuses[0] : undefined),
  });
  const enabledHosts = useMemo(() => getEnabledHosts(), []);
  const [hostFilter, setHostFilter] = useState<string>('all');
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>([]);
  const [hostsMenuOpen, setHostsMenuOpen] = useState<boolean>(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [downloadAsImages, setDownloadAsImages] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<{ running: boolean; total: number; completed: number; mode: 'pdf' | 'images' | null }>({ running: false, total: 0, completed: 0, mode: null });
  const [zipTask, setZipTask] = useState<{ files: { url: string; name: string }[]; mode: 'pdf' | 'images' } | null>(null);
  const [serverTaskId, setServerTaskId] = useState<string | null>(null);

  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const searched = executions.filter((e) => {
    if (!q) return true;
    return (
      e.execution_id.toLowerCase().includes(q) ||
      (e.name || '').toLowerCase().includes(q)
    );
  });
  const statusFiltered = selectedStatuses.length === 0
    ? searched
    : searched.filter((e) => selectedStatuses.includes((e.status || '').toLowerCase()));
  const hostFiltered = statusFiltered.filter((e) => {
    if (selectedHostIds.length === 0) return true;
    return selectedHostIds.includes(e.host_id || '');
  });

  const toggleHost = (id: string) => {
    setSelectedHostIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const resetFilters = () => {
    setSelectedStatuses([]);
    setSelectedHostIds([]);
    setIncludeCompletedRecent(true);
  };

  const toggleStatus = (status: string) => {
    const key = status.toLowerCase();
    setSelectedStatuses((prev) => (
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    ));
  };

  const allVisibleIds = useMemo(() => hostFiltered.map((e) => e.execution_id), [hostFiltered]);
  const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);
  const isAllSelected = useMemo(() => allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds[id]), [allVisibleIds, selectedIds]);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (isAllSelected) {
        allVisibleIds.forEach((id) => { delete next[id]; });
      } else {
        allVisibleIds.forEach((id) => { next[id] = true; });
      }
      return next;
    });
  };

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedExecutions = useMemo(() => hostFiltered.filter((e) => selectedIds[e.execution_id]), [hostFiltered, selectedIds]);

  const downloadSelectedPdfs = async () => {
    if (selectedExecutions.length === 0) return;
    setZipProgress({ running: true, total: 0, completed: 0, mode: downloadAsImages ? 'images' : 'pdf' });
    const hostMap = Object.fromEntries(enabledHosts.map((h) => [h.id, h]));
    const details = await Promise.all(
      selectedExecutions.map(async (e) => {
        const host = e.host_id ? hostMap[e.host_id] : undefined;
        try {
          if (host) return await apiClient.getExecutionStatusFromHost(host, e.execution_id);
          return await apiClient.getExecutionStatus(e.execution_id);
        } catch {
          return null;
        }
      })
    );

    const files: { url: string; name: string }[] = [];
    details.forEach((detail, idx) => {
      if (!detail) return;
      const host = selectedExecutions[idx].host_id ? hostMap[selectedExecutions[idx].host_id as string] : undefined;
      const fileBase = (host?.fileDownloadBaseUrl) || '';
      const execShort = (selectedExecutions[idx].execution_id || '').slice(0, 8);
      const pushPdf = (key: string) => {
        if (!key.toLowerCase().endsWith('.pdf')) return;
        const name = key.split('/').pop() || `file-${execShort}.pdf`;
        files.push({ url: `${fileBase}/files/download/${key}?raw=true`, name: `${execShort}/${name}` });
      };
      try { (detail.steps[0]?.input_keys || []).forEach(pushPdf); } catch {}
      detail.steps.forEach((s) => s.output_keys.forEach(pushPdf));
    });

    if (files.length === 0) { setZipProgress({ running: false, total: 0, completed: 0, mode: null }); return; }

    if (!downloadAsImages) {
      setZipTask({ files, mode: 'pdf' });
      return;
    }

    // Backend conversion path
    try {
      const converterBase = getRuntimeConverterBaseUrl();
      if (!converterBase || !/^https?:\/\//i.test(converterBase)) {
        // Fallback to client-side if converter URL is not configured
        toast.error('Converter URL이 설정되지 않았어요. Settings에서 설정하거나 로컬 변환으로 진행합니다.');
        setZipTask({ files, mode: 'images' });
        return;
      }
      // Build request payload: list of file URLs
      const payload = {
        input_urls: files.map((f) => f.url),
        output_format: 'png',
        zip: true,
      };
      const resp = await fetch(`${converterBase.replace(/\/$/, '')}/convert/pdf-to-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        let info = '';
        try { info = await resp.text(); } catch {}
        throw new Error(`Failed to start conversion (${resp.status}) ${info?.slice(0, 200)}`);
      }
      const data = await resp.json();
      const taskId = data.task_id as string | undefined;
      const downloadUrl = data.download_url as string | undefined;
      if (downloadUrl) {
        // Immediate link available
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `executions-images-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 0);
        setZipProgress({ running: false, total: 0, completed: 0, mode: null });
        return;
      }
      if (!taskId) throw new Error('No task id');
      setServerTaskId(taskId);
      // Poll task progress
      const poll = async () => {
        try {
          const r = await fetch(`${converterBase.replace(/\/$/, '')}/tasks/${taskId}`);
          if (!r.ok) throw new Error('poll failed');
          const st = await r.json();
          const total = Number(st.total_pages || st.total || 0);
          const completed = Number(st.completed_pages || st.completed || 0);
          const status = String(st.status || 'running');
          setZipProgress({ running: status === 'running', total, completed, mode: 'images' });
          if (status === 'completed' && st.download_url) {
            const link = document.createElement('a');
            link.href = st.download_url as string;
            link.download = `executions-images-${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => { document.body.removeChild(link); }, 0);
            setServerTaskId(null);
            setZipProgress({ running: false, total: 0, completed: 0, mode: null });
            toast.success('Export completed');
            return;
          }
          if (status === 'failed' || status === 'error') {
            throw new Error('conversion failed');
          }
          setTimeout(poll, 1000);
        } catch (e) {
          console.error(e);
          setServerTaskId(null);
          setZipProgress({ running: false, total: 0, completed: 0, mode: null });
          toast.error('Server conversion failed. Falling back to local conversion.');
          // Fallback to local client-side conversion
          setZipTask({ files, mode: 'images' });
        }
      };
      poll();
    } catch (e) {
      console.error(e);
      // Backend start failed; fallback to local conversion
      setServerTaskId(null);
      setZipProgress({ running: false, total: 0, completed: 0, mode: null });
      toast.error('Server conversion start failed. Falling back to local conversion.');
      setZipTask({ files, mode: 'images' });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (typeof window !== 'undefined' && navigator && (navigator as any).clipboard && (navigator as any).clipboard.writeText) {
        await (navigator as any).clipboard.writeText(text);
        return;
      }
    } catch (_) {}
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (_) {}
  };

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
            <div className={cn(
              /* position */ 'relative'
            )}>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  /* layout */ 'inline-flex items-center gap-2'
                )}
                onClick={() => setStatusMenuOpen((v) => !v)}
              >
                Status {selectedStatuses.length > 0 ? `(${selectedStatuses.length})` : ''}
                <ChevronDown className={cn('h-3.5 w-3.5')} />
              </Button>

              {statusMenuOpen && (
                <>
                  <div
                    className={cn(
                      /* position */ 'fixed inset-0 z-40'
                    )}
                    onClick={() => setStatusMenuOpen(false)}
                  />
                  <div className={cn(
                    /* position */ 'absolute right-0 mt-2 z-50',
                    /* surface */ 'bg-background border shadow-md',
                    /* radius */ 'rounded-md',
                    /* sizing */ 'w-56'
                  )}>
                    <div className={cn('p-2 border-b text-xs text-muted-foreground')}>Select statuses</div>
                    <div className={cn('max-h-60 overflow-auto p-2 space-y-1')}>
                      {['running', 'pending', 'completed', 'failed'].map((s) => (
                        <label key={s} className={cn(
                          /* layout */ 'flex items-center gap-2',
                          /* spacing */ 'p-1 rounded',
                          /* surface */ 'hover:bg-muted/50'
                        )}>
                          <input
                            type="checkbox"
                            checked={selectedStatuses.includes(s)}
                            onChange={() => toggleStatus(s)}
                          />
                          <span className={cn('text-sm')}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                        </label>
                      ))}
                    </div>
                    <div className={cn(
                      /* layout */ 'flex items-center justify-between',
                      /* spacing */ 'p-2 border-t'
                    )}>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedStatuses([])}>All</Button>
                      <Button size="sm" onClick={() => setStatusMenuOpen(false)}>Apply</Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={cn(
              /* position */ 'relative'
            )}>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  /* layout */ 'inline-flex items-center gap-2'
                )}
                onClick={() => setHostsMenuOpen((v) => !v)}
              >
                Hosts {selectedHostIds.length > 0 ? `(${selectedHostIds.length})` : ''}
                <ChevronDown className={cn('h-3.5 w-3.5')} />
              </Button>

              {hostsMenuOpen && (
                <>
                  <div
                    className={cn(
                      /* position */ 'fixed inset-0 z-40'
                    )}
                    onClick={() => setHostsMenuOpen(false)}
                  />
                  <div className={cn(
                    /* position */ 'absolute right-0 mt-2 z-50',
                    /* surface */ 'bg-background border shadow-md',
                    /* radius */ 'rounded-md',
                    /* sizing */ 'w-56'
                  )}>
                    <div className={cn('p-2 border-b text-xs text-muted-foreground')}>Select hosts</div>
                    <div className={cn('max-h-60 overflow-auto p-2 space-y-1')}>
                      {enabledHosts.map((h) => (
                        <label key={h.id} className={cn(
                          /* layout */ 'flex items-center gap-2',
                          /* spacing */ 'p-1 rounded',
                          /* surface */ 'hover:bg-muted/50'
                        )}>
                          <input
                            type="checkbox"
                            checked={selectedHostIds.includes(h.id)}
                            onChange={() => toggleHost(h.id)}
                          />
                          <span className={cn('text-sm')}>{h.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className={cn(
                      /* layout */ 'flex items-center justify-between',
                      /* spacing */ 'p-2 border-t'
                    )}>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedHostIds([])}>All</Button>
                      <Button size="sm" onClick={() => setHostsMenuOpen(false)}>Apply</Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className={cn('text-muted-foreground')}
            >
              Reset
            </Button>

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
        {selectedCount > 0 && (
          <div className={cn(
            /* layout */ 'mt-3 flex items-center justify-between',
            /* surface */ 'bg-muted/30',
            /* radius */ 'rounded-md',
            /* spacing */ 'px-3 py-2',
            /* border */ 'border'
          )}>
            <div className={cn('text-sm')}>Selected {selectedCount}</div>
            <div className={cn('flex items-center gap-2')}>
              <label className={cn('text-xs text-muted-foreground inline-flex items-center gap-1 mr-2')}>
                <input type="checkbox" checked={downloadAsImages} onChange={(e) => setDownloadAsImages(e.target.checked)} />
                Export as images (PNG)
              </label>
              {zipProgress.running && (
                <div className={cn(
                  /* layout */ 'flex items-center gap-2',
                  /* surface */ 'bg-background/70',
                  /* radius */ 'rounded-md',
                  /* spacing */ 'px-2 py-1',
                  /* border */ 'border'
                )}>
                  <Loader2 className={cn('h-3.5 w-3.5 animate-spin text-muted-foreground')} />
                  <span className={cn('text-xs text-muted-foreground')}>
                    {zipProgress.mode === 'images' ? 'Rendering' : 'Bundling'} {zipProgress.completed}/{Math.max(zipProgress.total, 1)}
                  </span>
                  {serverTaskId && (
                    <Button
                      size="sm" variant="ghost"
                      className={cn('text-xs text-muted-foreground hover:text-foreground')}
                      onClick={async () => {
                        try {
                          const converterBase = getRuntimeConverterBaseUrl();
                          await fetch(`${converterBase}/tasks/${serverTaskId}/cancel`, { method: 'POST' });
                        } catch {}
                        setServerTaskId(null);
                        setZipProgress({ running: false, total: 0, completed: 0, mode: null });
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}
              <Button size="sm" variant="outline" onClick={downloadSelectedPdfs}>
                <Download className={cn('h-3.5 w-3.5 mr-2')} />
                {downloadAsImages ? 'Images ZIP' : 'PDFs ZIP'}
              </Button>
              <Button size="sm" variant="outline" disabled title="Coming soon">
                <CheckSquare className={cn('h-3.5 w-3.5 mr-2')} />
                통합 수율체크
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {zipTask && (
          <ZipExporter
            files={zipTask.files}
            mode={zipTask.mode}
            onProgress={({ total, completed }) => setZipProgress((p) => ({ running: true, total, completed, mode: zipTask.mode }))}
            onDone={(blob) => {
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = zipTask.mode === 'images' ? `executions-images-${Date.now()}.zip` : `executions-pdfs-${Date.now()}.zip`;
              document.body.appendChild(link);
              link.click();
              setTimeout(() => {
                URL.revokeObjectURL(link.href);
                document.body.removeChild(link);
              }, 0);
              setZipTask(null);
              setZipProgress({ running: false, total: 0, completed: 0, mode: null });
              toast.success('Export completed');
            }}
            onError={(err) => {
              console.error(err);
              setZipTask(null);
              setZipProgress({ running: false, total: 0, completed: 0, mode: null });
              toast.error('Export failed');
            }}
          />
        )}
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
                <TableHead>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className={cn(
                  /* sizing */ 'w-20'
                )}>ID</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hostFiltered.map((execution) => (
                <TableRow
                  key={`${execution.host_id || 'default'}:${execution.execution_id}`}
                  className={cn(
                    /* interactivity */ 'cursor-pointer hover:bg-muted/50',
                    /* state */ selectedExecutionId === execution.execution_id && 'bg-muted'
                  )}
                  onClick={() => onSelectExecution(execution)}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={!!selectedIds[execution.execution_id]}
                      onChange={(e) => { e.stopPropagation(); toggleRowSelection(execution.execution_id); }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell className={cn(
                    /* font */ 'font-medium',
                    /* sizing */ 'w-20'
                  )}>
                    <div>
                      <div className={cn(
                        /* layout */ 'flex items-center gap-2',
                        /* text */ 'whitespace-nowrap',
                        /* group */ 'group'
                      )}>
                        <span className={cn(
                          /* font */ 'font-mono',
                          /* text */ 'text-sm'
                        )}>{execution.execution_id.substring(0, 8)}...</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={cn(
                            /* sizing */ 'h-6 w-6',
                            /* state */ 'opacity-75 group-hover:opacity-100',
                            /* transition */ 'transition-opacity'
                          )}
                          aria-label="Copy execution id"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(execution.execution_id.substring(0, 8));
                          }}
                        >
                          <CopyIcon className={cn(
                            /* sizing */ 'h-3.5 w-3.5',
                            /* color */ 'text-muted-foreground'
                          )} />
                        </Button>
                      </div>
                      <div className={cn(
                        /* text */ 'text-xs text-muted-foreground truncate w-20'
                      )}>
                        {execution.name || '-'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <HostBadge id={execution.host_id} label={execution.host_label || 'Production'} />
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