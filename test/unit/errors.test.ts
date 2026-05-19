import { AxiosError } from 'axios';
import {
  classifyResponseError,
  classifyNetworkError,
  isShortCircuitResponse,
  buildErrorResponseBody,
  filterProxyResponseHeaders,
} from '../../src/errors';

function makeAxiosError(
  opts: {
    message?: string;
    code?: string;
    responseStatus?: number;
    responseData?: unknown;
    responseHeaders?: Record<string, string>;
    hasResponse?: boolean;
  } = {}
): AxiosError {
  const {
    message = 'axios error',
    code,
    responseStatus,
    responseData,
    responseHeaders = {},
    hasResponse = true,
  } = opts;

  const err = new AxiosError(message);
  if (code !== undefined) err.code = code;

  if (hasResponse && responseStatus !== undefined) {
    (err as any).response = {
      status: responseStatus,
      data: responseData,
      headers: responseHeaders,
    };
  }

  return err;
}

describe('classifyResponseError', () => {
  it('sets code UPSTREAM_AUTH for 401', () => {
    const err = makeAxiosError({ responseStatus: 401, responseData: {} });
    const result = classifyResponseError(err);
    expect(result.code).toBe('UPSTREAM_AUTH');
  });

  it('sets code UPSTREAM_AUTH for 403', () => {
    const err = makeAxiosError({ responseStatus: 403, responseData: {} });
    const result = classifyResponseError(err);
    expect(result.code).toBe('UPSTREAM_AUTH');
  });

  it('does not set code for 404', () => {
    const err = makeAxiosError({ responseStatus: 404, responseData: {} });
    const result = classifyResponseError(err);
    expect(result.code).toBeUndefined();
  });

  it('preserves response status on the error', () => {
    const err = makeAxiosError({ responseStatus: 422, responseData: { foo: 'bar' } });
    const result = classifyResponseError(err);
    expect(result.status).toBe(422);
  });

  it('preserves response data on the error', () => {
    const data = { detail: 'unprocessable' };
    const err = makeAxiosError({ responseStatus: 422, responseData: data });
    const result = classifyResponseError(err);
    expect(result.data).toEqual(data);
  });

  it('preserves response headers on the error', () => {
    const headers = { 'x-request-id': 'abc123' };
    const err = makeAxiosError({ responseStatus: 200, responseData: {}, responseHeaders: headers });
    const result = classifyResponseError(err);
    expect(result.headers).toEqual(headers);
  });

  it('uses response.data.message as error message when present', () => {
    const err = makeAxiosError({
      responseStatus: 400,
      responseData: { message: 'Bad input provided' },
      message: 'Request failed with status code 400',
    });
    const result = classifyResponseError(err);
    expect(result.message).toBe('Bad input provided');
  });

  it('falls back to axiosError.message when response.data.message is absent', () => {
    const err = makeAxiosError({
      responseStatus: 500,
      responseData: { code: 'SERVER_ERR' },
      message: 'Request failed with status code 500',
    });
    const result = classifyResponseError(err);
    expect(result.message).toBe('Request failed with status code 500');
  });
});

describe('classifyNetworkError', () => {
  const timeoutCodes = ['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'];
  const unreachableCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'];

  timeoutCodes.forEach(code => {
    it(`sets code UPSTREAM_TIMEOUT for ${code}`, () => {
      const err = makeAxiosError({ code, hasResponse: false });
      const result = classifyNetworkError(err);
      expect(result.code).toBe('UPSTREAM_TIMEOUT');
    });
  });

  unreachableCodes.forEach(code => {
    it(`sets code UPSTREAM_UNREACHABLE for ${code}`, () => {
      const err = makeAxiosError({ code, hasResponse: false });
      const result = classifyNetworkError(err);
      expect(result.code).toBe('UPSTREAM_UNREACHABLE');
    });
  });

  it('sets code NETWORK_ERROR for unknown error code', () => {
    const err = makeAxiosError({ code: 'SOMETHING_ELSE', hasResponse: false });
    const result = classifyNetworkError(err);
    expect(result.code).toBe('NETWORK_ERROR');
  });

  it('sets code NETWORK_ERROR when error code is empty', () => {
    const err = makeAxiosError({ hasResponse: false });
    const result = classifyNetworkError(err);
    expect(result.code).toBe('NETWORK_ERROR');
  });

  it('always sets status 503', () => {
    const codes: (string | undefined)[] = [
      ...timeoutCodes,
      ...unreachableCodes,
      'UNKNOWN',
      undefined,
    ];
    codes.forEach(code => {
      const err = makeAxiosError({ hasResponse: false, ...(code !== undefined ? { code } : {}) });
      const result = classifyNetworkError(err);
      expect(result.status).toBe(503);
    });
  });
});

describe('isShortCircuitResponse', () => {
  it('returns true for object with numeric status', () => {
    expect(isShortCircuitResponse({ status: 200, data: {} })).toBe(true);
  });

  it('returns true for object with status 0', () => {
    expect(isShortCircuitResponse({ status: 0 })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isShortCircuitResponse(null)).toBe(false);
  });

  it('returns false for empty object (no status)', () => {
    expect(isShortCircuitResponse({})).toBe(false);
  });

  it('returns false when status is a string', () => {
    expect(isShortCircuitResponse({ status: 'ok' })).toBe(false);
  });

  it('returns false for a plain number', () => {
    expect(isShortCircuitResponse(0)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isShortCircuitResponse(undefined)).toBe(false);
  });

  it('returns false for false', () => {
    expect(isShortCircuitResponse(false)).toBe(false);
  });
});

describe('buildErrorResponseBody', () => {
  it('includes details when error.data is present', () => {
    const err: any = new Error('something failed');
    err.code = 'BAD_REQUEST';
    err.data = { field: 'email', reason: 'invalid' };
    const body = buildErrorResponseBody(err);
    expect(body.error.details).toEqual({ field: 'email', reason: 'invalid' });
  });

  it('omits details key when error.data is absent', () => {
    const err: any = new Error('something failed');
    err.code = 'BAD_REQUEST';
    const body = buildErrorResponseBody(err);
    expect('details' in body.error).toBe(false);
  });

  it('uses default message when error.message is empty', () => {
    const err: any = new Error('');
    err.code = 'SOME_CODE';
    const body = buildErrorResponseBody(err);
    expect(body.error.message).toBe('Internal server error');
  });

  it('uses error.message when present', () => {
    const err: any = new Error('upstream timed out');
    err.code = 'UPSTREAM_TIMEOUT';
    const body = buildErrorResponseBody(err);
    expect(body.error.message).toBe('upstream timed out');
  });

  it('uses default code UNKNOWN_ERROR when error.code is empty', () => {
    const err: any = new Error('something');
    const body = buildErrorResponseBody(err);
    expect(body.error.code).toBe('UNKNOWN_ERROR');
  });

  it('uses error.code when present', () => {
    const err: any = new Error('auth failed');
    err.code = 'UPSTREAM_AUTH';
    const body = buildErrorResponseBody(err);
    expect(body.error.code).toBe('UPSTREAM_AUTH');
  });
});

describe('filterProxyResponseHeaders', () => {
  it('drops lowercase content-length', () => {
    const headers = { 'content-length': '1234', 'x-custom': 'yes' };
    const result = filterProxyResponseHeaders(headers);
    expect(result).not.toHaveProperty('content-length');
  });

  it('drops mixed-case Content-Length', () => {
    const headers = { 'Content-Length': '1234', 'x-custom': 'yes' };
    const result = filterProxyResponseHeaders(headers);
    expect(result).not.toHaveProperty('Content-Length');
  });

  it('keeps x-custom header', () => {
    const headers = { 'content-length': '100', 'x-custom': 'value' };
    const result = filterProxyResponseHeaders(headers);
    expect(result['x-custom']).toBe('value');
  });

  it('keeps retry-after header', () => {
    const headers = { 'content-length': '0', 'retry-after': '120' };
    const result = filterProxyResponseHeaders(headers);
    expect(result['retry-after']).toBe('120');
  });

  it('returns empty object for empty input', () => {
    expect(filterProxyResponseHeaders({})).toEqual({});
  });

  it('passes through all non-content-length headers unchanged', () => {
    const headers = {
      'content-type': 'application/json',
      'x-request-id': 'abc',
      'transfer-encoding': 'chunked',
    };
    const result = filterProxyResponseHeaders(headers);
    expect(result).toEqual(headers);
  });
});
