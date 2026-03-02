'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Users, Shield, User } from 'lucide-react';
import type { DashboardUser, UserRole } from '@/types/database';

export default function SettingsPage() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('agent');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [teamMembers, setTeamMembers] = useState<DashboardUser[]>([]);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('dashboard_users')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setTeamMembers(data as DashboardUser[]);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteMessage(null);

    try {
      const response = await fetch('/api/v1/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to send invite');
      }

      setInviteMessage({ type: 'success', text: `Invite sent to ${inviteEmail}` });
      setInviteEmail('');
      loadTeamMembers();
    } catch (err: unknown) {
      setInviteMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send invite',
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage team members and application settings.
        </p>
      </div>

      {/* Invite User */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Invite Team Member</h2>
        </div>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="grid min-w-[250px] flex-1 gap-2">
            <Label htmlFor="inviteEmail">Email Address</Label>
            <Input
              id="inviteEmail"
              type="email"
              placeholder="colleague@company.com"
              required
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inviteRole">Role</Label>
            <select
              id="inviteRole"
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as UserRole)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" disabled={isInviting}>
            {isInviting ? 'Sending...' : 'Send Invite'}
          </Button>
        </form>
        {inviteMessage && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              inviteMessage.type === 'success'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {inviteMessage.text}
          </p>
        )}
      </div>

      {/* Team Members */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Team Members</h2>
        </div>
        <div className="space-y-2">
          {teamMembers.map(member => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {member.role === 'admin' ? (
                    <Shield className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {member.display_name || member.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  member.role === 'admin'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {member.role}
              </span>
            </div>
          ))}
          {teamMembers.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No team members yet. Invite someone to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
