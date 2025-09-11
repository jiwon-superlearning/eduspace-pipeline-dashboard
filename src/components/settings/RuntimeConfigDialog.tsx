'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useRuntimeConfig } from '@/lib/runtime-config';

interface RuntimeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RuntimeConfigDialog({ open, onOpenChange }: RuntimeConfigDialogProps) {
  const { config, setApiBaseUrl, setFileDownloadBaseUrl, resetToDefaults } = useRuntimeConfig();
  const [apiBaseUrl, setApiBaseUrlLocal] = useState(config.apiBaseUrl);
  const [fileBaseUrl, setFileBaseUrlLocal] = useState(config.fileDownloadBaseUrl);

  useEffect(() => {
    if (open) {
      setApiBaseUrlLocal(config.apiBaseUrl);
      setFileBaseUrlLocal(config.fileDownloadBaseUrl);
    }
  }, [open, config.apiBaseUrl, config.fileDownloadBaseUrl]);

  const isChanged = useMemo(() => {
    return apiBaseUrl.trim() !== config.apiBaseUrl || fileBaseUrl.trim() !== config.fileDownloadBaseUrl;
  }, [apiBaseUrl, fileBaseUrl, config.apiBaseUrl, config.fileDownloadBaseUrl]);

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
    onOpenChange(false);
  };

  const onReset = () => {
    resetToDefaults();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        /* sizing */ 'sm:max-w-xl',
        /* layout */ 'flex flex-col gap-4'
      )}>
        <DialogHeader>
          <DialogTitle>Runtime API Settings</DialogTitle>
          <DialogDescription>
            변경 사항은 즉시 저장되며, 새 요청부터 적용됩니다. File Download Base URL을 비우면 API Base URL을 사용합니다.
          </DialogDescription>
        </DialogHeader>

        <div className={cn('space-y-4')}>
          <div className={cn('space-y-2')}>
            <Label htmlFor="apiBaseUrl">API Base URL</Label>
            <Input
              id="apiBaseUrl"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrlLocal(e.target.value)}
              placeholder={effectiveApiPlaceholder}
            />
          </div>
          <div className={cn('space-y-2')}>
            <Label htmlFor="fileBaseUrl">File Download Base URL</Label>
            <Input
              id="fileBaseUrl"
              value={fileBaseUrl}
              onChange={(e) => setFileBaseUrlLocal(e.target.value)}
              placeholder={effectiveFilePlaceholder}
            />
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


