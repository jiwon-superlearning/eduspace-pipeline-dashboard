import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div />}>{children}</Suspense>
  );
}


