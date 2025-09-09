'use client';

import { Viewer, Worker, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { cn } from '@/lib/utils';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

type ZoomPreset = number | keyof typeof SpecialZoomLevel;

interface BaseProps {
  fileUrl: string;
  height?: string;
  className?: string;
}

interface PDFViewerClientProps extends BaseProps {
  showToolbar?: boolean;
  defaultZoom?: ZoomPreset;
  bordered?: boolean;
  rounded?: boolean;
}

export function PDFViewerClient({ 
  fileUrl, 
  height = '400px',
  className = '',
  showToolbar = false,
  defaultZoom = 'PageWidth',
  bordered = false,
  rounded = false,
}: PDFViewerClientProps) {
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [],
  });

  if (!fileUrl) return null;

  const defaultScale = typeof defaultZoom === 'number' ? defaultZoom : SpecialZoomLevel[defaultZoom] ?? 1.0;

  return (
    <Worker workerUrl="/pdf.worker.min.mjs">
      <div 
        className={cn(
          /* layout */ 'w-full',
          /* sizing */ 'h-full',
          /* surface */ bordered && 'border',
          /* radius */ rounded && 'rounded-md',
          className
        )}
        style={{ height }}
      >
        <Viewer 
          fileUrl={fileUrl} 
          plugins={showToolbar ? [defaultLayoutPluginInstance] : []}
          defaultScale={defaultScale}
          renderLoader={() => (
            <div className={cn(
              /* layout */ 'flex items-center justify-center',
              /* sizing */ 'w-full h-full'
            )}>
              <div className={cn(
                /* shape */ 'rounded-full',
                /* sizing */ 'h-8 w-8',
                /* motion */ 'animate-spin',
                /* surface */ 'border-2 border-muted-foreground/30 border-t-muted-foreground'
              )} />
            </div>
          )}
        />
      </div>
    </Worker>
  );
}

export function SimplePDFViewer({ fileUrl, height = '400px', className = '', defaultZoom = 'PageWidth' }: BaseProps & { defaultZoom?: ZoomPreset }) {
  if (!fileUrl) return null;

  const defaultScale = typeof defaultZoom === 'number' ? defaultZoom : SpecialZoomLevel[defaultZoom] ?? 1.0;

  return (
    <Worker workerUrl="/pdf.worker.min.mjs">
      <div 
        className={cn(
          /* surface */ 'border bg-background',
          /* radius */ 'rounded-md',
          /* sizing */ 'w-full',
          className
        )}
        style={{ height }}
      >
        <Viewer 
          fileUrl={fileUrl} 
          defaultScale={defaultScale}
          renderLoader={() => (
            <div className={cn(
              /* layout */ 'flex items-center justify-center',
              /* sizing */ 'w-full h-full'
            )}>
              <div className={cn(
                /* shape */ 'rounded-full',
                /* sizing */ 'h-8 w-8',
                /* motion */ 'animate-spin',
                /* surface */ 'border-2 border-muted-foreground/30 border-t-muted-foreground'
              )} />
            </div>
          )}
        />
      </div>
    </Worker>
  );
}