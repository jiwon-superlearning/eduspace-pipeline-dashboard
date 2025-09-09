'use client';

import { useState } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface PDFViewerClientProps {
  fileUrl: string;
  height?: string;
  showToolbar?: boolean;
}

export function PDFViewerClient({ 
  fileUrl, 
  height = '400px',
  showToolbar = false
}: PDFViewerClientProps) {
  // Create instance of default layout plugin
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [],
  });

  if (!fileUrl) return null;

  return (
    <Worker workerUrl="/pdf.worker.min.mjs">
      <div style={{ height }}>
        <Viewer 
          fileUrl={fileUrl} 
          plugins={showToolbar ? [defaultLayoutPluginInstance] : []}
          defaultScale={1.0}
        />
      </div>
    </Worker>
  );
}

export function SimplePDFViewer({ fileUrl, height = '400px' }: { fileUrl: string; height?: string }) {
  if (!fileUrl) return null;

  return (
    <Worker workerUrl="/pdf.worker.min.mjs">
      <div style={{ height, border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
        <Viewer fileUrl={fileUrl} defaultScale={1.0} />
      </div>
    </Worker>
  );
}