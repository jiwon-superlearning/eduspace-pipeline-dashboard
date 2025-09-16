'use client';

import React from 'react';
import { Card, Image, Segmented, Button, Space, Typography, Row, Col, List, Tag } from 'antd';
import KaTeXHtml from '@/components/dashboard/KaTeXHtml';

export type YieldItem = {
  storage_key?: string;
  latency_ms?: number;
  analysis?: {
    question?: string;
    refer?: string | null;
    type?: string;
    choice1?: string | null;
    choice2?: string | null;
    choice3?: string | null;
    choice4?: string | null;
    choice5?: string | null;
  };
};

export default function AdminYieldViewer({
  results,
  getImageUrl,
  executionId,
  durationSeconds,
}: {
  results: YieldItem[];
  getImageUrl: (key: string) => Promise<string>;
  executionId?: string;
  durationSeconds?: number;
}) {
  const [view, setView] = React.useState<'single' | 'grid'>('single');
  const [index, setIndex] = React.useState(0);
  const [urlMap, setUrlMap] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState<Record<string, boolean>>({});

  const storageKeys = React.useMemo(
    () => Array.from(new Set(results.map((r) => r.storage_key).filter(Boolean) as string[])),
    [results]
  );

  const ensureUrl = React.useCallback(
    async (key: string) => {
      if (!key) return;
      if (urlMap[key] || loading[key]) return;
      setLoading((m) => ({ ...m, [key]: true }));
      try {
        const url = await getImageUrl(key);
        setUrlMap((m) => ({ ...m, [key]: url }));
      } finally {
        setLoading((m) => ({ ...m, [key]: false }));
      }
    },
    [getImageUrl, urlMap, loading]
  );

  React.useEffect(() => {
    if (view !== 'single') return;
    const keys = [storageKeys[index], storageKeys[index + 1], storageKeys[index - 1]].filter(Boolean) as string[];
    keys.forEach((k) => void ensureUrl(k));
  }, [view, index, storageKeys, ensureUrl]);

  const Analysis = ({ a }: { a: YieldItem['analysis'] }) => {
    const choices = [a?.choice1, a?.choice2, a?.choice3, a?.choice4, a?.choice5, (a as any)?.choice6]
      .filter(Boolean) as string[];
    const circled = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
    return (
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {a?.type && <Tag color="blue">{a.type}</Tag>}
        {a?.question && (
          <KaTeXHtml html={a.question} />
        )}
        {a?.refer && (
          <KaTeXHtml html={a.refer} />
        )}
        {choices.length > 0 && (
          <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>
            {choices.map((c, i) => (
              <li key={i}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <Typography.Text strong>{circled[i] || `${i + 1}.`}</Typography.Text>
                  <div style={{ flex: 1 }}>
                    <KaTeXHtml html={c} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Space>
    );
  };

  if (!results || results.length === 0) {
    return <Typography.Text type="secondary">No results</Typography.Text>;
  }

  if (view === 'grid') {
    return (
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Segmented
          options={[{ label: 'Single', value: 'single' }, { label: 'Grid', value: 'grid' }]}
          value={view}
          onChange={(v) => setView(v as any)}
        />
        <List
          grid={{ gutter: 12, xs: 1, sm: 2, lg: 3 }}
          dataSource={results}
          renderItem={(item) => {
            const key = item.storage_key || '';
            void ensureUrl(key);
            return (
              <List.Item>
                <Card size="small" hoverable>
                  <Image src={urlMap[key]} alt={key} height={160} style={{ objectFit: 'contain' }} />
                  <div style={{ marginTop: 8 }}>
                    <Analysis a={item.analysis} />
                  </div>
                </Card>
              </List.Item>
            );
          }}
        />
      </Space>
    );
  }

  const item = results[index];
  const key = item?.storage_key || '';
  void ensureUrl(key);

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Row align="middle" justify="space-between">
        <Col>
          <Segmented
            options={[{ label: 'Single', value: 'single' }, { label: 'Grid', value: 'grid' }]}
            value={view}
            onChange={(v) => setView(v as any)}
          />
        </Col>
        <Col>
          <Space>
            <Typography.Text type="secondary">
              {index + 1} / {results.length}
            </Typography.Text>
            <Button size="small" onClick={() => setIndex((i) => Math.max(0, i - 1))}>Prev</Button>
            <Button size="small" type="primary" onClick={() => setIndex((i) => Math.min(results.length - 1, i + 1))}>Next</Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col xs={24} md={12}>
          <Card size="small">
            <Image src={urlMap[key]} alt={key} height={340} style={{ objectFit: 'contain', width: '100%' }} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small">
            <Analysis a={item?.analysis} />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}


