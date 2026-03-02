/**
 * StepResult Pattern
 *
 * Consistent result type used across all services and API routes.
 * Mirrors the pattern from moludar-comms-platform/workflows/shared/.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export interface StepError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type StepResult<T> =
  | { success: true; data: T }
  | { success: false; error: StepError };

export function success<T>(data: T): StepResult<T> {
  return { success: true, data };
}

export function failure(code: ErrorCode, message: string, details?: unknown): StepResult<never> {
  return { success: false, error: { code, message, details } };
}

export function mapErrorToHttpStatus(code: ErrorCode): number {
  switch (code) {
    case 'VALIDATION_ERROR': return 400;
    case 'UNAUTHORIZED': return 401;
    case 'FORBIDDEN': return 403;
    case 'NOT_FOUND': return 404;
    case 'CONFLICT': return 409;
    case 'RATE_LIMITED': return 429;
    case 'PROVIDER_ERROR': return 502;
    case 'INTERNAL_ERROR': return 500;
    default: return 500;
  }
}

export function toApiResponse<T>(result: StepResult<T>) {
  if (result.success) {
    return { success: true as const, data: result.data };
  }
  return { success: false as const, error: result.error };
}
