'use client';

import React from 'react';
import { Tabs, List, Image, Button, Space, Typography, Card, Empty, Tooltip, Spin, Checkbox, Dropdown, Divider, Switch, Pagination, Modal } from 'antd';
import { DownloadOutlined, EyeOutlined, FileOutlined, FileTextOutlined, PictureOutlined, CodeOutlined, CheckSquareOutlined, CloseSquareOutlined, AppstoreOutlined } from '@ant-design/icons';
import AdminYieldViewer from '@/app/admin/executions/components/AdminYieldViewer';
import { apiClient } from '@/lib/api-client';

type Props = {
  outputKeys: string[];
  getDownloadUrl?: (fileKey: string) => string | Promise<string>;
};

type FileGroups = {
  images: string[];
  pdfs: string[];
  json: string[];
  others: string[];
};

export function AdminOutputPreview({ outputKeys, getDownloadUrl }: Props) {
  const [urlMap, setUrlMap] = React.useState<Record<string, string>>({});
  const [loadingMap, setLoadingMap] = React.useState<Record<string, boolean>>({});
  const [selectedImages, setSelectedImages] = React.useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = React.useState<boolean>(false);
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(24);

  // JSON preview modal state
  const [jsonPreviewOpen, setJsonPreviewOpen] = React.useState(false);
  const [jsonPreviewTitle, setJsonPreviewTitle] = React.useState('');
  const [jsonPreviewContent, setJsonPreviewContent] = React.useState<string>('');
  const [jsonPreviewLoading, setJsonPreviewLoading] = React.useState(false);
  const [jsonPreviewError, setJsonPreviewError] = React.useState<string | null>(null);
  const [jsonParsed, setJsonParsed] = React.useState<any | null>(null);

  const [problemsOpen, setProblemsOpen] = React.useState(false);
  const [problemsResults, setProblemsResults] = React.useState<any[]>([]);
  const [jsonVlmResults, setJsonVlmResults] = React.useState<any[]>([]);
  const groups = React.useMemo<FileGroups>(() => {
    const g: FileGroups = { images: [], pdfs: [], json: [], others: [] };
    for (const key of outputKeys) {
      const lower = key.toLowerCase();
      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) g.images.push(key);
      else if (lower.endsWith('.pdf')) g.pdfs.push(key);
      else if (lower.endsWith('.json')) g.json.push(key);
      else g.others.push(key);
    }
    return g;
  }, [outputKeys]);

  const ensureUrl = React.useCallback(async (fileKey: string) => {
    if (urlMap[fileKey] || loadingMap[fileKey]) return;
    setLoadingMap((m) => ({ ...m, [fileKey]: true }));
    try {
      let url: string;
      if (getDownloadUrl) {
        const maybe = getDownloadUrl(fileKey);
        url = (maybe && typeof (maybe as any).then === 'function') ? await (maybe as Promise<string>) : (maybe as string);
      } else {
        url = await apiClient.getFileUrl(fileKey);
      }
      setUrlMap((m) => ({ ...m, [fileKey]: url }));
    } finally {
      setLoadingMap((m) => ({ ...m, [fileKey]: false }));
    }
  }, [urlMap, loadingMap, getDownloadUrl]);

  // Reset page when image list changes
  React.useEffect(() => {
    setPage(1);
  }, [groups.images.length]);

  // Compute current page images
  const pagedImages = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return groups.images.slice(start, end);
  }, [groups.images, page, pageSize]);

  // Prefetch image URLs for current page
  React.useEffect(() => {
    if (!pagedImages.length) return;
    for (const key of pagedImages) {
      void ensureUrl(key);
    }
  }, [pagedImages, ensureUrl]);

  const openJsonPreview = async (fileKey: string) => {
    try {
      setJsonPreviewOpen(true);
      setJsonPreviewLoading(true);
      setJsonPreviewError(null);
      setJsonPreviewTitle(fileKey.split('/').pop() || fileKey);
      let url: string;
      if (getDownloadUrl) {
        const maybe = getDownloadUrl(fileKey);
        url = (maybe && typeof (maybe as any).then === 'function') ? await (maybe as Promise<string>) : (maybe as string);
      } else {
        url = await apiClient.getFileUrl(fileKey);
      }
      const resp = await fetch(url);
      const text = await resp.text();
      try {
        const obj = JSON.parse(text);
        setJsonPreviewContent(JSON.stringify(obj, null, 2));
        setJsonParsed(obj);
        // extract vlm_results from depth 1 or 2
        const extractVlm = (o: any): any[] => {
          if (!o || typeof o !== 'object') return [];
          if (Array.isArray((o as any).vlm_results)) return (o as any).vlm_results as any[];
          for (const val of Object.values(o)) {
            if (!val) continue;
            if (Array.isArray(val)) {
              for (const item of val as any[]) {
                if (item && typeof item === 'object' && Array.isArray((item as any).vlm_results)) {
                  return (item as any).vlm_results as any[];
                }
              }
            } else if (typeof val === 'object') {
              if (Array.isArray((val as any).vlm_results)) return (val as any).vlm_results as any[];
            }
          }
          return [];
        };
        setJsonVlmResults(extractVlm(obj));
      } catch {
        setJsonPreviewContent(text);
        setJsonParsed(null);
        setJsonVlmResults([]);
      }
    } catch (e: any) {
      setJsonPreviewError(e?.message || 'Failed to load JSON');
    } finally {
      setJsonPreviewLoading(false);
    }
  };

  const triggerDownload = async (fileKey: string) => {
    if (!urlMap[fileKey]) await ensureUrl(fileKey);
    const url = urlMap[fileKey];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileKey.split('/').pop() || 'file');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (outputKeys.length === 0) {
    return <Empty description="No outputs" />;
  }

  const items = [
    {
      key: 'images',
      label: (
        <Space size={6}>
          <PictureOutlined />
          <span>Images ({groups.images.length})</span>
        </Space>
      ),
      children: (
        groups.images.length === 0 ? (
          <Empty />
        ) : (
          <Image.PreviewGroup>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              {selectMode ? (
                <>
                  <Space>
                    <Checkbox
                      indeterminate={selectedImages.size > 0 && selectedImages.size < groups.images.length}
                      checked={groups.images.length > 0 && selectedImages.size === groups.images.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedImages(new Set(groups.images));
                        else setSelectedImages(new Set());
                      }}
                    >
                      Select all
                    </Checkbox>
                    <Typography.Text type="secondary">{selectedImages.size} selected</Typography.Text>
                  </Space>
                  <Space>
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'download', label: 'Download selected', disabled: selectedImages.size === 0 },
                          { key: 'clear', label: 'Clear selection', disabled: selectedImages.size === 0 },
                        ],
                        onClick: async ({ key }) => {
                          if (key === 'download' && selectedImages.size > 0) {
                            for (const k of selectedImages) {
                              if (!urlMap[k]) await ensureUrl(k);
                              const url = urlMap[k];
                              if (!url) continue;
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = (k.split('/').pop() || 'file');
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                            }
                          }
                          if (key === 'clear') {
                            setSelectedImages(new Set());
                          }
                        },
                      }}
                    >
                      <Button disabled={selectedImages.size === 0}>Actions</Button>
                    </Dropdown>
                    <Switch checked={selectMode} onChange={setSelectMode} checkedChildren="Select" unCheckedChildren="Preview" />
                  </Space>
                </>
              ) : (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                  <Switch checked={selectMode} onChange={setSelectMode} checkedChildren="Select" unCheckedChildren="Preview" />
                </div>
              )}
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {pagedImages.map((fileKey) => {
                const fileName = fileKey.split('/').pop() || fileKey;
                const isLoading = !!loadingMap[fileKey] && !urlMap[fileKey];
                const isSelected = selectedImages.has(fileKey);
                return (
                  <Dropdown
                    key={fileKey}
                    trigger={["contextMenu"]}
                    menu={{
                      items: [
                        {
                          key: 'select',
                          label: (
                            <Space size={6}>
                              {isSelected ? <CloseSquareOutlined /> : <CheckSquareOutlined />}
                              <span>{isSelected ? 'Deselect' : 'Select'}</span>
                            </Space>
                          ),
                        },
                        {
                          key: 'download',
                          label: (
                            <Space size={6}>
                              <DownloadOutlined />
                              <span>Download</span>
                            </Space>
                          ),
                        },
                      ],
                      onClick: async ({ key }) => {
                        if (key === 'select') {
                          setSelectMode(true);
                          setSelectedImages((prev) => {
                            const next = new Set(prev);
                            if (isSelected) next.delete(fileKey);
                            else next.add(fileKey);
                            return next;
                          });
                        }
                        if (key === 'download') {
                          if (!urlMap[fileKey]) await ensureUrl(fileKey);
                          const url = urlMap[fileKey];
                          if (!url) return;
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = (fileName || 'file');
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        }
                      },
                    }}
                  >
                    <Card
                      hoverable
                      size="small"
                      bodyStyle={{ padding: 8 }}
                      style={{ width: 180, borderRadius: 8, overflow: 'hidden', borderColor: isSelected ? '#1677ff' : undefined }}
                      cover={
                        <div
                          style={{
                            width: 180,
                            height: 160,
                            background: '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                          onMouseEnter={() => ensureUrl(fileKey)}
                          onClick={(e) => {
                            if (!selectMode) return; // let preview handle when not in select mode
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedImages((prev) => {
                              const next = new Set(prev);
                              if (next.has(fileKey)) next.delete(fileKey);
                              else next.add(fileKey);
                              return next;
                            });
                          }}
                        >
                          {selectMode && (
                            <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(255,255,255,0.85)', borderRadius: 4, padding: '2px 4px', zIndex: 2 }}>
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedImages((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(fileKey);
                                    else next.delete(fileKey);
                                    return next;
                                  });
                                }}
                              />
                            </div>
                          )}
                          {isLoading && <Spin />}
                          {!isLoading && (
                            <Image
                              src={urlMap[fileKey]}
                              alt={fileName}
                              preview={!selectMode}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />)
                          }
                        </div>
                      }
                      actions={[]}
                    >
                      <Tooltip title={fileName}>
                        <Typography.Text ellipsis style={{ width: '100%', display: 'inline-block' }}>
                          {fileName}
                        </Typography.Text>
                      </Tooltip>
                    </Card>
                  </Dropdown>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Pagination
                size="small"
                current={page}
                pageSize={pageSize}
                total={groups.images.length}
                onChange={(p, ps) => { setPage(p); if (ps !== pageSize) setPageSize(ps); }}
                showSizeChanger
                pageSizeOptions={[12, 24, 48, 96]}
              />
            </div>
          </Image.PreviewGroup>
        )
      ),
    },
    {
      key: 'pdfs',
      label: (
        <Space size={6}>
          <FileTextOutlined />
          <span>PDFs ({groups.pdfs.length})</span>
        </Space>
      ),
      children: (
        <List
          dataSource={groups.pdfs}
          renderItem={(fileKey) => (
            <List.Item
              actions={[
                <Button key="download" size="small" icon={<DownloadOutlined />} onClick={() => triggerDownload(fileKey)}>
                  Download
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<FileTextOutlined />}
                title={fileKey.split('/').pop()}
                description={fileKey}
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'json',
      label: (
        <Space size={6}>
          <CodeOutlined />
          <span>JSON ({groups.json.length})</span>
        </Space>
      ),
      children: (
        <List
          dataSource={groups.json}
          renderItem={(fileKey) => (
            <List.Item
              actions={[
                <Button key="preview" size="small" icon={<EyeOutlined />} onClick={() => openJsonPreview(fileKey)}>
                  Preview
                </Button>,
                <Button key="download" size="small" icon={<DownloadOutlined />} onClick={() => triggerDownload(fileKey)}>
                  Download
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<CodeOutlined />}
                title={fileKey.split('/').pop()}
                description={fileKey}
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'others',
      label: (
        <Space size={6}>
          <FileOutlined />
          <span>Others ({groups.others.length})</span>
        </Space>
      ),
      children: (
        <List
          dataSource={groups.others}
          renderItem={(fileKey) => (
            <List.Item
              actions={[
                <Button key="download" size="small" icon={<DownloadOutlined />} onClick={() => triggerDownload(fileKey)}>
                  Download
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<FileOutlined />}
                title={fileKey.split('/').pop()}
                description={fileKey}
              />
            </List.Item>
          )}
        />
      ),
    },
  ];

  return (
    <>
      <Tabs
        defaultActiveKey={
          groups.images.length ? 'images' : groups.pdfs.length ? 'pdfs' : groups.json.length ? 'json' : 'others'
        }
        items={items}
      />
      <AdminOutputPreviewJsonModal
        open={jsonPreviewOpen}
        title={jsonPreviewTitle}
        loading={jsonPreviewLoading}
        error={jsonPreviewError}
        content={jsonPreviewContent}
        onClose={() => setJsonPreviewOpen(false)}
        showProblems={jsonVlmResults.length > 0}
        onOpenProblems={() => {
          if (jsonVlmResults.length > 0) {
            setProblemsResults(jsonVlmResults);
            setProblemsOpen(true);
          }
        }}
      />
      <Modal open={problemsOpen} onCancel={() => setProblemsOpen(false)} footer={null} width={1000} title="Problems Viewer">
        <AdminYieldViewer
          results={problemsResults}
          getImageUrl={async (k) => {
            if (getDownloadUrl) {
              const maybe = getDownloadUrl(k);
              return (maybe && typeof (maybe as any).then === 'function') ? await (maybe as Promise<string>) : (maybe as string);
            }
            return apiClient.getFileUrl(k);
          }}
        />
      </Modal>
    </>
  );
  
  // JSON preview modal is rendered below
}

export default AdminOutputPreview;

// Render JSON preview modal
// Placed after default export to keep source tidy
export function AdminOutputPreviewJsonModal({
  open,
  title,
  loading,
  error,
  content,
  onClose,
  showProblems,
  onOpenProblems,
}: {
  open: boolean;
  title: string;
  loading: boolean;
  error: string | null;
  content: string;
  onClose: () => void;
  showProblems?: boolean;
  onOpenProblems?: () => void;
}) {
  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <span>{title}</span>
      {showProblems ? (
        <Button size="small" icon={<AppstoreOutlined />} onClick={onOpenProblems}>Problems Viewer</Button>
      ) : null}
    </div>
  );
  return (
    <Modal open={open} onCancel={onClose} footer={null} title={header} width={900}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          <Spin />
        </div>
      ) : error ? (
        <Empty description={error} />
      ) : (
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{content}</pre>
      )}
    </Modal>
  );
}


