"use client";

import { useEffect } from 'react';

type ExportFile = { url: string; name: string };

interface ZipExporterProps {
  files: ExportFile[];
  mode: 'pdf' | 'images';
  onProgress?: (progress: { total: number; completed: number }) => void;
  onDone?: (blob: Blob) => void;
  onError?: (error: unknown) => void;
}

export default function ZipExporter({ files, mode, onProgress, onDone, onError }: ZipExporterProps) {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        if (mode === 'pdf') {
          if (onProgress) onProgress({ total: files.length, completed: 0 });
          let completed = 0;
          for (const f of files) {
            if (cancelled) return;
            try {
              const resp = await fetch(f.url);
              if (resp.ok) {
                const blob = await resp.blob();
                zip.file(f.name, blob);
              }
            } catch {}
            completed += 1;
            if (onProgress) onProgress({ total: files.length, completed });
          }
        } else {
          // images
          const pdfjsLib: any = await import('pdfjs-dist/build/pdf');
          try { (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'; } catch {}
          let total = 0;
          let completed = 0;
          // Pre-count pages
          for (const f of files) {
            if (cancelled) return;
            try {
              const resp = await fetch(f.url);
              if (!resp.ok) continue;
              const buffer = await resp.arrayBuffer();
              const doc = await (pdfjsLib as any).getDocument({ data: buffer }).promise;
              total += doc.numPages;
            } catch {}
          }
          if (onProgress) onProgress({ total, completed });
          // Render pages
          for (const f of files) {
            if (cancelled) return;
            try {
              const resp = await fetch(f.url);
              if (!resp.ok) continue;
              const buffer = await resp.arrayBuffer();
              const doc = await (pdfjsLib as any).getDocument({ data: buffer }).promise;
              const pages = doc.numPages;
              for (let p = 1; p <= pages; p += 1) {
                if (cancelled) return;
                const page = await doc.getPage(p);
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) continue;
                await page.render({ canvasContext: ctx, viewport }).promise;
                const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
                if (blob) {
                  const base = f.name.replace(/\.pdf$/i, '');
                  const pageName = `${base}/page-${String(p).padStart(3, '0')}.png`;
                  zip.file(pageName, blob);
                }
                completed += 1;
                if (onProgress) onProgress({ total, completed });
              }
            } catch {}
          }
        }

        if (cancelled) return;
        const content = await zip.generateAsync({ type: 'blob' });
        if (onDone) onDone(content);
      } catch (err) {
        if (onError) onError(err);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [files, mode, onProgress, onDone, onError]);

  return null;
}


