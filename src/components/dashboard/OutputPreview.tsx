'use client';

import { useState, useMemo } from 'react';
import { PDFViewer } from './PDFViewer';
import { ImageViewer } from './ImageViewer';
import { JSONViewer } from './JSONViewer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Image as ImageIcon, 
  FileJson, 
  File, 
  Download,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutputPreviewProps {
  outputKeys: string[];
  className?: string;
  title?: string;
  defaultExpanded?: boolean;
}

interface FileGroup {
  pdfs: string[];
  images: string[];
  json: string[];
  others: string[];
}

export function OutputPreview({ 
  outputKeys, 
  className = '', 
  title = 'Outputs',
  defaultExpanded = false 
}: OutputPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<string>('');

  // Group files by type
  const fileGroups = useMemo<FileGroup>(() => {
    const groups: FileGroup = {
      pdfs: [],
      images: [],
      json: [],
      others: []
    };

    outputKeys.forEach(key => {
      const lowerKey = key.toLowerCase();
      const fileName = key.split('/').pop() || '';
      
      if (lowerKey.endsWith('.pdf')) {
        groups.pdfs.push(key);
      } else if (lowerKey.endsWith('.png') || lowerKey.endsWith('.jpg') || lowerKey.endsWith('.jpeg')) {
        groups.images.push(key);
      } else if (lowerKey.endsWith('.json')) {
        groups.json.push(key);
      } else {
        groups.others.push(key);
      }
    });

    // Set default active tab
    if (!activeTab) {
      if (groups.images.length > 0) setActiveTab('images');
      else if (groups.pdfs.length > 0) setActiveTab('pdfs');
      else if (groups.json.length > 0) setActiveTab('json');
      else if (groups.others.length > 0) setActiveTab('others');
    }

    return groups;
  }, [outputKeys, activeTab]);

  const handleDownloadAll = () => {
    // In a real implementation, this could zip all files
    // For now, we'll just open each file in a new tab
    outputKeys.forEach(async (key) => {
      const baseUrl = process.env.NEXT_PUBLIC_FILE_DOWNLOAD_BASE_URL || 'http://classday.iptime.org:8000/api/v1';
      const url = `${baseUrl}/files/download/${key}?raw=true`;
      window.open(url, '_blank');
    });
  };

  if (outputKeys.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No outputs available
      </div>
    );
  }

  const tabCounts = {
    images: fileGroups.images.length,
    pdfs: fileGroups.pdfs.length,
    json: fileGroups.json.length,
    others: fileGroups.others.length,
  };

  const totalFiles = outputKeys.length;

  return (
    <div className={cn("border rounded-lg", className)}>
      <div 
        className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <button className="p-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <span className="font-medium">{title}</span>
          <span className="text-sm text-muted-foreground">
            ({totalFiles} {totalFiles === 1 ? 'file' : 'files'})
          </span>
        </div>
        {isExpanded && totalFiles > 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadAll();
            }}
          >
            <Download className="h-3 w-3 mr-1" />
            Download All
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              {tabCounts.images > 0 && (
                <TabsTrigger value="images" className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  Images ({tabCounts.images})
                </TabsTrigger>
              )}
              {tabCounts.pdfs > 0 && (
                <TabsTrigger value="pdfs" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  PDFs ({tabCounts.pdfs})
                </TabsTrigger>
              )}
              {tabCounts.json > 0 && (
                <TabsTrigger value="json" className="flex items-center gap-1">
                  <FileJson className="h-3 w-3" />
                  JSON ({tabCounts.json})
                </TabsTrigger>
              )}
              {tabCounts.others > 0 && (
                <TabsTrigger value="others" className="flex items-center gap-1">
                  <File className="h-3 w-3" />
                  Others ({tabCounts.others})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="images" className="mt-4">
              {fileGroups.images.length > 0 && (
                <ImageViewer fileKeys={fileGroups.images} />
              )}
            </TabsContent>

            <TabsContent value="pdfs" className="mt-4">
              <div className="space-y-4">
                {fileGroups.pdfs.map(pdfKey => {
                  const fileName = pdfKey.split('/').pop() || 'document.pdf';
                  return (
                    <PDFViewer
                      key={pdfKey}
                      fileKey={pdfKey}
                      fileName={fileName}
                      showPreview={false}
                    />
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="json" className="mt-4">
              <div className="space-y-4">
                {fileGroups.json.map(jsonKey => {
                  const fileName = jsonKey.split('/').pop() || 'data.json';
                  return (
                    <JSONViewer
                      key={jsonKey}
                      fileKey={jsonKey}
                      fileName={fileName}
                      showPreview={false}
                    />
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="others" className="mt-4">
              <div className="space-y-2">
                {fileGroups.others.map(fileKey => {
                  const fileName = fileKey.split('/').pop() || 'file';
                  const baseUrl = process.env.NEXT_PUBLIC_FILE_DOWNLOAD_BASE_URL || 'http://classday.iptime.org:8000/api/v1';
                  const url = `${baseUrl}/files/download/${fileKey}?raw=true`;
                  
                  return (
                    <div key={fileKey} className="flex items-center gap-2 p-2 border rounded">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">{fileName}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(url, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}