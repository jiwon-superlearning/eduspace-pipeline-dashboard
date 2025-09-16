'use client';

import { Refine } from '@refinedev/core';
import { ConfigProvider, App as AntdApp, Layout, Menu } from 'antd';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ReactNode, Suspense } from 'react';
import { dataProvider } from '@/lib/refine-data-provider';
import routerProvider from '@refinedev/nextjs-router/app';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <AntdApp>
        <Suspense fallback={<div />}> 
          <Refine
            dataProvider={dataProvider}
            routerProvider={routerProvider}
            resources={[
              {
                name: 'executions',
                list: '/admin/executions',
                show: '/admin/executions/show/:id',
              },
            ]}
            options={{ syncWithLocation: true }}
          >
            <Layout style={{ minHeight: '100vh' }}>
              <Layout.Sider>
                <div style={{ height: 48, margin: 16, background: 'rgba(255,255,255,0.2)', borderRadius: 6 }} />
                <Menu theme="dark" mode="inline"
                  items={[
                    { key: 'dashboard', label: <Link href="/admin/dashboard">Dashboard</Link> },
                    { key: 'executions', label: <Link href="/admin/executions">Executions</Link> },
                    { key: 'settings', label: <Link href="/admin/settings">Settings</Link> },
                  ]}
                />
              </Layout.Sider>
              <Layout>
                <Layout.Header style={{ background: 'transparent' }} />
                <Layout.Content style={{ padding: 16 }}>
                  {children}
                </Layout.Content>
              </Layout>
            </Layout>
          </Refine>
        </Suspense>
      </AntdApp>
    </ConfigProvider>
  );
}

export const dynamic = 'force-dynamic';


