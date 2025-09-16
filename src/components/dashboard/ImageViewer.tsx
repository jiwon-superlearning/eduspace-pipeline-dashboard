'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Grid3x3,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ImageViewerProps {
  fileKeys: string[];
  className?: string;
  showThumbnails?: boolean;
  getDownloadUrl?: (fileKey: string) => string;
}

export function ImageViewer({ fileKeys, className = '', showThumbnails = true, getDownloadUrl }: ImageViewerProps) {
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
          const url = getDownloadUrl ? getDownloadUrl(fileKey) : await apiClient.getFileUrl(fileKey);
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
  }, [fileKeys, getDownloadUrl]);

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
      <div className={cn(
        /* text */ 'text-sm text-muted-foreground',
        className
      )}>
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
      <div className={cn(
        /* spacing */ 'space-y-2',
        className
      )}>
        <div className={cn(
          /* layout */ 'flex items-center justify-between'
        )}>
          <div className={cn(
            /* layout */ 'flex items-center gap-2'
          )}>
            <ImageIcon className={cn(
              /* sizing */ 'h-4 w-4',
              /* color */ 'text-muted-foreground'
            )} />
            <span className={cn(
              /* text */ 'text-sm font-medium'
            )}>{fileName}</span>
          </div>
          <div className={cn(
            /* layout */ 'flex gap-1'
          )}>
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
                  <Maximize2 className={cn('h-4 w-4')} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(fileKey)}
                >
                  <Download className={cn('h-4 w-4')} />
                </Button>
              </>
            )}
          </div>
        </div>
        {isLoading && (
          <div className={cn(
            /* layout */ 'flex items-center justify-center',
            /* sizing */ 'h-48',
            /* surface */ 'bg-gray-100',
            /* radius */ 'rounded'
          )}>
            <Loader2 className={cn('h-8 w-8 animate-spin text-muted-foreground')} />
          </div>
        )}
        {error && (
          <div className={cn(
            /* layout */ 'flex items-center justify-center',
            /* sizing */ 'h-48',
            /* surface */ 'bg-gray-100',
            /* radius */ 'rounded',
            /* color */ 'text-red-600'
          )}>
            <span className={cn('text-sm')}>{error}</span>
          </div>
        )}
        {url && !isLoading && !error && (
          <img 
            src={url} 
            alt={fileName}
            className={cn(
              /* sizing */ 'w-full',
              /* surface */ 'border',
              /* radius */ 'rounded',
              /* interactivity */ 'cursor-pointer'
            )}
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
    <div className={cn(
      /* spacing */ 'space-y-4',
      className
    )}>
      <div className={cn(
        /* layout */ 'flex items-center justify-between'
      )}>
        <div className={cn(
          /* layout */ 'flex items-center gap-2'
        )}>
          <ImageIcon className={cn('h-4 w-4 text-muted-foreground')} />
          <span className={cn('text-sm font-medium')}>{fileKeys.length} Images</span>
        </div>
        <div className={cn(
          /* layout */ 'flex gap-1'
        )}>
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className={cn('h-4 w-4')} />
          </Button>
        </div>
      </div>

      {viewMode === 'grid' && showThumbnails && (
        <div className={cn(
          /* grid */ 'grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
          /* spacing */ 'gap-2'
        )}>
          {fileKeys.slice(0, 24).map((fileKey, index) => {
            const url = imageUrls[fileKey];
            const isLoading = loading[fileKey];
            const error = errors[fileKey];
            const fileName = getFileName(fileKey);

            return (
              <div 
                key={fileKey}
                className={cn(
                  /* position */ 'relative',
                  /* group */ 'group',
                  /* interactivity */ 'cursor-pointer'
                )}
                onClick={() => {
                  setSelectedIndex(index);
                  setIsModalOpen(true);
                }}
              >
                <div className={cn(
                  /* aspect */ 'aspect-square',
                  /* surface */ 'bg-gray-100',
                  /* radius */ 'rounded',
                  /* overflow */ 'overflow-hidden'
                )}>
                  {isLoading && (
                    <div className={cn('flex items-center justify-center h-full')}>
                      <Loader2 className={cn('h-4 w-4 animate-spin text-muted-foreground')} />
                    </div>
                  )}
                  {error && (
                    <div className={cn('flex items-center justify-center h-full')}>
                      <ImageIcon className={cn('h-4 w-4 text-red-400')} />
                    </div>
                  )}
                  {url && !isLoading && !error && (
                    <img 
                      src={url} 
                      alt={fileName}
                      className={cn('w-full h-full object-cover')}
                    />
                  )}
                </div>
                <div className={cn(
                  /* position */ 'absolute inset-0',
                  /* surface */ 'bg-black/50',
                  /* state */ 'opacity-0 group-hover:opacity-100 transition-opacity',
                  /* radius */ 'rounded',
                  /* layout */ 'flex items-center justify-center'
                )}>
                  <Maximize2 className={cn('h-6 w-6 text-white')} />
                </div>
                <div className={cn('mt-1 text-xs text-muted-foreground truncate')}>
                  {fileName}
                </div>
              </div>
            );
          })}
          {fileKeys.length > 24 && (
            <div 
              className={cn(
                /* aspect */ 'aspect-square',
                /* surface */ 'bg-gray-100',
                /* radius */ 'rounded',
                /* layout */ 'flex items-center justify-center',
                /* interactivity */ 'cursor-pointer'
              )}
              onClick={() => {
                setSelectedIndex(24);
                setIsModalOpen(true);
              }}
            >
              <span className={cn('text-sm text-muted-foreground')}>
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
        showThumbnails={showThumbnails}
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
  showThumbnails?: boolean;
}

function ImageViewerModal({ 
  isOpen, 
  onClose, 
  fileKeys, 
  imageUrls, 
  selectedIndex, 
  onIndexChange,
  onDownload,
  showThumbnails = true
}: ImageViewerModalProps) {
  const currentFileKey = fileKeys[selectedIndex];
  const currentUrl = imageUrls[currentFileKey];
  const fileName = currentFileKey?.split('/').pop() || 'image.png';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [translate, setTranslate] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // reset transforms when image changes or modal reopens
    setScale(1);
    setRotation(0);
    setTranslate({ x: 0, y: 0 });
  }, [selectedIndex, isOpen]);

  const handlePrevious = () => {
    onIndexChange(selectedIndex > 0 ? selectedIndex - 1 : fileKeys.length - 1);
  };

  const handleNext = () => {
    onIndexChange(selectedIndex < fileKeys.length - 1 ? selectedIndex + 1 : 0);
  };

  const handleZoomIn = useCallback(() => setScale((s) => Math.min(5, Number((s + 0.2).toFixed(2)))), []);
  const handleZoomOut = useCallback(() => setScale((s) => Math.max(0.2, Number((s - 0.2).toFixed(2)))), []);
  const handleRotate = useCallback(() => setRotation((r) => (r + 90) % 360), []);
  const handleReset = useCallback(() => {
    setScale(1);
    setRotation(0);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) handleZoomOut();
    else handleZoomIn();
  }, [handleZoomIn, handleZoomOut]);

  const onPointerDown = (e: React.PointerEvent) => {
    // start panning only when image is zoomed in
    if (scale <= 1) return;
    setIsPanning(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panStart.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isPanning || !panStart.current) return;
    setTranslate({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  };

  const endPan = (e?: React.PointerEvent) => {
    if (e) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    setIsPanning(false);
    panStart.current = null;
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === '+') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key.toLowerCase() === 'r') handleRotate();
      if (e.key.toLowerCase() === '0') handleReset();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handlePrevious, handleNext, handleZoomIn, handleZoomOut, handleRotate, handleReset, onClose]);

  const imageStyle = useMemo(() => ({
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale}) rotate(${rotation}deg)`
  }), [translate, scale, rotation]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        /* sizing */ 'w-[95vw] h-[90vh]',
        /* responsive max */ 'sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[1600px] xl:max-w-[1920px] 2xl:max-w-[1920px]',
        /* layout */ 'flex flex-col'
      )}>
        <DialogHeader>
          <DialogTitle className={cn(
            /* layout */ 'flex items-center justify-between'
          )}>
            <span>{fileName}</span>
            <span className={cn('text-sm text-muted-foreground')}>
              {selectedIndex + 1} / {fileKeys.length}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div 
          ref={containerRef}
          className={cn(
            /* layout */ 'flex-1 relative',
            /* overflow */ 'overflow-hidden',
            /* surface */ 'bg-gray-100',
            /* radius */ 'rounded'
          )}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          {currentUrl && (
            <img 
              src={currentUrl} 
              alt={fileName}
              className={cn(
                /* sizing */ 'w-full h-full',
                /* object */ 'object-contain',
                /* interactivity */ 'select-none'
              )}
              draggable={false}
              style={imageStyle}
              onDoubleClick={() => setScale((s) => (s === 1 ? 2 : 1))}
            />
          )}

          {/* Nav arrows */}
          {fileKeys.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  /* position */ 'absolute left-2 top-1/2 -translate-y-1/2',
                  /* surface */ 'bg-white/80 hover:bg-white'
                )}
                onClick={handlePrevious}
              >
                <ChevronLeft className={cn('h-6 w-6')} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  /* position */ 'absolute right-2 top-1/2 -translate-y-1/2',
                  /* surface */ 'bg-white/80 hover:bg-white'
                )}
                onClick={handleNext}
              >
                <ChevronRight className={cn('h-6 w-6')} />
              </Button>
            </>
          )}

          {/* Controls toolbar */}
          <div className={cn(
            /* position */ 'absolute bottom-3 left-1/2 -translate-x-1/2',
            /* layout */ 'flex items-center gap-2',
            /* surface */ 'bg-white/90',
            /* radius */ 'rounded-md',
            /* spacing */ 'px-2 py-1',
            /* shadow */ 'shadow-sm'
          )}>
            <Button size="icon" variant="ghost" onClick={handleZoomOut}>
              <ZoomOut className={cn('h-4 w-4')} />
            </Button>
            <span className={cn('text-xs w-10 text-center')}>{Math.round(scale * 100)}%</span>
            <Button size="icon" variant="ghost" onClick={handleZoomIn}>
              <ZoomIn className={cn('h-4 w-4')} />
            </Button>
            <div className={cn('w-px h-4 bg-border mx-1')} />
            <Button size="icon" variant="ghost" onClick={handleRotate}>
              <RotateCw className={cn('h-4 w-4')} />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleReset}>
              <RefreshCw className={cn('h-4 w-4')} />
            </Button>
          </div>
        </div>
        
        {/* Thumbnails strip */}
        {showThumbnails && (
          <div className={cn(
            /* layout */ 'flex items-center gap-2',
            /* spacing */ 'pt-3'
          )}>
            <div className={cn(
              /* layout */ 'flex-1',
              /* overflow */ 'overflow-x-auto'
            )}>
              <div className={cn(
                /* layout */ 'flex items-center gap-2',
                /* spacing */ 'pb-1'
              )}>
                {fileKeys.map((fk, idx) => {
                  const thumbUrl = imageUrls[fk];
                  return (
                    <button
                      key={fk}
                      className={cn(
                        /* sizing */ 'h-14 w-14',
                        /* radius */ 'rounded',
                        /* surface */ 'bg-gray-100 border',
                        /* state */ idx === selectedIndex && 'ring-2 ring-primary',
                        /* interactivity */ 'shrink-0 overflow-hidden'
                      )}
                      onClick={() => onIndexChange(idx)}
                      title={fk.split('/').pop() || 'image'}
                    >
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={fk} className={cn('h-full w-full object-cover')} />
                      ) : (
                        <div className={cn('h-full w-full flex items-center justify-center')}>
                          <ImageIcon className={cn('h-4 w-4 text-muted-foreground')} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={cn('flex items-center gap-2')}>
              <Button variant="outline" onClick={() => onDownload(currentFileKey)}>
                <Download className={cn('h-4 w-4 mr-2')} />
                Download
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}