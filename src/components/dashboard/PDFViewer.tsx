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
}

export function PDFViewer({ fileKey, fileName = 'document.pdf', className = '', showPreview = true }: PDFViewerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    apiClient.getFileUrl(fileKey)
      .then(url => {
        setFileUrl(url);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to get file URL:', err);
        setError('Failed to load PDF URL');
      })
      .finally(() => setIsLoading(false));
  }, [fileKey]);

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  if (!showPreview) {
    return (
      <div className={`flex items-center gap-2 p-2 border rounded ${className}`}>
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{fileName}</span>
        <div className="flex gap-1 ml-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsModalOpen(true)}
            disabled={!fileUrl || isLoading}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={!fileUrl || isLoading}
          >
            <Download className="h-4 w-4" />
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
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gray-50 border-b p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{fileName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsModalOpen(true)}
            disabled={!fileUrl || isLoading}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={!fileUrl || isLoading}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-gray-100 p-4" style={{ height: '400px' }}>
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-red-600">
            <span>{error}</span>
          </div>
        )}
        {!isLoading && !error && fileUrl && (
          <SimplePDFViewer fileUrl={fileUrl} height="100%" />
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
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{fileName}</DialogTitle>
          <DialogDescription>
            Use the toolbar below to navigate and zoom the document
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <PDFViewerWithToolbar fileUrl={fileUrl} height="100%" showToolbar={true} />
        </div>
      </DialogContent>
    </Dialog>
  );
}