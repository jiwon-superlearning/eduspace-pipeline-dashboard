'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface HostConfig {
  id: string;
  label: string;
  apiBaseUrl: string;
  fileDownloadBaseUrl: string;
  enabled: boolean;
  apiPath?: string;
  fileDownloadPath?: string;
  headers?: Record<string, string>;
}

export interface RuntimeConfig {
  apiBaseUrl: string;
  fileDownloadBaseUrl: string;
  hosts: HostConfig[];
  converterBaseUrl?: string;
}

const DEFAULTS: RuntimeConfig = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'https://class.day/pipelines/api/v1',
  fileDownloadBaseUrl:
    process.env.NEXT_PUBLIC_FILE_DOWNLOAD_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'https://class.day/pipelines/api/v1',
  hosts: [
    {
      id: 'production-paid',
      label: 'Production(paid)',
      apiBaseUrl: 'https://class.day/pipelines/api/v1',
      fileDownloadBaseUrl: 'https://class.day/pipelines/api/v1',
      enabled: true,
      apiPath: '/composite-pipelines',
      fileDownloadPath: '/files',
      headers: { 'X-Plan': 'paid' },
    },
    {
      id: 'production-free',
      label: 'Production(free)',
      apiBaseUrl: 'https://class.day/pipelines/api/v1',
      fileDownloadBaseUrl: 'https://class.day/pipelines/api/v1',
      enabled: true,
      apiPath: '/composite-pipelines',
      fileDownloadPath: '/files',
      headers: { 'X-Plan': 'free' },
    },
    {
      id: 'develop',
      label: 'Develop',
      apiBaseUrl: 'https://dev.class.day/pipelines/api/v1',
      fileDownloadBaseUrl: 'https://dev.class.day/pipelines/api/v1',
      enabled: true,
      apiPath: '/composite-pipelines',
      fileDownloadPath: '/files',
    },
    {
      id: 'legacy',
      label: 'Legacy',
      apiBaseUrl: 'http://classday.iptime.org:8000/api/v1',
      fileDownloadBaseUrl: 'http://classday.iptime.org:8000/api/v1',
      enabled: true,
      apiPath: '/composite-pipelines',
      fileDownloadPath: '/files',
    },
  ],
  converterBaseUrl:
    process.env.NEXT_PUBLIC_CONVERTER_BASE_URL ||
    '',
};

const STORAGE_KEY = 'runtime-config-v2';

interface RuntimeConfigContextValue {
  config: RuntimeConfig;
  setApiBaseUrl: (url: string) => void;
  setFileDownloadBaseUrl: (url: string) => void;
  resetToDefaults: () => void;
  addHost: (host: Omit<HostConfig, 'id'>) => void;
  updateHost: (id: string, partial: Partial<Omit<HostConfig, 'id'>>) => void;
  removeHost: (id: string) => void;
  setConverterBaseUrl: (url: string) => void;
}

const RuntimeConfigContext = createContext<RuntimeConfigContextValue | undefined>(undefined);

export function RuntimeConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<RuntimeConfig> & { hosts?: HostConfig[] };
        // Migrate from v1 if needed
        const nextHosts: HostConfig[] = Array.isArray(parsed.hosts) && parsed.hosts.length > 0
          ? parsed.hosts.map((h) => (
              h.id === 'public' && h.label === 'Public'
                ? { ...h, label: 'Production' }
                : h
            ))
          : [
              {
                id: 'default',
                label: 'Default',
                apiBaseUrl: parsed.apiBaseUrl || DEFAULTS.apiBaseUrl,
                fileDownloadBaseUrl: parsed.fileDownloadBaseUrl || DEFAULTS.fileDownloadBaseUrl,
                enabled: true,
              },
            ];
        setConfig(() => ({
          apiBaseUrl: parsed.apiBaseUrl || DEFAULTS.apiBaseUrl,
          fileDownloadBaseUrl: parsed.fileDownloadBaseUrl || DEFAULTS.fileDownloadBaseUrl,
          hosts: nextHosts,
          converterBaseUrl: parsed.converterBaseUrl || DEFAULTS.converterBaseUrl,
        }));
      } else {
        // Try read legacy key
        const legacyRaw = localStorage.getItem('runtime-config-v1');
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw) as { apiBaseUrl?: string; fileDownloadBaseUrl?: string };
            setConfig(() => ({
              apiBaseUrl: legacy.apiBaseUrl || DEFAULTS.apiBaseUrl,
              fileDownloadBaseUrl: legacy.fileDownloadBaseUrl || DEFAULTS.fileDownloadBaseUrl,
              hosts: [
                {
                  id: 'default',
                  label: 'Default',
                  apiBaseUrl: legacy.apiBaseUrl || DEFAULTS.apiBaseUrl,
                  fileDownloadBaseUrl: legacy.fileDownloadBaseUrl || DEFAULTS.fileDownloadBaseUrl,
                  enabled: true,
                },
              ],
              converterBaseUrl: DEFAULTS.converterBaseUrl,
            }));
          } catch {}
        }
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

  const addHost = useCallback((host: Omit<HostConfig, 'id'>) => {
    const id = `${host.label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    setConfig((prev) => ({ ...prev, hosts: [...prev.hosts, { ...host, id }] }));
  }, []);

  const updateHost = useCallback((id: string, partial: Partial<Omit<HostConfig, 'id'>>) => {
    setConfig((prev) => ({
      ...prev,
      hosts: prev.hosts.map((h) => (h.id === id ? { ...h, ...partial } : h)),
    }));
  }, []);

  const removeHost = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      hosts: prev.hosts.filter((h) => h.id !== id),
    }));
  }, []);

  const setConverterBaseUrl = useCallback((url: string) => {
    setConfig((prev) => ({ ...prev, converterBaseUrl: url.trim() }));
  }, []);

  const setPlan = useCallback((plan: 'free' | 'paid') => {
    setConfig((prev) => ({ ...prev, plan }));
  }, []);

  const value = useMemo<RuntimeConfigContextValue>(() => ({
    config,
    setApiBaseUrl,
    setFileDownloadBaseUrl,
    resetToDefaults,
    addHost,
    updateHost,
    removeHost,
    setConverterBaseUrl,
    setPlan,
  }), [config, setApiBaseUrl, setFileDownloadBaseUrl, resetToDefaults, addHost, updateHost, removeHost, setConverterBaseUrl, setPlan]);

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
      const parsed = JSON.parse(raw) as Partial<RuntimeConfig> & { hosts?: HostConfig[] };
      if (parsed.apiBaseUrl) return parsed.apiBaseUrl;
      const firstEnabled = parsed.hosts?.find((h) => h.enabled);
      if (firstEnabled?.apiBaseUrl) return firstEnabled.apiBaseUrl;
    }
  } catch {}
  return DEFAULTS.apiBaseUrl;
}

export function getRuntimeFileDownloadBaseUrl(): string {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RuntimeConfig> & { hosts?: HostConfig[] };
      if (parsed.fileDownloadBaseUrl) return parsed.fileDownloadBaseUrl;
      const firstEnabled = parsed.hosts?.find((h) => h.enabled);
      if (firstEnabled?.fileDownloadBaseUrl) return firstEnabled.fileDownloadBaseUrl;
    }
  } catch {}
  return DEFAULTS.fileDownloadBaseUrl;
}

export function getEnabledHosts(): HostConfig[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RuntimeConfig> & { hosts?: HostConfig[] };
      return (parsed.hosts || DEFAULTS.hosts).filter((h) => h.enabled);
    }
  } catch {}
  return DEFAULTS.hosts.filter((h) => h.enabled);
}

export function getRuntimeConverterBaseUrl(): string {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RuntimeConfig> & { hosts?: HostConfig[] };
      if (parsed.converterBaseUrl) return parsed.converterBaseUrl;
    }
  } catch {}
  return DEFAULTS.converterBaseUrl || '';
}

export function getRuntimePlan(): 'free' | 'paid' {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RuntimeConfig> & { hosts?: HostConfig[] };
      if (parsed.plan === 'free' || parsed.plan === 'paid') return parsed.plan;
    }
  } catch {}
  return DEFAULTS.plan;
}


