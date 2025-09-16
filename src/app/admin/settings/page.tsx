'use client';

import { Card, Tabs, Typography } from 'antd';
import React from 'react';
import AdminRuntimeConfigTab from './AdminRuntimeConfigTab';

export default function SettingsPage() {
  return (
    <div style={{ background: '#f5f5f5', padding: 16, minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Card>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>Settings</Typography.Title>
        </Card>
        <div style={{ height: 12 }} />
        <Card>
          <Tabs
            defaultActiveKey="runtime"
            items={[
              { key: 'runtime', label: 'Runtime Config', children: <AdminRuntimeConfigTab /> },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';


