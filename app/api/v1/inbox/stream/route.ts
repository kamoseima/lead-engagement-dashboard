/**
 * GET /api/v1/inbox/stream — SSE proxy to platform conversations stream
 *
 * Authenticates the user, resolves org_id, then pipes the platform SSE stream through.
 */

import { getCurrentUser } from '@/lib/auth/roles';
import { platformApiStream } from '@/lib/platform-api';

export async function GET() {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const orgId = userResult.data.org_id;

  try {
    const upstream = await platformApiStream(
      `/api/v1/orgs/${orgId}/conversations/stream`
    );

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'Failed to connect to stream' }), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!upstream.body) {
      return new Response(JSON.stringify({ error: 'No stream body' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Stream connection failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
