import { DEFAULT_ERROR_MESSAGE } from '../constants';

/**
 * Errors from `nx.$api` are usually `{ message, ... }` envelopes; dig out the
 * deepest readable string instead of rendering `[object Object]`.
 */
export function errorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  if (typeof error === 'string' && error) return error;
  if (error === undefined || error === null) return fallback;

  if (typeof error === 'object') {
    const record = error as Record<string, any>;
    const nested = record.error && typeof record.error === 'object' ? record.error : undefined;
    const message = (nested && nested.message) || record.message || record.msg;
    if (typeof message === 'string' && message) return message;
  }

  return fallback;
}
