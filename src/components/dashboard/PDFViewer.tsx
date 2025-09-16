'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  FileText,
  Loader2,
  Maximize2,
  Download
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// Dynamically import PDF viewer to avoid SSR issues
const SimplePDFViewer = dynamic(
  () => import('./PDFViewerClient').then(mod => ({ default: mod.SimplePDFViewer })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
);

const PDFViewerWithToolbar = dynamic(
  () => import('./PDFViewerClient').then(mod => ({ default: mod.PDFViewerClient })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
);

interface PDFViewerProps {
  fileKey: string;
  fileName?: string;
  className?: string;
  showPreview?: boolean;
  getDownloadUrl?: (fileKey: string) => string | Promise<string>;
}

export function PDFViewer({ fileKey, fileName = 'document.pdf', className = '', showPreview = true, getDownloadUrl }: PDFViewerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        if (getDownloadUrl) {
          const maybe = getDownloadUrl(fileKey);
          const url = (maybe && typeof (maybe as any).then === 'function') ? await (maybe as Promise<string>) : (maybe as string);
          if (!cancelled) {
            setFileUrl(url);
            setError(null);
          }
        } else {
          const url2 = await apiClient.getFileUrl(fileKey);
          if (!cancelled) {
            setFileUrl(url2);
            setError(null);
          }
        }
      } catch (err) {
        console.error('Failed to get file URL:', err);
        if (!cancelled) setError('Failed to load PDF URL');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [fileKey, getDownloadUrl]);

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  if (!showPreview) {
    return (
      <div
        className={cn(
          /* layout */ 'flex items-center gap-2',
          /* spacing */ 'p-2',
          /* surface */ 'border bg-background',
          /* radius */ 'rounded-md',
          className
        )}
      >
        <FileText className={cn(
          /* sizing */ 'h-4 w-4',
          /* color */ 'text-muted-foreground'
        )} />
        <span className={cn(
          /* text */ 'text-sm font-medium'
        )}>{fileName}</span>
        <div className={cn(
          /* layout */ 'flex gap-1',
          /* push */ 'ml-auto'
        )}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsModalOpen(true)}
            disabled={!fileUrl || isLoading}
          >
            <Maximize2 className={cn(
              /* sizing */ 'h-4 w-4'
            )} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={!fileUrl || isLoading}
          >
            <Download className={cn(
              /* sizing */ 'h-4 w-4'
            )} />
          </Button>
        </div>

        {fileUrl && (
          <PDFViewerModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            fileUrl={fileUrl}
            fileName={fileName}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      /* surface */ 'border bg-background',
      /* radius */ 'rounded-lg',
      /* overflow */ 'overflow-hidden',
      className
    )}>
      <div className={cn(
        /* surface */ 'bg-gray-50 border-b',
        /* layout */ 'flex items-center justify-between',
        /* spacing */ 'p-2'
      )}>
        <div className={cn(
          /* layout */ 'flex items-center gap-2'
        )}>
          <FileText className={cn(
            /* sizing */ 'h-4 w-4',
            /* color */ 'text-muted-foreground'
          )} />
          <span className={cn(
            /* text */ 'text-sm font-medium'
          )}>{fileName}</span>
        </div>
        <div className={cn(
          /* layout */ 'flex items-center gap-1'
        )}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsModalOpen(true)}
            disabled={!fileUrl || isLoading}
          >
            <Maximize2 className={cn('h-4 w-4')} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={!fileUrl || isLoading}
          >
            <Download className={cn('h-4 w-4')} />
          </Button>
        </div>
      </div>

      <div className={cn(
        /* surface */ 'bg-gray-100',
        /* spacing */ 'p-4'
      )} style={{ height: '400px' }}>
        {isLoading && (
          <div className={cn(
            /* layout */ 'flex items-center justify-center',
            /* sizing */ 'h-full'
          )}>
            <Loader2 className={cn(
              /* sizing */ 'h-8 w-8',
              /* motion */ 'animate-spin',
              /* color */ 'text-muted-foreground'
            )} />
          </div>
        )}
        {error && (
          <div className={cn(
            /* layout */ 'flex items-center justify-center',
            /* sizing */ 'h-full',
            /* color */ 'text-red-600'
          )}>
            <span>{error}</span>
          </div>
        )}
        {!isLoading && !error && fileUrl && (
          <SimplePDFViewer fileUrl={fileUrl} height="100%" className={cn('bg-background')} />
        )}
      </div>

      {fileUrl && (
        <PDFViewerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          fileUrl={fileUrl}
          fileName={fileName}
        />
      )}
    </div>
  );
}

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
}

function PDFViewerModal({ isOpen, onClose, fileUrl, fileName }: PDFViewerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        /* sizing */ 'w-[95vw] h-[90vh]',
        /* responsive max */ 'sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[1600px] xl:max-w-[1920px] 2xl:max-w-[1920px]',
        /* layout */ 'flex flex-col'
      )}>
        <DialogHeader>
          <DialogTitle>{fileName}</DialogTitle>
          <DialogDescription>
            Use the toolbar below to navigate and zoom the document
          </DialogDescription>
        </DialogHeader>
        
        <div className={cn(
          /* layout */ 'flex-1',
          /* overflow */ 'overflow-hidden'
        )}>
          <PDFViewerWithToolbar fileUrl={fileUrl} height="100%" showToolbar={true} />
        </div>
      </DialogContent>
    </Dialog>
  );
}