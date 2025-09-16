'use client';

import React from 'react';
import { Button, Card, Col, Divider, Input, Row, Space, Switch, Typography, message } from 'antd';
import { useRuntimeConfig } from '@/lib/runtime-config';
import type { HostConfig } from '@/lib/runtime-config';

export default function AdminRuntimeConfigTab() {
  const { config, setApiBaseUrl, setFileDownloadBaseUrl, resetToDefaults, addHost, updateHost, removeHost, setConverterBaseUrl } = useRuntimeConfig();

  const [apiBaseUrl, setApi] = React.useState(config.apiBaseUrl);
  const [fileBaseUrl, setFile] = React.useState(config.fileDownloadBaseUrl);
  const [converterBaseUrl, setConv] = React.useState(config.converterBaseUrl || '');
  const [hosts, setHosts] = React.useState<HostConfig[]>(config.hosts || []);
  const [hostHeaderErrors, setHostHeaderErrors] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setApi(config.apiBaseUrl);
    setFile(config.fileDownloadBaseUrl);
    setConv(config.converterBaseUrl || '');
    setHosts(config.hosts || []);
  }, [config.apiBaseUrl, config.fileDownloadBaseUrl, config.converterBaseUrl, config.hosts]);

  const onSave = () => {
    // prevent save on invalid JSON
    const hasHeaderError = Object.values(hostHeaderErrors).some(Boolean);
    if (hasHeaderError) {
      message.error('Fix invalid Headers (JSON) before saving.');
      return;
    }
    setApiBaseUrl(apiBaseUrl.trim());
    setFileDownloadBaseUrl(fileBaseUrl.trim());
    setConverterBaseUrl(converterBaseUrl.trim());
    const existingIds = new Set((config.hosts || []).map(h => h.id));
    const nextIds = new Set(hosts.map(h => h.id));
    (config.hosts || []).forEach(h => { if (!nextIds.has(h.id)) removeHost(h.id); });
    hosts.forEach(h => {
      const partial = { label: h.label, apiBaseUrl: h.apiBaseUrl, fileDownloadBaseUrl: h.fileDownloadBaseUrl, enabled: h.enabled, apiPath: h.apiPath, fileDownloadPath: h.fileDownloadPath, headers: h.headers } as Partial<Omit<HostConfig, 'id'>>;
      if (existingIds.has(h.id)) updateHost(h.id, partial);
      else addHost({ label: h.label, apiBaseUrl: h.apiBaseUrl, fileDownloadBaseUrl: h.fileDownloadBaseUrl, enabled: h.enabled, apiPath: h.apiPath, fileDownloadPath: h.fileDownloadPath, headers: h.headers });
    });
    message.success('Settings saved');
  };

  const onReset = () => {
    resetToDefaults();
    message.success('Reset to defaults');
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="Base URLs" size="small">
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Text strong>API Base URL</Typography.Text>
              <Input size="small" value={apiBaseUrl} onChange={(e) => setApi(e.target.value)} placeholder="https://host/api/v1" />
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Text strong>File Download Base URL</Typography.Text>
              <Input size="small" value={fileBaseUrl} onChange={(e) => setFile(e.target.value)} placeholder="https://host/api/v1" />
            </Space>
          </Col>
        </Row>
        <Row gutter={12} style={{ marginTop: 12 }}>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Text strong>Converter Base URL</Typography.Text>
              <Input size="small" value={converterBaseUrl} onChange={(e) => setConv(e.target.value)} placeholder="https://converter/api" />
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title="Hosts" size="small">
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {hosts.map((h, idx) => (
            <Card key={h.id} size="small" bodyStyle={{ padding: 12 }}>
              <Row gutter={8}>
                <Col xs={24} md={6}>
                  <Typography.Text type="secondary">Label</Typography.Text>
                  <Input size="small" value={h.label} onChange={(e) => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, label: e.target.value } : x))} />
                </Col>
                <Col xs={24} md={9}>
                  <Typography.Text type="secondary">API</Typography.Text>
                  <Input size="small" value={h.apiBaseUrl} onChange={(e) => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, apiBaseUrl: e.target.value } : x))} />
                </Col>
                <Col xs={24} md={9}>
                  <Typography.Text type="secondary">Files</Typography.Text>
                  <Input size="small" value={h.fileDownloadBaseUrl} onChange={(e) => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, fileDownloadBaseUrl: e.target.value } : x))} />
                </Col>
              </Row>
              <Row gutter={8} style={{ marginTop: 8 }}>
                <Col xs={24} md={6}>
                  <Typography.Text type="secondary">API Path</Typography.Text>
                  <Input size="small" value={h.apiPath || ''} onChange={(e) => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, apiPath: e.target.value } : x))} placeholder="/composite-pipelines" />
                </Col>
                <Col xs={24} md={6}>
                  <Typography.Text type="secondary">File Path</Typography.Text>
                  <Input size="small" value={h.fileDownloadPath || ''} onChange={(e) => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, fileDownloadPath: e.target.value } : x))} placeholder="/files" />
                </Col>
                <Col xs={24} md={6}>
                  <Typography.Text type="secondary">Enabled</Typography.Text>
                  <div>
                    <Switch checked={h.enabled} onChange={(v) => setHosts(prev => prev.map((x, i) => i===idx ? { ...x, enabled: v } : x))} />
                  </div>
                </Col>
                <Col xs={24} md={6}>
                  <Typography.Text type="secondary">Actions</Typography.Text>
                  <div>
                    <Button danger onClick={() => setHosts(prev => prev.filter((_, i) => i !== idx))}>Remove</Button>
                  </div>
                </Col>
              </Row>
              <Row style={{ marginTop: 8 }}>
                <Col span={24}>
                  <Typography.Text type="secondary">Headers (JSON)</Typography.Text>
                  <Input.TextArea
                    size="small"
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    status={hostHeaderErrors[h.id] ? 'error' : ''}
                    value={JSON.stringify(h.headers || {})}
                    onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value || '{}');
                      setHosts(prev => prev.map((x, i) => i===idx ? { ...x, headers: parsed } : x));
                      setHostHeaderErrors((prev) => ({ ...prev, [h.id]: false }));
                    } catch {}
                    }}
                    onBlur={(e) => {
                      try {
                        JSON.parse(e.target.value || '{}');
                        setHostHeaderErrors((prev) => ({ ...prev, [h.id]: false }));
                      } catch {
                        setHostHeaderErrors((prev) => ({ ...prev, [h.id]: true }));
                        message.error('Invalid Headers JSON');
                      }
                    }}
                    placeholder='{"X-Plan":"paid"}'
                  />
                </Col>
              </Row>
            </Card>
          ))}
          <Divider />
          <AddHostForm onAdd={(item) => setHosts(prev => [...prev, item])} />
        </Space>
      </Card>

      <div style={{ position: 'sticky', bottom: 0, background: '#fff', paddingTop: 8, paddingBottom: 8 }}>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onReset}>Reset to Defaults</Button>
          <Button onClick={onSave} type="primary">Save</Button>
        </Space>
      </div>
    </Space>
  );
}

function AddHostForm({ onAdd }: { onAdd: (h: HostConfig) => void }) {
  const [label, setLabel] = React.useState('');
  const [api, setApi] = React.useState('');
  const [files, setFiles] = React.useState('');
  const [apiPath, setApiPath] = React.useState('/composite-pipelines');
  const [filePath, setFilePath] = React.useState('/files');
  const [enabled, setEnabled] = React.useState(true);
  const [headers, setHeaders] = React.useState('');

  return (
    <Card size="small" title="Add Host">
      <Row gutter={8}>
        <Col xs={24} md={6}>
          <Typography.Text type="secondary">Label</Typography.Text>
          <Input size="small" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Staging" />
        </Col>
        <Col xs={24} md={9}>
          <Typography.Text type="secondary">API</Typography.Text>
          <Input size="small" value={api} onChange={(e) => setApi(e.target.value)} placeholder="http://host/api/v1" />
        </Col>
        <Col xs={24} md={9}>
          <Typography.Text type="secondary">Files</Typography.Text>
          <Input size="small" value={files} onChange={(e) => setFiles(e.target.value)} placeholder="http://host/api/v1" />
        </Col>
      </Row>
      <Row gutter={8} style={{ marginTop: 8 }}>
        <Col xs={24} md={6}>
          <Typography.Text type="secondary">API Path</Typography.Text>
          <Input size="small" value={apiPath} onChange={(e) => setApiPath(e.target.value)} placeholder="/composite-pipelines" />
        </Col>
        <Col xs={24} md={6}>
          <Typography.Text type="secondary">File Path</Typography.Text>
          <Input size="small" value={filePath} onChange={(e) => setFilePath(e.target.value)} placeholder="/files" />
        </Col>
        <Col xs={24} md={6}>
          <Typography.Text type="secondary">Enabled</Typography.Text>
          <div><Switch checked={enabled} onChange={setEnabled} /></div>
        </Col>
      </Row>
      <Row style={{ marginTop: 8 }}>
        <Col span={24}>
          <Typography.Text type="secondary">Headers (JSON)</Typography.Text>
          <Input.TextArea size="small" autoSize={{ minRows: 2, maxRows: 4 }} value={headers} onChange={(e) => setHeaders(e.target.value)} placeholder='{"X-Plan":"paid"}' />
        </Col>
      </Row>
      <Space style={{ marginTop: 8 }}>
        <Button type="primary" onClick={() => {
          if (!label || !api) return;
          const item: HostConfig = {
            id: `${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            label,
            apiBaseUrl: api,
            fileDownloadBaseUrl: files || api,
            enabled,
            apiPath,
            fileDownloadPath: filePath,
            headers: (() => { try { return headers ? JSON.parse(headers) : {}; } catch { return {}; } })(),
          };
          onAdd(item);
          setLabel(''); setApi(''); setFiles(''); setApiPath('/composite-pipelines'); setFilePath('/files'); setEnabled(true); setHeaders('');
        }}>Add Host</Button>
      </Space>
    </Card>
  );
}


