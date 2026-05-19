import axios, { AxiosError } from 'axios';
import { Response } from 'express';
import {
  ProxyConfig,
  ProxyError,
  ProxyStats,
  ProxyResponse,
  ProxyRequestPayload,
  RequestWithLocals,
  RequestWithFiles,
  ResponseHandler,
  ProxyController,
  DEFAULT_TIMEOUT,
  MAX_REQUEST_SIZE,
} from './types';
import {
  urlJoin,
  replaceUrlTemplate,
  buildQueryString,
  createFormDataPayload,
  generateCurlCommand,
  asyncWrapper,
} from './utils';

/**
 * Make HTTP request using axios with enhanced error handling
 */
export async function axiosProxyRequest(payload: ProxyRequestPayload): Promise<ProxyResponse> {
  if (!payload.url) {
    throw new Error('url is required for axiosProxyRequest');
  }

  try {
    const options = {
      url: payload.url,
      method: payload.method,
      headers: payload.headers,
      timeout: payload.timeout,
      maxContentLength: MAX_REQUEST_SIZE,
      maxBodyLength: MAX_REQUEST_SIZE,
      ...(payload.data ? { data: payload.data } : {}),
    };

    const response = await axios(options);
    return response as ProxyResponse;
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.response) {
      const enhancedError: ProxyError = new Error(
        ((axiosError.response.data as Record<string, unknown>)?.message as string) ||
          axiosError.message
      );
      enhancedError.status = axiosError.response.status;
      enhancedError.data = axiosError.response.data;
      enhancedError.headers = axiosError.response.headers as Record<string, string>;
      if (axiosError.response.status === 401 || axiosError.response.status === 403) {
        enhancedError.code = 'UPSTREAM_AUTH';
      }
      throw enhancedError;
    } else if (axiosError.request) {
      const timeoutCodes = ['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'];
      const unreachableCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'];
      const axiosCode = axiosError.code ?? '';
      const enhancedError: ProxyError = new Error('Network error: No response received');
      enhancedError.status = 503;
      if (timeoutCodes.includes(axiosCode)) {
        enhancedError.code = 'UPSTREAM_TIMEOUT';
      } else if (unreachableCodes.includes(axiosCode)) {
        enhancedError.code = 'UPSTREAM_UNREACHABLE';
      } else {
        enhancedError.code = 'NETWORK_ERROR';
      }
      throw enhancedError;
    } else {
      const enhancedError: ProxyError = new Error(`Request setup error: ${axiosError.message}`);
      enhancedError.status = 500;
      enhancedError.code = 'REQUEST_ERROR';
      throw enhancedError;
    }
  }
}

/**
 * Default error handler
 */
export function defaultErrorHandler(
  error: ProxyError,
  _req: RequestWithLocals,
  res: Response
): void {
  const status = error.status || 500;
  const errorResponse = {
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'UNKNOWN_ERROR',
      ...(error.data ? { details: error.data } : {}),
    },
  };

  // Forward original headers if available
  if (error.headers) {
    Object.keys(error.headers).forEach(header => {
      if (header.toLowerCase() !== 'content-length' && error.headers) {
        res.set(header, error.headers[header]);
      }
    });
  }

  res.status(status).json(errorResponse);
}

/**
 * Validate proxy configuration
 */
function validateConfig(config: ProxyConfig): void {
  if (!config) {
    throw new Error('config is required for createProxyController');
  }

  if (!config.baseURL) {
    throw new Error('config.baseURL is required');
  }

  if (typeof config.headers !== 'function') {
    throw new Error('config.headers must be a function');
  }

  if (config.errorHandler && typeof config.errorHandler !== 'function') {
    throw new Error('config.errorHandler must be a function');
  }

  if (config.errorHandlerHook && typeof config.errorHandlerHook !== 'function') {
    throw new Error('config.errorHandlerHook must be a function');
  }
}

function parseSize(contentLength: string | undefined): number | undefined {
  if (!contentLength) {
    return undefined;
  }
  const n = parseInt(contentLength, 10);
  return isNaN(n) ? undefined : n;
}

export function createProxyController(config: ProxyConfig): ProxyController {
  validateConfig(config);

  const {
    errorHandler = defaultErrorHandler,
    errorHandlerHook,
    beforeRequest,
    onResponse,
  } = config;

  return function proxyController(proxyPath?: string, handler?: ResponseHandler | boolean) {
    return asyncWrapper(async (req: RequestWithLocals, res: Response): Promise<void> => {
      const startedAt = Date.now();
      let statsFired = false;
      const reqWithFiles = req as RequestWithFiles;

      const fireStats = async (stats: ProxyStats): Promise<void> => {
        if (statsFired || !onResponse) {
          return;
        }
        statsFired = true;
        try {
          await onResponse(stats, reqWithFiles, res);
        } catch (err) {
          console.error('onResponse callback error:', err);
        }
      };

      const qs = buildQueryString(req.query);
      let modifiedProxyPath = '';

      if (proxyPath) {
        modifiedProxyPath = replaceUrlTemplate(proxyPath, req.params);
      } else {
        modifiedProxyPath = req.path;
      }

      const payload: ProxyRequestPayload = {
        url: urlJoin(config.baseURL, modifiedProxyPath, qs),
        headers: { ...config.headers(req) },
        method: req.method,
        timeout: config.timeout || DEFAULT_TIMEOUT,
      };

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const useFormData = req.is('multipart/form-data');

        if (useFormData) {
          const bodyFormData = createFormDataPayload(reqWithFiles);
          payload.data = bodyFormData;
          Object.assign(payload.headers, bodyFormData.getHeaders());
        } else {
          payload.data = JSON.stringify(req.body);
          if (!payload.headers['Content-Type']) {
            payload.headers['Content-Type'] = 'application/json';
          }
        }
      }

      try {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('🔄 Proxy Request:', generateCurlCommand(payload, reqWithFiles));
        }

        if (beforeRequest) {
          const hookResult = await beforeRequest(payload, reqWithFiles);
          if (hookResult && typeof (hookResult as { status?: unknown }).status === 'number') {
            const sc = hookResult as {
              status: number;
              data: unknown;
              headers?: Record<string, string>;
            };
            if (sc.headers) {
              res.set(sc.headers);
            }
            res.status(sc.status).json(sc.data);
            await fireStats({
              url: payload.url,
              method: payload.method,
              status: sc.status,
              durationMs: Date.now() - startedAt,
              source: 'short-circuit',
            });
            return;
          }
        }

        const remoteResponse = await axiosProxyRequest(payload);

        if (!handler) {
          res.status(remoteResponse.status);
          if (config.responseHeaders) {
            res.set(config.responseHeaders(remoteResponse));
          }
          res.json(remoteResponse.data);
        } else if (typeof handler === 'function') {
          await handler(req, res, remoteResponse);
        } else {
          res.json(remoteResponse.data);
        }

        const size = parseSize(remoteResponse.headers['content-length']);
        await fireStats({
          url: payload.url,
          method: payload.method,
          status: remoteResponse.status,
          durationMs: Date.now() - startedAt,
          ...(size !== undefined ? { responseSizeBytes: size } : {}),
          source: 'upstream',
        });
      } catch (error) {
        let processedError = error as ProxyError;

        if (errorHandlerHook) {
          try {
            const hookResult = await errorHandlerHook(processedError, req, res);
            if (hookResult && (hookResult instanceof Error || 'message' in hookResult)) {
              processedError = hookResult;
            }
          } catch (hookError) {
            console.error('Error handler hook failed:', hookError);
          }
        }

        try {
          await errorHandler(processedError, req, res);
        } catch (handlerError) {
          console.error('Custom error handler failed:', handlerError);
          defaultErrorHandler(processedError, req, res);
        }

        await fireStats({
          url: payload.url,
          method: payload.method,
          status: processedError.status ?? 500,
          durationMs: Date.now() - startedAt,
          source: 'upstream',
        });
      }
    });
  };
}
