'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, Button, Space, Modal, Spin, Typography } from 'antd';
import { FilePdfOutlined, DownloadOutlined, FullscreenOutlined } from '@ant-design/icons';
import { apiClient } from '@/lib/api-client';

// Dynamically import PDF viewer to avoid SSR issues
const SimplePDFViewer = dynamic(
  () => import('./PDFViewerClient').then(mod => ({ default: mod.SimplePDFViewer })),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spin />
      </div>
    ),
  }
);

const PDFViewerWithToolbar = dynamic(
  () => import('./PDFViewerClient').then(mod => ({ default: mod.PDFViewerClient })),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spin />
      </div>
    ),
  }
);

interface PDFViewerProps {
  fileKey: string;
  fileName?: string;
  className?: string;
  showPreview?: boolean;
  getDownloadUrl?: (fileKey: string) => string | Promise<string>;
  height?: string | number;
}

export function PDFViewer({ fileKey, fileName = 'document.pdf', className = '', showPreview = true, getDownloadUrl, height }: PDFViewerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerHeight = typeof height !== 'undefined' ? height : '400px';

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
    if (!fileUrl) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!showPreview) {
    return (
      <Card size="small" className={className} bodyStyle={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <FilePdfOutlined />
        <Typography.Text strong>{fileName}</Typography.Text>
        <Space style={{ marginLeft: 'auto' }}>
          <Button icon={<FullscreenOutlined />} onClick={() => setIsModalOpen(true)} disabled={!fileUrl || isLoading} />
          <Button icon={<DownloadOutlined />} onClick={handleDownload} disabled={!fileUrl || isLoading} />
        </Space>
        {fileUrl && (
          <PDFViewerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} fileUrl={fileUrl} fileName={fileName} />
        )}
      </Card>
    );
  }

  return (
    <div className={className} style={{ height: containerHeight, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', padding: 8 }}>
        <Space>
          <FilePdfOutlined />
          <Typography.Text strong>{fileName}</Typography.Text>
        </Space>
        <Space>
          <Button icon={<FullscreenOutlined />} onClick={() => setIsModalOpen(true)} disabled={!fileUrl || isLoading} />
          <Button icon={<DownloadOutlined />} onClick={handleDownload} disabled={!fileUrl || isLoading} />
        </Space>
      </div>
      <div style={{ background: '#f5f5f5', padding: 12, flex: 1, minHeight: 0 }}>
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Spin />
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ff4d4f' }}>
            <span>{error}</span>
          </div>
        )}
        {!isLoading && !error && fileUrl && (
          <SimplePDFViewer fileUrl={fileUrl} height="100%" />
        )}
      </div>

      {fileUrl && (
        <PDFViewerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} fileUrl={fileUrl} fileName={fileName} />
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
    <Modal open={isOpen} onCancel={onClose} footer={null} title={fileName} width={"95vw"} bodyStyle={{ height: '90vh', padding: 0 }}>
      <div style={{ height: '100%' }}>
        <PDFViewerWithToolbar fileUrl={fileUrl} height="100%" showToolbar={true} />
      </div>
    </Modal>
  );
}