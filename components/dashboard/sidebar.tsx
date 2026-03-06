'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Inbox,
  FileText,
  GitBranch,
  Megaphone,
  FlaskConical,
  ScrollText,
  Users,
  BarChart3,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Inbox', href: '/inbox', icon: Inbox },
  { label: 'Templates', href: '/templates', icon: FileText, adminOnly: true },
  { label: 'Flows', href: '/flows', icon: GitBranch, adminOnly: true },
  { label: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Testing', href: '/testing', icon: FlaskConical, adminOnly: true },
  { label: 'Webhooks', href: '/webhook-events', icon: ScrollText, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

interface SidebarProps {
  userRole: UserRole;
  userEmail: string;
  displayName?: string | null;
}

export function Sidebar({ userRole, userEmail, displayName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const visibleItems = navItems.filter(
    item => !item.adminOnly || userRole === 'admin'
  );

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-card transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center border-b border-border px-3 py-[14px]">
        {collapsed ? (
          <div className="flex w-full justify-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white overflow-hidden">
              <Image src="/logo.jpg" alt="FibreCompare" width={32} height={32} className="object-contain" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white overflow-hidden">
              <Image src="/logo.jpg" alt="FibreCompare" width={32} height={32} className="object-contain" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
                FibreCompare
              </span>
              <span className="text-sm font-bold tracking-tight">
                Lead Engage
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {visibleItems.map(item => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-md text-sm font-medium transition-colors',
                collapsed
                  ? 'justify-center px-2 py-2.5'
                  : 'gap-3 px-3 py-2',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-2 py-2 space-y-0.5">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            'flex w-full items-center rounded-md py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            collapsed ? 'justify-center px-2' : 'gap-3 px-3'
          )}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          {!collapsed && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className={cn(
            'flex w-full items-center rounded-md py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            collapsed ? 'justify-center px-2' : 'gap-3 px-3'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              Collapse
            </>
          )}
        </button>
      </div>

      {/* User section */}
      <div className="border-t border-border px-2 py-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {(displayName || userEmail)[0].toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {(displayName || userEmail)[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {displayName || userEmail.split('@')[0]}
              </p>
              <p className="truncate text-[11px] capitalize text-muted-foreground">
                {userRole}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
