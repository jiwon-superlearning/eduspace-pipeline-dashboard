'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface RuntimeConfig {
  apiBaseUrl: string;
  fileDownloadBaseUrl: string;
}

const DEFAULTS: RuntimeConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1',
  fileDownloadBaseUrl:
    process.env.NEXT_PUBLIC_FILE_DOWNLOAD_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:8000/api/v1',
};

const STORAGE_KEY = 'runtime-config-v1';

interface RuntimeConfigContextValue {
  config: RuntimeConfig;
  setApiBaseUrl: (url: string) => void;
  setFileDownloadBaseUrl: (url: string) => void;
  resetToDefaults: () => void;
}

const RuntimeConfigContext = createContext<RuntimeConfigContextValue | undefined>(undefined);

export function RuntimeConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<RuntimeConfig>;
        setConfig((prev) => ({
          apiBaseUrl: parsed.apiBaseUrl || prev.apiBaseUrl,
          fileDownloadBaseUrl: parsed.fileDownloadBaseUrl || prev.fileDownloadBaseUrl,
        }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }, [config]);

  const setApiBaseUrl = useCallback((url: string) => {
    setConfig((prev) => ({ ...prev, apiBaseUrl: url.trim() }));
  }, []);

  const setFileDownloadBaseUrl = useCallback((url: string) => {
    setConfig((prev) => ({ ...prev, fileDownloadBaseUrl: url.trim() }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULTS);
  }, []);

  const value = useMemo<RuntimeConfigContextValue>(() => ({
    config,
    setApiBaseUrl,
    setFileDownloadBaseUrl,
    resetToDefaults,
  }), [config, setApiBaseUrl, setFileDownloadBaseUrl, resetToDefaults]);

  return (
    <RuntimeConfigContext.Provider value={value}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfig() {
  const ctx = useContext(RuntimeConfigContext);
  if (!ctx) throw new Error('useRuntimeConfig must be used within RuntimeConfigProvider');
  return ctx;
}

export function getRuntimeApiBaseUrl(): string {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RuntimeConfig>;
      if (parsed.apiBaseUrl) return parsed.apiBaseUrl;
    }
  } catch {}
  return DEFAULTS.apiBaseUrl;
}

export function getRuntimeFileDownloadBaseUrl(): string {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RuntimeConfig>;
      if (parsed.fileDownloadBaseUrl) return parsed.fileDownloadBaseUrl;
    }
  } catch {}
  return DEFAULTS.fileDownloadBaseUrl;
}


