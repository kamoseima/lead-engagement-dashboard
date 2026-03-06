/**
 * DELETE /api/v1/auth/users/{userId}
 *
 * Admin-only endpoint to remove a user from the system.
 * Deletes the Supabase Auth user, which cascades to dashboard_users
 * and all child tables (preferences, pins, drafts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { failure, toApiResponse, success } from '@/lib/shared/result';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Verify caller is authenticated admin
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(toApiResponse(failure('UNAUTHORIZED', 'Not authenticated')), { status: 401 });
    }

    const { data: caller } = await supabase
      .from('dashboard_users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!caller || caller.role !== 'admin') {
      return NextResponse.json(toApiResponse(failure('FORBIDDEN', 'Admin access required')), { status: 403 });
    }

    // Prevent self-deletion
    if (userId === authUser.id) {
      return NextResponse.json(
        toApiResponse(failure('VALIDATION_ERROR', 'Cannot remove yourself')),
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify target user exists and is in the same org
    const { data: targetUser, error: lookupError } = await adminClient
      .from('dashboard_users')
      .select('id, email, org_id')
      .eq('id', userId)
      .single();

    if (lookupError || !targetUser) {
      return NextResponse.json(toApiResponse(failure('NOT_FOUND', 'User not found')), { status: 404 });
    }

    if (targetUser.org_id !== caller.org_id) {
      return NextResponse.json(
        toApiResponse(failure('FORBIDDEN', 'Cannot remove users from a different organization')),
        { status: 403 }
      );
    }

    // NULL out invited_by references pointing to this user (self-referencing FK)
    await adminClient
      .from('dashboard_users')
      .update({ invited_by: null })
      .eq('invited_by', userId);

    // Delete the auth user — cascades to dashboard_users and child tables
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json(
        toApiResponse(failure('PROVIDER_ERROR', `Failed to delete user: ${deleteError.message}`)),
        { status: 500 }
      );
    }

    return NextResponse.json(toApiResponse(success({ removed: true, email: targetUser.email })));
  } catch (error) {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', `Failed to remove user: ${error instanceof Error ? error.message : String(error)}`)),
      { status: 500 }
    );
  }
}
