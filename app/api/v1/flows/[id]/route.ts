/**
 * GET    /api/v1/flows/:id — Get a single flow
 * PATCH  /api/v1/flows/:id — Update a flow (admin only)
 * DELETE /api/v1/flows/:id — Delete a flow (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/roles';
import { getFlow, updateFlow, deleteFlow, type UpdateFlowInput } from '@/services/flows/flow.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userResult = await requireRole('admin');
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { id } = await params;
  const result = await getFlow(id);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }

  return NextResponse.json(toApiResponse(result));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userResult = await requireRole('admin');
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateFlowInput;
    const result = await updateFlow(id, body);

    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result));
  } catch {
    return NextResponse.json(toApiResponse(failure('INTERNAL_ERROR', 'Failed to update flow')), { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userResult = await requireRole('admin');
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { id } = await params;
  const result = await deleteFlow(id);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }

  return NextResponse.json(toApiResponse(result));
}
