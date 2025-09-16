'use client';

import { useShow } from '@refinedev/core';
import { Card, Descriptions, Tag, Typography, Table, Button, Row, Col, Empty, Modal, Spin } from 'antd';
import React, { Suspense } from 'react';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { AdminOutputPreview } from '@/app/admin/components/AdminOutputPreview';
import { PDFViewer } from '@/components/dashboard/PDFViewer';
import { apiClient } from '@/lib/api-client';
import AdminYieldViewer from '@/app/admin/executions/components/AdminYieldViewer';

export default function ExecutionShowPage() {
  const { query } = useShow({ resource: 'executions' });
  const record = query?.data?.data;
  const router = useRouter();
  const firstPdfKey = (() => {
    if (!record?.steps) return undefined;
    for (const s of record.steps) {
      const outputs = Array.isArray(s.output_keys) ? s.output_keys : [];
      const outPdf = outputs.find((k) => typeof k === 'string' && k.toLowerCase().endsWith('.pdf'));
      if (outPdf) return outPdf as string;
      const inputs = Array.isArray(s.input_keys) ? s.input_keys : [] as string[];
      const inPdf = inputs.find((k) => typeof k === 'string' && k.toLowerCase().endsWith('.pdf'));
      if (inPdf) return inPdf as string;
    }
    return undefined;
  })();

  const formatDuration = (totalSeconds?: number) => {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) return '-';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
  };

  // Yield check modal state
  const [yieldOpen, setYieldOpen] = React.useState(false);
  const [yieldLoading, setYieldLoading] = React.useState(false);
  const [yieldResults, setYieldResults] = React.useState<any[]>([]);
  const [yieldError, setYieldError] = React.useState<string | null>(null);

  const findLastJsonKey = React.useCallback((): string | undefined => {
    if (!record?.steps) return undefined;
    const preference = ['vlm_results', 'results', 'analysis', 'final'];
    const isJson = (k?: string) => typeof k === 'string' && k.toLowerCase().endsWith('.json');
    const score = (k: string) => {
      const lower = k.toLowerCase();
      for (let i = 0; i < preference.length; i++) {
        if (lower.includes(preference[i])) return preference.length - i;
      }
      return 0;
    };
    const steps = [...record.steps];
    for (let i = steps.length - 1; i >= 0; i--) {
      const s: any = steps[i];
      const outs: string[] = Array.isArray(s.output_keys) ? s.output_keys.filter(isJson) : [];
      if (outs.length > 0) {
        outs.sort((a, b) => score(b) - score(a));
        return outs[0];
      }
      const ins: string[] = Array.isArray(s.input_keys) ? s.input_keys.filter(isJson) : [];
      if (ins.length > 0) {
        ins.sort((a, b) => score(b) - score(a));
        return ins[0];
      }
    }
    return undefined;
  }, [record?.steps]);

  const openYield = async () => {
    setYieldOpen(true);
    setYieldLoading(true);
    setYieldError(null);
    try {
      const jsonKey = findLastJsonKey();
      if (!jsonKey) {
        setYieldError('JSON 결과 파일을 찾을 수 없습니다.');
        setYieldResults([]);
        return;
      }
      const data = await apiClient.getFileJson(jsonKey, (record?.host_api_base_url && record?.host_file_base_url)
        ? ({ id: record?.host_id, label: record?.host_label, apiBaseUrl: record?.host_api_base_url, fileDownloadBaseUrl: record?.host_file_base_url, enabled: true } as any)
        : undefined);
      const extractVlm = (o: any): any[] => {
        if (!o) return [];
        if (Array.isArray(o)) return o as any[];
        if (typeof o !== 'object') return [];
        if (Array.isArray((o as any).vlm_results)) return (o as any).vlm_results as any[];
        if (Array.isArray((o as any).results)) return (o as any).results as any[];
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
            if (Array.isArray((val as any).results)) return (val as any).results as any[];
          }
        }
        return [];
      };
      const results = extractVlm(data);
      if (!results.length) {
        setYieldError('수율 데이터를 찾을 수 없습니다.');
        setYieldResults([]);
      } else {
        setYieldResults(results);
      }
    } catch (e: any) {
      setYieldError(e?.message || '알 수 없는 오류');
      setYieldResults([]);
    } finally {
      setYieldLoading(false);
    }
  };

  return (
    <Suspense fallback={<div />}>
      <Row gutter={16} style={{ height: 'calc(100vh - 120px)' }}>
        <Col xs={24} lg={14} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Card loading={query?.isLoading} bodyStyle={{ display: 'flex', flexDirection: 'column' }} style={{ height: '100%' }}>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <Button onClick={() => router.push('/admin/executions')}>{'← Back to Executions'}</Button>
              <Button type="primary" disabled={record?.status !== 'completed'} onClick={openYield}>수율 체크</Button>
            </div>
            <Typography.Title level={3}>Execution Detail</Typography.Title>
            {record && (
              <Descriptions bordered column={1} size="middle">
                <Descriptions.Item label="Execution ID">{record.execution_id}</Descriptions.Item>
                <Descriptions.Item label="Name">{record.name}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={record.status === 'running' ? 'blue' : record.status === 'completed' ? 'green' : record.status === 'failed' ? 'red' : 'default'}>
                    {record.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Overall Progress">{record.overall_progress}</Descriptions.Item>
                <Descriptions.Item label="Duration">{formatDuration(record.duration_seconds)}</Descriptions.Item>
                <Descriptions.Item label="Created At">{dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              </Descriptions>
            )}
            {record?.steps && (
              <div style={{ marginTop: 16, overflow: 'auto' }}>
                <Typography.Title level={4}>Steps</Typography.Title>
                <Table
                  size="small"
                  rowKey={(r: any) => r.step_id}
                  dataSource={record.steps}
                  columns={[
                    { title: 'Step', dataIndex: 'name' },
                    { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'running' ? 'blue' : v === 'completed' ? 'green' : v === 'failed' ? 'red' : 'default'}>{v}</Tag> },
                    { title: 'Progress', dataIndex: 'progress' },
                    { title: 'Started', dataIndex: 'started_at', render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-' },
                    { title: 'Completed', dataIndex: 'completed_at', render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-' },
                    { title: 'Jobs', dataIndex: 'job_ids', render: (arr: string[]) => Array.isArray(arr) ? arr.length : 0 },
                    { title: 'Outputs', dataIndex: 'output_keys', render: (arr: string[]) => Array.isArray(arr) ? arr.length : 0 },
                  ]}
                  pagination={false}
                  expandable={{
                    expandedRowRender: (row: any) => (
                      <div style={{ background: 'transparent' }}>
                        <AdminOutputPreview
                          outputKeys={Array.isArray(row.output_keys) ? row.output_keys : []}
                          getDownloadUrl={(key) => {
                            // steps에는 host 메타가 없을 수 있으므로 부모 레코드의 host 메타를 우선 사용
                            const hostApi = record?.host_api_base_url || row.host_api_base_url;
                            const hostFiles = record?.host_file_base_url || row.host_file_base_url;
                            const hostId = record?.host_id || row.host_id;
                            const hostLabel = record?.host_label || row.host_label;
                            if (hostApi && hostFiles) {
                              return apiClient.getFileUrlFromHost({
                                id: hostId,
                                label: hostLabel,
                                apiBaseUrl: hostApi,
                                fileDownloadBaseUrl: hostFiles,
                                enabled: true,
                              } as any, key);
                            }
                            return apiClient.getFileUrl(key);
                          }}
                        />
                      </div>
                    ),
                    rowExpandable: (row: any) => Array.isArray(row.output_keys) && row.output_keys.length > 0,
                  }}
                />
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Card bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} style={{ height: '100%' }}>
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {firstPdfKey ? (
                <PDFViewer
                  fileKey={firstPdfKey}
                  fileName={firstPdfKey.split('/').pop() || 'document.pdf'}
                  height={'100%'}
                  getDownloadUrl={(key) => {
                    if (record?.host_api_base_url && record?.host_file_base_url) {
                      return apiClient.getFileUrlFromHost({
                        id: record.host_id,
                        label: record.host_label,
                        apiBaseUrl: record.host_api_base_url,
                        fileDownloadBaseUrl: record.host_file_base_url,
                        enabled: true,
                      } as any, key);
                    }
                    return apiClient.getFileUrl(key);
                  }}
                />
              ) : (
                <Empty description="No PDF output found" />)
              }
            </div>
          </Card>
        </Col>
      </Row>
      <Modal open={yieldOpen} onCancel={() => setYieldOpen(false)} width={1000} footer={null} title="수율 체크">
        {yieldLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
            <Spin />
          </div>
        ) : yieldError ? (
          <Empty description={yieldError} />
        ) : (
          <AdminYieldViewer
            results={yieldResults}
            executionId={record?.execution_id}
            durationSeconds={record?.duration_seconds}
            getImageUrl={async (k) => {
              if (record?.host_api_base_url && record?.host_file_base_url) {
                return apiClient.getFileUrlFromHost({
                  id: record?.host_id,
                  label: record?.host_label,
                  apiBaseUrl: record?.host_api_base_url,
                  fileDownloadBaseUrl: record?.host_file_base_url,
                  enabled: true,
                } as any, k);
              }
              return apiClient.getFileUrl(k);
            }}
          />
        )}
      </Modal>
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';


