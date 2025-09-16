'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useRuntimeConfig } from '@/lib/runtime-config';
import type { HostConfig } from '@/lib/runtime-config';

interface RuntimeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RuntimeConfigDialog({ open, onOpenChange }: RuntimeConfigDialogProps) {
  const { config, setApiBaseUrl, setFileDownloadBaseUrl, resetToDefaults, addHost, updateHost, removeHost, setConverterBaseUrl } = useRuntimeConfig();
  const [apiBaseUrl, setApiBaseUrlLocal] = useState(config.apiBaseUrl);
  const [fileBaseUrl, setFileBaseUrlLocal] = useState(config.fileDownloadBaseUrl);
  const [converterBaseUrl, setConverterBaseUrlLocal] = useState(config.converterBaseUrl || '');
  const [hosts, setHosts] = useState<HostConfig[]>(config.hosts || []);
  const [newHost, setNewHost] = useState<{ label: string; apiBaseUrl: string; fileDownloadBaseUrl: string; enabled: boolean; apiPath?: string; fileDownloadPath?: string; headers?: string }>({ label: '', apiBaseUrl: '', fileDownloadBaseUrl: '', enabled: true, apiPath: '/composite-pipelines', fileDownloadPath: '/files', headers: '' });

  useEffect(() => {
    if (open) {
      setApiBaseUrlLocal(config.apiBaseUrl);
      setFileBaseUrlLocal(config.fileDownloadBaseUrl);
      setConverterBaseUrlLocal(config.converterBaseUrl || '');
      setHosts(config.hosts || []);
    }
  }, [open, config.apiBaseUrl, config.fileDownloadBaseUrl, config.converterBaseUrl, config.hosts]);

  const isChanged = useMemo(() => {
    const baseChanged = apiBaseUrl.trim() !== config.apiBaseUrl || fileBaseUrl.trim() !== config.fileDownloadBaseUrl || (converterBaseUrl.trim() !== (config.converterBaseUrl || ''));
    const hostsChanged = JSON.stringify(hosts) !== JSON.stringify(config.hosts || []);
    return baseChanged || hostsChanged;
  }, [apiBaseUrl, fileBaseUrl, config.apiBaseUrl, config.fileDownloadBaseUrl, hosts, config.hosts, converterBaseUrl]);

  const effectiveApiPlaceholder = useMemo(() => {
    // API 입력칸이 비어있을 때 보여줄 기본 안내 값
    return config.apiBaseUrl || 'http://localhost:8000/api/v1';
  }, [config.apiBaseUrl]);

  const effectiveFilePlaceholder = useMemo(() => {
    // File 입력칸이 비어있을 때 placeholder로 API Base URL을 사용
    const currentApi = apiBaseUrl.trim() || config.apiBaseUrl || 'http://localhost:8000/api/v1';
    return currentApi;
  }, [apiBaseUrl, config.apiBaseUrl]);

  const onSave = () => {
    setApiBaseUrl(apiBaseUrl);
    setFileDownloadBaseUrl(fileBaseUrl);
    setConverterBaseUrl(converterBaseUrl);
    // persist hosts
    // Apply changes by diffing
    const existingIds = new Set((config.hosts || []).map(h => h.id));
    const nextIds = new Set(hosts.map(h => h.id));
    // removed
    (config.hosts || []).forEach(h => { if (!nextIds.has(h.id)) removeHost(h.id); });
    // updated/added
    hosts.forEach(h => {
      if (existingIds.has(h.id)) updateHost(h.id, { label: h.label, apiBaseUrl: h.apiBaseUrl, fileDownloadBaseUrl: h.fileDownloadBaseUrl, enabled: h.enabled, apiPath: h.apiPath, fileDownloadPath: h.fileDownloadPath, headers: h.headers });
      else addHost({ label: h.label, apiBaseUrl: h.apiBaseUrl, fileDownloadBaseUrl: h.fileDownloadBaseUrl, enabled: h.enabled, apiPath: h.apiPath, fileDownloadPath: h.fileDownloadPath, headers: h.headers });
    });
    onOpenChange(false);
  };

  const onReset = () => {
    resetToDefaults();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        /* sizing */ 'sm:max-w-3xl',
        /* layout */ 'flex flex-col gap-4'
      )}>
        <DialogHeader>
          <DialogTitle>Runtime API Settings</DialogTitle>
          <DialogDescription>
            변경 사항은 즉시 저장되며, 새 요청부터 적용됩니다. 여러 호스트를 추가/활성화하면 실행 정보를 한 화면에서 집계합니다.
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          /* spacing */ 'space-y-4'
        )}>
          <div className={cn(
            /* layout */ 'grid grid-cols-1 md:grid-cols-2 gap-4'
          )}>
            <div className={cn(
              /* space */ 'space-y-2'
            )}>
              <Label htmlFor="apiBaseUrl">API Base URL</Label>
              <Input
                id="apiBaseUrl"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrlLocal(e.target.value)}
                placeholder={effectiveApiPlaceholder}
              />
            </div>
            <div className={cn(
              /* space */ 'space-y-2'
            )}>
              <Label htmlFor="fileBaseUrl">File Download Base URL</Label>
              <Input
                id="fileBaseUrl"
                value={fileBaseUrl}
                onChange={(e) => setFileBaseUrlLocal(e.target.value)}
                placeholder={effectiveFilePlaceholder}
              />
            </div>
          </div>
          <div className={cn(
            /* layout */ 'grid grid-cols-1 md:grid-cols-2 gap-4'
          )}>
            <div className={cn(
              /* space */ 'space-y-2'
            )}>
              <Label htmlFor="converterBaseUrl">Converter Base URL (PDF → Images)</Label>
              <Input
                id="converterBaseUrl"
                value={converterBaseUrl}
                onChange={(e) => setConverterBaseUrlLocal(e.target.value)}
                placeholder={apiBaseUrl || 'https://converter.example.com/api'}
              />
            </div>
          </div>
          <div className={cn('space-y-2')}>
            <Label>Hosts</Label>
            <div className={cn(
              /* layout */ 'flex flex-col gap-3'
            )}>
              {hosts.map((h, idx) => (
                <div key={h.id} className={cn(
                  /* surface */ 'border rounded-md',
                  /* spacing */ 'p-3',
                  /* layout */ 'grid grid-cols-1 md:grid-cols-12 gap-2'
                )}>
                  <div className={cn('md:col-span-2')}>
                    <Label>Label</Label>
                    <Input value={h.label} onChange={(e) => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, label: e.target.value } : x))} />
                  </div>
                  <div className={cn('md:col-span-4')}>
                    <Label>API</Label>
                    <Input value={h.apiBaseUrl} onChange={(e) => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, apiBaseUrl: e.target.value } : x))} />
                  </div>
                  <div className={cn('md:col-span-4')}>
                    <Label>Files</Label>
                    <Input value={h.fileDownloadBaseUrl} onChange={(e) => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, fileDownloadBaseUrl: e.target.value } : x))} />
                  </div>
                  <div className={cn('md:col-span-3')}>
                    <Label>API Path</Label>
                    <Input value={h.apiPath || ''} onChange={(e) => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, apiPath: e.target.value } : x))} placeholder="/composite-pipelines" />
                  </div>
                  <div className={cn('md:col-span-3')}>
                    <Label>File Path</Label>
                    <Input value={h.fileDownloadPath || ''} onChange={(e) => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, fileDownloadPath: e.target.value } : x))} placeholder="/files" />
                  </div>
                  <div className={cn('md:col-span-6')}>
                    <Label>Headers (JSON)</Label>
                    <Input value={JSON.stringify(h.headers || {})} onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value || '{}');
                        setHosts(prev => prev.map((x, i) => i===idx ? { ...x, headers: parsed } : x));
                      } catch {}
                    }} placeholder='{"X-Plan":"paid"}' />
                  </div>
                  <div className={cn('md:col-span-2 flex items-end gap-2')}>
                    <Button variant={h.enabled ? 'default' : 'outline'} onClick={() => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, enabled: !x.enabled } : x))}>
                      {h.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                    <Button variant="destructive" onClick={() => setHosts(prev => prev.filter((_, i) => i !== idx))}>Remove</Button>
                  </div>
                </div>
              ))}
              <div className={cn(
                /* surface */ 'border rounded-md',
                /* spacing */ 'p-3',
                /* layout */ 'grid grid-cols-1 md:grid-cols-12 gap-2'
              )}>
                <div className={cn('md:col-span-2')}>
                  <Label>Label</Label>
                  <Input value={newHost.label} onChange={(e) => setNewHost({ ...newHost, label: e.target.value })} placeholder="e.g. Staging" />
                </div>
                <div className={cn('md:col-span-4')}>
                  <Label>API</Label>
                  <Input value={newHost.apiBaseUrl} onChange={(e) => setNewHost({ ...newHost, apiBaseUrl: e.target.value })} placeholder="http://host/api/v1" />
                </div>
                <div className={cn('md:col-span-4')}>
                  <Label>Files</Label>
                  <Input value={newHost.fileDownloadBaseUrl} onChange={(e) => setNewHost({ ...newHost, fileDownloadBaseUrl: e.target.value })} placeholder="http://host/api/v1" />
                </div>
                <div className={cn('md:col-span-3')}>
                  <Label>API Path</Label>
                  <Input value={newHost.apiPath} onChange={(e) => setNewHost({ ...newHost, apiPath: e.target.value })} placeholder="/composite-pipelines" />
                </div>
                <div className={cn('md:col-span-3')}>
                  <Label>File Path</Label>
                  <Input value={newHost.fileDownloadPath} onChange={(e) => setNewHost({ ...newHost, fileDownloadPath: e.target.value })} placeholder="/files" />
                </div>
                <div className={cn('md:col-span-6')}>
                  <Label>Headers (JSON)</Label>
                  <Input value={newHost.headers || ''} onChange={(e) => setNewHost({ ...newHost, headers: e.target.value })} placeholder='{"Authorization":"Bearer ..."}' />
                </div>
                <div className={cn('md:col-span-2 flex items-end')}>
                  <Button
                    onClick={() => {
                      if (!newHost.label || !newHost.apiBaseUrl) return;
                      const item: HostConfig = {
                        id: `${newHost.label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                        label: newHost.label,
                        apiBaseUrl: newHost.apiBaseUrl,
                        fileDownloadBaseUrl: newHost.fileDownloadBaseUrl || newHost.apiBaseUrl,
                        enabled: newHost.enabled,
                        apiPath: newHost.apiPath || '/composite-pipelines',
                        fileDownloadPath: newHost.fileDownloadPath || '/files',
                        headers: (() => { try { return newHost.headers ? JSON.parse(newHost.headers) : {}; } catch { return {}; } })(),
                      };
                      setHosts(prev => [...prev, item]);
                      setNewHost({ label: '', apiBaseUrl: '', fileDownloadBaseUrl: '', enabled: true, apiPath: '/composite-pipelines', fileDownloadPath: '/files', headers: '' });
                    }}
                  >
                    Add Host
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className={cn('gap-2')}>
          <Button variant="secondary" onClick={onReset}>Reset to Defaults</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={!isChanged}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RuntimeConfigDialog;


