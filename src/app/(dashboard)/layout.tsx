export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    // Keep existing dashboard shell only for dashboard route group
    <>{children}</>
  );
}


