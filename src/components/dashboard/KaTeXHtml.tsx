'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

let cachedRenderMath: ((el: HTMLElement, opts: any) => void) | null = null;

// KaTeX auto-render, runs after every render to avoid stale HTML on parent re-renders
export default function KaTeXHtml({ html, className = '', tick }: { html: string; className?: string; tick?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cachedRenderMath) {
          cachedRenderMath = (await import('katex/contrib/auto-render')).default as any;
        }
        if (!ref.current || cancelled) return;
        ref.current.innerHTML = html;
        cachedRenderMath!(ref.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false },
          ],
          throwOnError: false,
          strict: 'ignore',
        });
      } catch {}
    })();
    return () => { cancelled = true; };
  });

  return (
    <div
      ref={ref}
      className={cn('prose prose-sm max-w-none text-black dark:text-black', className)}
    />
  );
}


