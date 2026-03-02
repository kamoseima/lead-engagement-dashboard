/**
 * Platform API Client
 *
 * HTTP client for calling the moludar-comms-platform API.
 * Handles authentication, error mapping, and response parsing.
 */

import { type StepResult, success, failure } from '@/lib/shared/result';

const COMMS_API_BASE_URL = process.env.COMMS_API_BASE_URL || 'http://localhost:3001';
const COMMS_API_KEY = process.env.COMMS_API_KEY || '';

interface PlatformApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  orgId?: string;
  headers?: Record<string, string>;
}

interface PlatformApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

/**
 * Raw streaming fetch to the platform API.
 * Returns the fetch Response directly for SSE proxy use.
 */
export async function platformApiStream(
  path: string,
  signal?: AbortSignal
): Promise<Response> {
  const url = `${COMMS_API_BASE_URL}${path}`;
  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${COMMS_API_KEY}`,
      'Accept': 'text/event-stream',
    },
    signal,
  });
}

export async function platformApi<T>(
  path: string,
  options: PlatformApiOptions = {}
): Promise<StepResult<T>> {
  const { method = 'GET', body, orgId, headers = {} } = options;

  const url = `${COMMS_API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COMMS_API_KEY}`,
        ...(orgId ? { 'X-Org-Id': orgId } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const json = (await response.json()) as PlatformApiResponse<T>;

    if (!response.ok || !json.success) {
      const errorMessage = json.error?.message || `Platform API error: ${response.status}`;
      return failure('PROVIDER_ERROR', errorMessage, json.error?.details);
    }

    return success(json.data as T);
  } catch (error) {
    return failure(
      'PROVIDER_ERROR',
      `Platform API request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
