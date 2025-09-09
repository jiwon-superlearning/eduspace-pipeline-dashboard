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
  FileJson,
  Loader2,
  Download,
  Copy,
  Maximize2,
  ChevronDown,
  ChevronRight,
  Check
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface JSONViewerProps {
  fileKey: string;
  fileName?: string;
  className?: string;
  showPreview?: boolean;
}

export function JSONViewer({ fileKey, fileName = 'data.json', className = '', showPreview = true }: JSONViewerProps) {
  const [jsonData, setJsonData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');

  useEffect(() => {
    const loadJSON = async () => {
      setIsLoading(true);
      try {
        const url = await apiClient.getFileUrl(fileKey);
        setFileUrl(url);
        
        // Fetch and parse JSON
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch JSON');
        const data = await response.json();
        setJsonData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load JSON:', err);
        setError('Failed to load JSON data');
      } finally {
        setIsLoading(false);
      }
    };

    loadJSON();
  }, [fileKey]);

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const handleCopy = async () => {
    if (jsonData) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  if (!showPreview) {
    return (
      <div className={cn("flex items-center gap-2 p-2 border rounded", className)}>
        <FileJson className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{fileName}</span>
        <div className="flex gap-1 ml-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsModalOpen(true)}
            disabled={isLoading}
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
        {jsonData && (
          <JSONViewerModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            jsonData={jsonData}
            fileName={fileName}
            onDownload={handleDownload}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <div className="bg-gray-50 border-b p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileJson className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{fileName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            disabled={!jsonData || isLoading}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsModalOpen(true)}
            disabled={!jsonData || isLoading}
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

      <div className="p-4 bg-gray-900 text-gray-100 max-h-96 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-32 text-red-400">
            <span className="text-sm">{error}</span>
          </div>
        )}
        {jsonData && !isLoading && !error && (
          <JSONTree data={jsonData} />
        )}
      </div>

      {jsonData && (
        <JSONViewerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          jsonData={jsonData}
          fileName={fileName}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}

interface JSONTreeProps {
  data: any;
  level?: number;
  keyName?: string;
}

function JSONTree({ data, level = 0, keyName }: JSONTreeProps) {
  const [expanded, setExpanded] = useState(level < 2);

  if (data === null) {
    return <span className="text-gray-500">null</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="text-blue-400">{data.toString()}</span>;
  }

  if (typeof data === 'number') {
    return <span className="text-green-400">{data}</span>;
  }

  if (typeof data === 'string') {
    return <span className="text-yellow-400">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-500">[]</span>;
    }

    return (
      <div className={cn(level > 0 && "ml-4")}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-300 focus:outline-none inline-flex items-center gap-1"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {keyName && <span className="text-gray-300">{keyName}:</span>}
          <span>[{data.length}]</span>
        </button>
        {expanded && (
          <div className="ml-4">
            {data.map((item, index) => (
              <div key={index} className="my-1">
                <span className="text-gray-500">{index}:</span>{' '}
                <JSONTree data={item} level={level + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return <span className="text-gray-500">{'{}'}</span>;
    }

    return (
      <div className={cn(level > 0 && "ml-4")}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-300 focus:outline-none inline-flex items-center gap-1"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {keyName && <span className="text-gray-300">{keyName}:</span>}
          <span>{`{${keys.length}}`}</span>
        </button>
        {expanded && (
          <div className="ml-4">
            {keys.map(key => (
              <div key={key} className="my-1">
                <span className="text-purple-400">{key}:</span>{' '}
                <JSONTree data={data[key]} level={level + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span className="text-gray-400">Unknown</span>;
}

interface JSONViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  jsonData: any;
  fileName: string;
  onDownload: () => void;
}

function JSONViewerModal({ isOpen, onClose, jsonData, fileName, onDownload }: JSONViewerModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-muted-foreground" />
              <span>{fileName}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-gray-900 text-gray-100 rounded p-4">
          <JSONTree data={jsonData} />
        </div>
      </DialogContent>
    </Dialog>
  );
}