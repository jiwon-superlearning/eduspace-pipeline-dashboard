'use client';

import React from 'react';
import { useList, useGo } from '@refinedev/core';
import { Card, Table, Tag, Typography, Input, Select, Space, Progress, Segmented } from 'antd';
import dayjs from 'dayjs';
import { Suspense } from 'react';

export default function ExecutionsListPage() {
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'running' | 'completed' | 'failed' | 'pending'>('all');
  const [search, setSearch] = React.useState('');

  const { query } = useList({
    resource: 'executions',
    filters: statusFilter !== 'all'
      ? [
          {
            field: 'status',
            operator: 'eq',
            value: statusFilter,
          } as any,
        ]
      : [],
  });
  const rows = query.data?.data ?? [];
  const isLoading = query.isLoading;
  const go = useGo();

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

  const pickHostColor = (key?: string) => {
    const palette = ['magenta','red','volcano','orange','gold','lime','green','cyan','blue','geekblue','purple'];
    if (!key) return 'default' as const;
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length] as any;
  };

  return (
    <Suspense fallback={<div />}>
      <Card>
        <Typography.Title level={3}>Executions</Typography.Title>
        <Space style={{ marginBottom: 12 }} wrap>
          <Segmented
            options={[
              { label: 'All', value: 'all' },
              { label: 'running', value: 'running' },
              { label: 'completed', value: 'completed' },
              { label: 'failed', value: 'failed' },
              { label: 'pending', value: 'pending' },
            ]}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
          />
          <Input.Search
            placeholder="Search by ID or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => { /* client-side filter only */ }}
            style={{ width: 240 }}
          />
        </Space>
        <Table
          loading={isLoading}
          rowKey="id"
          dataSource={rows.filter((r: any) => {
            if (search) {
              const s = search.toLowerCase();
              return String(r.execution_id).toLowerCase().includes(s) || String(r.name || '').toLowerCase().includes(s);
            }
            return true;
          })}
          pagination={{ pageSize: 20 }}
          onRow={(record) => ({
            onClick: () => {
              const rid = (record as any).id ?? (record as any).execution_id;
              go({ to: { resource: 'executions', action: 'show', id: String(rid) } });
            },
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'ID', dataIndex: 'execution_id', key: 'id' },
            { title: 'Name', dataIndex: 'name' },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (value: string) => <Tag color={value === 'running' ? 'blue' : value === 'completed' ? 'green' : value === 'failed' ? 'red' : 'default'}>{value}</Tag>,
            },
            { title: 'Host', key: 'host', render: (_: any, row: any) => {
                const text = row.host_label || row.host_id || '-';
                const color = pickHostColor(text);
                return <Tag color={color}>{text}</Tag>;
              }
            },
            { title: 'Progress', dataIndex: 'overall_progress', render: (v: number) => <Progress percent={Math.round(Number(v) || 0)} size="small" /> },
            { title: 'Duration', key: 'duration', render: (_: any, row: any) => formatDuration(row.duration_seconds) },
            {
              title: 'Created At',
              dataIndex: 'created_at',
              render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
              sorter: (a: any, b: any) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
              defaultSortOrder: 'descend',
              sortDirections: ['descend', 'ascend'],
            },
          ]}
        />
      </Card>
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';


