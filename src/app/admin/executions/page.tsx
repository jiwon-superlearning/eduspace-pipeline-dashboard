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

  // Host별 평균 duration 및 대기열 기반 ETA 계산
  const hostStats = React.useMemo(() => {
    type Stat = {
      avgDurationSec: number;
      runningCount: number;
      pendingSorted: any[];
    };
    const byHost = new Map<string, Stat>();
    const globalDurations: number[] = [];

    // 1) 1차 통계 수집
    for (const r of rows as any[]) {
      const hostKey = String(r.host_id || r.host_label || '');
      if (!byHost.has(hostKey)) byHost.set(hostKey, { avgDurationSec: 0, runningCount: 0, pendingSorted: [] });
      const st = byHost.get(hostKey)!;
      if (r.status === 'running') st.runningCount += 1;
      if (r.status === 'pending') st.pendingSorted.push(r);
      if (r.status === 'completed' && typeof r.duration_seconds === 'number' && r.duration_seconds > 0) {
        globalDurations.push(r.duration_seconds);
        // 임시로 avg를 누적합 방식으로 저장 (마지막에 평균 계산)
        st.avgDurationSec = (st.avgDurationSec || 0) + r.duration_seconds;
      }
    }

    const globalAvg = globalDurations.length > 0
      ? Math.round(globalDurations.reduce((a, b) => a + b, 0) / globalDurations.length)
      : 600; // fallback 10분

    // 2) host별 평균 확정 및 pending 정렬
    for (const [hostKey, st] of byHost.entries()) {
      if (st.pendingSorted.length > 1) {
        st.pendingSorted.sort((a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf());
      }
      if (st.avgDurationSec > 0) {
        // avgDurationSec가 누적합이므로 completed 개수로 나눠야 하나, 개수를 모르니 rows에서 다시 세기
        const completedForHost = (rows as any[]).filter((r) => r.host_id === hostKey && r.status === 'completed' && typeof r.duration_seconds === 'number' && r.duration_seconds > 0);
        st.avgDurationSec = Math.round(st.avgDurationSec / Math.max(1, completedForHost.length));
      } else {
        st.avgDurationSec = globalAvg;
      }
    }

    return byHost;
  }, [rows]);

  const getEtaStart = (row: any): string => {
    if (!row || row.status !== 'pending') return '-';
    const hostKey = String(row.host_id || row.host_label || '');
    const st = hostStats.get(hostKey);
    if (!st) return '-';
    const concurrency = 2;
    const slotsAvailable = Math.max(0, concurrency - st.runningCount);
    const idx = st.pendingSorted.findIndex((r) => r.execution_id === row.execution_id);
    if (idx < 0) return '-';
    const avg = Math.max(60, st.avgDurationSec || 600); // 최소 1분
    if (idx < slotsAvailable) {
      return `${dayjs().tz('Asia/Seoul').format('HH:mm')} KST (≈now)`;
    }
    const remaining = idx - slotsAvailable;
    const batchesAhead = Math.floor(remaining / concurrency) + 1;
    const eta = dayjs().tz('Asia/Seoul').add(batchesAhead * avg, 'second');
    return `${eta.format('HH:mm')} KST (≈${Math.round((batchesAhead * avg) / 60)}m)`;
  };

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
            { title: 'ETA (Start)', key: 'eta_start', render: (_: any, row: any) => getEtaStart(row) },
            {
              title: 'Created At',
              dataIndex: 'created_at',
              render: (v: string) => dayjs(v).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss [KST]'),
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


