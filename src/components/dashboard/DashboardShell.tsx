'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, Menu, Settings, ListChecks, RefreshCw, Search, Sun, Moon, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import RuntimeConfigDialog from '@/components/settings/RuntimeConfigDialog';
import { useRuntimeConfig } from '@/lib/runtime-config';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { config } = useRuntimeConfig();

  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem('theme');
    const dark = stored ? stored === 'dark' : root.classList.contains('dark');
    setIsDark(dark);
    root.classList.toggle('dark', dark);
  }, []);

  // sync local query with URL
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
  }, [searchParams]);

  // debounce update URL when query changes locally
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) params.set('q', query);
      else params.delete('q');
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    const root = document.documentElement;
    root.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <div className={cn(
      /* layout */ 'min-h-screen',
      /* surface */ 'bg-background text-foreground'
    )}>
      {/* Topbar */}
      <header className={cn(
        /* position */ 'sticky top-0 z-40',
        /* surface */ 'border-b bg-background/80 backdrop-blur'
      )}>
        <div className={cn(
          /* layout */ 'flex items-center justify-between',
          /* sizing */ 'h-14',
          /* spacing */ 'px-4'
        )}>
          <div className={cn('flex items-center gap-3')}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              <Menu className={cn('h-5 w-5')} />
            </Button>
            <div className={cn('flex items-center gap-2')}>
              <Activity className={cn('h-5 w-5 text-primary')} />
              <span className={cn('font-semibold')}>Eduspace Pipeline</span>
            </div>
          </div>

          <div className={cn('hidden md:flex items-center gap-2 max-w-lg w-full')}> 
            <div className={cn(
              /* layout */ 'relative flex-1'
            )}>
              <Search className={cn(
                /* position */ 'absolute left-2 top-1/2 -translate-y-1/2',
                /* sizing */ 'h-4 w-4',
                /* color */ 'text-muted-foreground'
              )} />
              <input
                placeholder="Search executions, steps..."
                className={cn(
                  /* layout */ 'w-full',
                  /* spacing */ 'pl-8 pr-3 py-2',
                  /* surface */ 'bg-background border',
                  /* radius */ 'rounded-md',
                  /* text */ 'text-sm',
                  /* focus */ 'outline-none ring-0 focus:border-primary'
                )}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className={cn('flex items-center gap-1')}>
            {/* Global plan toggle removed; plan is host-specific via headers */}
            <Button variant="ghost" size="icon" onClick={() => window.location.reload()} title="Refresh">
              <RefreshCw className={cn('h-4 w-4')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
              {isDark ? <Sun className={cn('h-4 w-4')} /> : <Moon className={cn('h-4 w-4')} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} title="Settings">
              <Settings className={cn('h-4 w-4')} />
            </Button>
            <Button variant="outline" size="sm" className={cn('hidden md:inline-flex items-center gap-2')}>
              <User className={cn('h-4 w-4')} />
              <span className={cn('text-xs')}>Admin</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Shell */}
      <div className={cn('flex')}> 
        {/* Sidebar (desktop) */}
        {sidebarOpen && (
          <aside className={cn(
            /* sizing */ 'w-64',
            /* surface */ 'border-r bg-background',
            /* layout */ 'hidden md:block'
          )}>
            <nav className={cn('p-3 space-y-1')}>
              <NavItem icon={<ListChecks className={cn('h-4 w-4')} />} label="Executions" active />
              <NavItem icon={<Activity className={cn('h-4 w-4')} />} label="Live" />
              <NavItem icon={<Settings className={cn('h-4 w-4')} />} label="Settings" />
            </nav>
          </aside>
        )}

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className={cn(
            /* position */ 'fixed inset-0 z-40 md:hidden'
          )}>
            <div
              className={cn('absolute inset-0 bg-black/40')}
              onClick={() => setSidebarOpen(false)}
            />
            <aside className={cn(
              /* position */ 'absolute left-0 top-0 h-full',
              /* sizing */ 'w-64',
              /* surface */ 'bg-background border-r'
            )}>
              <nav className={cn('p-3 space-y-1')}>
                <NavItem icon={<ListChecks className={cn('h-4 w-4')} />} label="Executions" active onClick={() => setSidebarOpen(false)} />
                <NavItem icon={<Activity className={cn('h-4 w-4')} />} label="Live" onClick={() => setSidebarOpen(false)} />
                <NavItem icon={<Settings className={cn('h-4 w-4')} />} label="Settings" onClick={() => setSidebarOpen(false)} />
              </nav>
            </aside>
          </div>
        )}

        {/* Content */}
        <main className={cn(
          /* layout */ 'flex-1',
          /* spacing */ 'p-4 md:p-6',
          /* sizing */ 'w-full'
        )}>
          <div className={cn(
            /* layout */ 'mx-auto',
            /* sizing */ 'max-w-screen-2xl'
          )}>
            {children}
          </div>
        </main>
      </div>
      <RuntimeConfigDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        /* layout */ 'w-full flex items-center gap-2',
        /* spacing */ 'px-2 py-2',
        /* radius */ 'rounded-md',
        /* surface */ 'hover:bg-muted',
        /* state */ active && 'bg-muted font-medium'
      )}
    >
      {icon}
      <span className={cn('text-sm')}>{label}</span>
    </button>
  );
}

export default DashboardShell;


