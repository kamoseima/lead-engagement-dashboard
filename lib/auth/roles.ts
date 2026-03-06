/**
 * Role-based Access Control
 *
 * Utilities for checking user roles and permissions.
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { DashboardUser, UserRole } from '@/types/database';
import { failure, type StepResult } from '@/lib/shared/result';

export async function getCurrentUser(): Promise<StepResult<DashboardUser>> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return failure('UNAUTHORIZED', 'Not authenticated');
  }

  // Use admin client to bypass RLS (avoids self-referential policy recursion).
  const admin = createAdminClient();
  const { data: user, error } = await admin
    .from('dashboard_users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error || !user) {
    return failure('NOT_FOUND', 'User profile not found');
  }

  return { success: true, data: user as DashboardUser };
}

export async function requireRole(role: UserRole): Promise<StepResult<DashboardUser>> {
  const result = await getCurrentUser();
  if (!result.success) return result;

  if (result.data.role !== role && role === 'admin') {
    return failure('FORBIDDEN', 'Admin access required');
  }

  return result;
}

export function isAdmin(user: DashboardUser): boolean {
  return user.role === 'admin';
}

export function canAccessPage(user: DashboardUser, page: string): boolean {
  const adminOnlyPages = ['/templates', '/flows', '/testing', '/settings', '/webhook-events'];

  if (adminOnlyPages.some(p => page.startsWith(p))) {
    return user.role === 'admin';
  }

  return true;
}
