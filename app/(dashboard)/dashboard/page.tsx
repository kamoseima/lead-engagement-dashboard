'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  GitBranch,
  Megaphone,
  FlaskConical,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  flows: number;
  campaigns: number;
  sends: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ flows: 0, campaigns: 0, sends: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [flowsRes, campaignsRes] = await Promise.all([
        fetch('/api/v1/flows'),
        fetch('/api/v1/campaigns'),
      ]);
      const flowsJson = await flowsRes.json();
      const campaignsJson = await campaignsRes.json();

      setStats({
        flows: flowsJson.success ? flowsJson.data.length : 0,
        campaigns: campaignsJson.success ? campaignsJson.data.length : 0,
        sends: 0,
      });
    } catch {
      // stats will show 0
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { label: 'Flows', value: stats.flows, icon: GitBranch, color: 'text-purple-400' },
    { label: 'Campaigns', value: stats.campaigns, icon: Megaphone, color: 'text-primary' },
    { label: 'Messages Sent', value: stats.sends, icon: MessageSquare, color: 'text-green-400' },
  ];

  const quickActions = [
    { label: 'New Template', href: '/templates', icon: FileText },
    { label: 'Create Flow', href: '/flows', icon: GitBranch },
    { label: 'Launch Campaign', href: '/campaigns', icon: Megaphone },
    { label: 'Run Test', href: '/testing', icon: FlaskConical },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your lead engagement activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(stat => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold">
                {isLoading ? '—' : stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{action.label}</span>
                <TrendingUp className="ml-auto h-3 w-3 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
