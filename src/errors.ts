import { AxiosError } from 'axios';
import { ProxyError, ProxyErrorCode, ShortCircuitResponse } from './types';

/**
 * Classify an AxiosError that has a response (axiosError.response is truthy)
 */
export function classifyResponseError(axiosError: AxiosError): ProxyError {
  const response = axiosError.response as NonNullable<typeof axiosError.response>;
  const enhancedError: ProxyError = new Error(
    ((response.data as Record<string, unknown>)?.message as string) || axiosError.message
  );
  enhancedError.status = response.status;
  enhancedError.data = response.data;
  enhancedError.headers = response.headers as Record<string, string>;
  if (response.status === 401 || response.status === 403) {
    enhancedError.code = 'UPSTREAM_AUTH';
  }
  return enhancedError;
}

const NETWORK_ERROR_CODE_MAP: Record<string, ProxyErrorCode> = {
  ECONNABORTED: 'UPSTREAM_TIMEOUT',
  ETIMEDOUT: 'UPSTREAM_TIMEOUT',
  ERR_CANCELED: 'UPSTREAM_TIMEOUT',
  ECONNREFUSED: 'UPSTREAM_UNREACHABLE',
  ENOTFOUND: 'UPSTREAM_UNREACHABLE',
  ECONNRESET: 'UPSTREAM_UNREACHABLE',
};

/**
 * Classify an AxiosError that has no response (axiosError.request is truthy)
 */
export function classifyNetworkError(axiosError: AxiosError): ProxyError {
  const enhancedError: ProxyError = new Error('Network error: No response received');
  enhancedError.status = 503;
  enhancedError.code = NETWORK_ERROR_CODE_MAP[axiosError.code ?? ''] ?? 'NETWORK_ERROR';
  return enhancedError;
}

/**
 * Type guard: truthy object with a numeric .status field
 */
export function isShortCircuitResponse(value: unknown): value is ShortCircuitResponse {
  return !!value && typeof (value as { status?: unknown }).status === 'number';
}

/**
 * Build the JSON body for an error response
 */
export function buildErrorResponseBody(error: ProxyError): {
  error: { message: string; code: string; details?: unknown };
} {
  return {
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'UNKNOWN_ERROR',
      ...(error.data ? { details: error.data } : {}),
    },
  };
}

// The error body is re-serialized as JSON, so the upstream's framing and type no longer apply.
// Hop-by-hop headers (RFC 7230 §6.1) describe the upstream connection, not this one.
const DROPPED_ERROR_RESPONSE_HEADERS = new Set([
  'content-length',
  'content-type',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

/**
 * Filter upstream headers before copying them onto an error response (case-insensitive)
 */
export function filterProxyResponseHeaders(
  headers: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name, value]) =>
        !DROPPED_ERROR_RESPONSE_HEADERS.has(name.toLowerCase()) && value !== undefined
    )
  );
}
