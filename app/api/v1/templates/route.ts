/**
 * GET  /api/v1/templates — List templates from the platform API
 * POST /api/v1/templates — Create/deploy a template (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/lib/auth/roles';
import { listTemplates, createTemplate, type CreateTemplateInput } from '@/services/templates/template.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function GET() {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const result = await listTemplates(userResult.data.org_id);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }

  return NextResponse.json(toApiResponse(result));
}

export async function POST(request: NextRequest) {
  const userResult = await requireRole('admin');
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  try {
    const body = (await request.json()) as CreateTemplateInput;
    const result = await createTemplate(userResult.data.org_id, body);

    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result), { status: 201 });
  } catch {
    return NextResponse.json(toApiResponse(failure('INTERNAL_ERROR', 'Failed to create template')), { status: 500 });
  }
}
