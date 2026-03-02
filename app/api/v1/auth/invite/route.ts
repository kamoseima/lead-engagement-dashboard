/**
 * POST /api/v1/auth/invite
 *
 * Admin-only endpoint to invite a new user via email.
 * Creates the auth user and dashboard_users record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { failure, mapErrorToHttpStatus, toApiResponse, success } from '@/lib/shared/result';
import type { UserRole } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    // Verify caller is authenticated admin
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      const result = failure('UNAUTHORIZED', 'Not authenticated');
      return NextResponse.json(toApiResponse(result), { status: 401 });
    }

    const userId = authUser.id;
    const { data: caller } = await supabase
      .from('dashboard_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!caller || caller.role !== 'admin') {
      const result = failure('FORBIDDEN', 'Admin access required');
      return NextResponse.json(toApiResponse(result), { status: 403 });
    }

    // Parse request
    const body = await request.json() as { email?: string; role?: UserRole };

    if (!body.email) {
      const result = failure('VALIDATION_ERROR', 'Email is required');
      return NextResponse.json(toApiResponse(result), { status: 400 });
    }

    const role: UserRole = body.role === 'admin' ? 'admin' : 'agent';

    // Invite user via Supabase Admin API
    const adminClient = createAdminClient();

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      body.email,
      {
        data: { role, org_id: caller.org_id, invited_by: userId },
        redirectTo: `${request.nextUrl.origin}/auth/accept-invite`,
      }
    );

    if (inviteError) {
      const result = failure('PROVIDER_ERROR', inviteError.message);
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus('PROVIDER_ERROR') });
    }

    // Create dashboard_users record
    if (inviteData.user) {
      await adminClient.from('dashboard_users').insert({
        id: inviteData.user.id,
        email: body.email,
        role,
        org_id: caller.org_id,
        invited_by: userId,
      });
    }

    return NextResponse.json(
      toApiResponse(success({ email: body.email, role })),
      { status: 201 }
    );
  } catch (error) {
    const result = failure(
      'INTERNAL_ERROR',
      `Failed to invite user: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(toApiResponse(result), { status: 500 });
  }
}
