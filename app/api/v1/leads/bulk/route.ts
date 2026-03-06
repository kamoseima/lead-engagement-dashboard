/**
 * Leads Bulk API
 *
 * POST /api/v1/leads/bulk — Bulk actions (move stage, add tag)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { bulkUpdateStage, bulkAddTag } from '@/services/leads/lead.service';
import { toApiResponse, mapErrorToHttpStatus } from '@/lib/shared/result';

export async function POST(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const body = await request.json();
  const { action, lead_ids, value } = body;

  if (!action || !lead_ids?.length || !value) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'action, lead_ids, and value are required' } },
      { status: 400 }
    );
  }

  let result;
  switch (action) {
    case 'move_stage':
      result = await bulkUpdateStage(lead_ids, value);
      break;
    case 'add_tag':
      result = await bulkAddTag(lead_ids, value);
      break;
    default:
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `Unknown action: ${action}` } },
        { status: 400 }
      );
  }

  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }
  return NextResponse.json(toApiResponse(result));
}
