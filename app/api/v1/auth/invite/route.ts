/**
 * POST /api/v1/auth/invite
 *
 * Admin-only endpoint to invite a new user via email.
 * Creates the auth user, generates an invite link, and sends
 * a custom HTML email via SendGrid.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { failure, mapErrorToHttpStatus, toApiResponse, success } from '@/lib/shared/result';
import { sendInviteEmail } from '@/lib/email/send-invite-email';
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
    const adminClient = createAdminClient();
    // APP_URL is a server-side runtime var (no NEXT_PUBLIC_ prefix) so it is
    // never baked into the build and always reflects the correct deployed origin.
    const appUrl = process.env.APP_URL || request.nextUrl.origin;
    const redirectTo = `${appUrl}/auth/accept-invite`;

    // Generate invite link without sending email
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: body.email,
      options: {
        data: { role, org_id: caller.org_id, invited_by: userId },
        redirectTo,
      },
    });

    if (linkError) {
      const result = failure('PROVIDER_ERROR', linkError.message);
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus('PROVIDER_ERROR') });
    }

    // Create dashboard_users record
    if (linkData.user) {
      await adminClient.from('dashboard_users').insert({
        id: linkData.user.id,
        email: body.email,
        role,
        org_id: caller.org_id,
        invited_by: userId,
      });
    }

    // Send custom invite email
    const inviterName = caller.display_name || caller.email;
    const inviteUrl = linkData.properties.action_link;

    await sendInviteEmail({
      to: body.email,
      inviteUrl,
      inviterName,
      role,
    });

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
