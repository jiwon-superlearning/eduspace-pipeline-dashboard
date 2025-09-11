'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { RuntimeConfigProvider } from '@/lib/runtime-config.tsx';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000, // 5 seconds
            gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RuntimeConfigProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster richColors position="bottom-center" />
      </RuntimeConfigProvider>
    </QueryClientProvider>
  );
}