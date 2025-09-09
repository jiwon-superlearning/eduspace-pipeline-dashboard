'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Image as ImageIcon,
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Grid3x3
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ImageViewerProps {
  fileKeys: string[];
  className?: string;
  showThumbnails?: boolean;
}

export function ImageViewer({ fileKeys, className = '', showThumbnails = true }: ImageViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');

  useEffect(() => {
    // Load image URLs for all file keys
    fileKeys.forEach(async (fileKey) => {
      if (!imageUrls[fileKey] && !loading[fileKey]) {
        setLoading(prev => ({ ...prev, [fileKey]: true }));
        try {
          const url = await apiClient.getFileUrl(fileKey);
          setImageUrls(prev => ({ ...prev, [fileKey]: url }));
          setErrors(prev => ({ ...prev, [fileKey]: '' }));
        } catch (err) {
          console.error(`Failed to load image ${fileKey}:`, err);
          setErrors(prev => ({ ...prev, [fileKey]: 'Failed to load image' }));
        } finally {
          setLoading(prev => ({ ...prev, [fileKey]: false }));
        }
      }
    });
  }, [fileKeys]);

  const handlePrevious = () => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : fileKeys.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex(prev => (prev < fileKeys.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = (fileKey: string) => {
    const url = imageUrls[fileKey];
    if (url) {
      window.open(url, '_blank');
    }
  };

  const getFileName = (fileKey: string) => {
    return fileKey.split('/').pop() || 'image.png';
  };

  if (fileKeys.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No images to display
      </div>
    );
  }

  // Single image view
  if (fileKeys.length === 1) {
    const fileKey = fileKeys[0];
    const url = imageUrls[fileKey];
    const isLoading = loading[fileKey];
    const error = errors[fileKey];
    const fileName = getFileName(fileKey);

    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{fileName}</span>
          </div>
          <div className="flex gap-1">
            {url && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedIndex(0);
                    setIsModalOpen(true);
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(fileKey)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        {isLoading && (
          <div className="flex items-center justify-center h-48 bg-gray-100 rounded">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-48 bg-gray-100 rounded text-red-600">
            <span className="text-sm">{error}</span>
          </div>
        )}
        {url && !isLoading && !error && (
          <img 
            src={url} 
            alt={fileName}
            className="w-full rounded border cursor-pointer"
            onClick={() => {
              setSelectedIndex(0);
              setIsModalOpen(true);
            }}
          />
        )}
      </div>
    );
  }

  // Multiple images - grid view
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{fileKeys.length} Images</span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'grid' && showThumbnails && (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {fileKeys.slice(0, 24).map((fileKey, index) => {
            const url = imageUrls[fileKey];
            const isLoading = loading[fileKey];
            const error = errors[fileKey];
            const fileName = getFileName(fileKey);

            return (
              <div 
                key={fileKey}
                className="relative group cursor-pointer"
                onClick={() => {
                  setSelectedIndex(index);
                  setIsModalOpen(true);
                }}
              >
                <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                  {isLoading && (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-4 w-4 text-red-400" />
                    </div>
                  )}
                  {url && !isLoading && !error && (
                    <img 
                      src={url} 
                      alt={fileName}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                  <Maximize2 className="h-6 w-6 text-white" />
                </div>
                <div className="mt-1 text-xs text-muted-foreground truncate">
                  {fileName}
                </div>
              </div>
            );
          })}
          {fileKeys.length > 24 && (
            <div 
              className="aspect-square bg-gray-100 rounded flex items-center justify-center cursor-pointer"
              onClick={() => {
                setSelectedIndex(24);
                setIsModalOpen(true);
              }}
            >
              <span className="text-sm text-muted-foreground">
                +{fileKeys.length - 24} more
              </span>
            </div>
          )}
        </div>
      )}

      <ImageViewerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        fileKeys={fileKeys}
        imageUrls={imageUrls}
        selectedIndex={selectedIndex}
        onIndexChange={setSelectedIndex}
        onDownload={handleDownload}
      />
    </div>
  );
}

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileKeys: string[];
  imageUrls: Record<string, string>;
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  onDownload: (fileKey: string) => void;
}

function ImageViewerModal({ 
  isOpen, 
  onClose, 
  fileKeys, 
  imageUrls, 
  selectedIndex, 
  onIndexChange,
  onDownload 
}: ImageViewerModalProps) {
  const currentFileKey = fileKeys[selectedIndex];
  const currentUrl = imageUrls[currentFileKey];
  const fileName = currentFileKey?.split('/').pop() || 'image.png';

  const handlePrevious = () => {
    onIndexChange(selectedIndex > 0 ? selectedIndex - 1 : fileKeys.length - 1);
  };

  const handleNext = () => {
    onIndexChange(selectedIndex < fileKeys.length - 1 ? selectedIndex + 1 : 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{fileName}</span>
            <span className="text-sm text-muted-foreground">
              {selectedIndex + 1} / {fileKeys.length}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden relative bg-gray-100 rounded">
          {currentUrl && (
            <img 
              src={currentUrl} 
              alt={fileName}
              className="w-full h-full object-contain"
            />
          )}
          
          {fileKeys.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-4">
          <Button
            variant="outline"
            onClick={() => onDownload(currentFileKey)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}