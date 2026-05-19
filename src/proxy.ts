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
  buildQueryString,
  createFormDataPayload,
  generateCurlCommand,
  asyncWrapper,
  parseSize,
  resolveProxyPath,
} from './utils';
import {
  classifyResponseError,
  classifyNetworkError,
  isShortCircuitResponse,
  buildErrorResponseBody,
  filterProxyResponseHeaders,
} from './errors';

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
      throw classifyResponseError(axiosError);
    } else if (axiosError.request) {
      throw classifyNetworkError(axiosError);
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
  const errorResponse = buildErrorResponseBody(error);

  if (error.headers) {
    const filtered = filterProxyResponseHeaders(error.headers);
    Object.entries(filtered).forEach(([name, value]) => {
      res.set(name, value);
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

function buildRequestPayload(
  config: ProxyConfig,
  req: RequestWithLocals,
  reqWithFiles: RequestWithFiles,
  proxyPath: string | undefined
): ProxyRequestPayload {
  const qs = buildQueryString(req.query);
  const modifiedProxyPath = resolveProxyPath(proxyPath, req.path, req.params);
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
  return payload;
}

async function dispatchUpstreamResponse(
  handler: ResponseHandler | boolean | undefined,
  req: RequestWithLocals,
  res: Response,
  remoteResponse: ProxyResponse,
  config: ProxyConfig
): Promise<void> {
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
}

async function applyErrorHook(
  error: ProxyError,
  req: RequestWithLocals,
  res: Response,
  errorHandlerHook: ProxyConfig['errorHandlerHook'],
  errorHandler: NonNullable<ProxyConfig['errorHandler']>
): Promise<ProxyError> {
  let processedError = error;
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
  return processedError;
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

      const payload = buildRequestPayload(config, req, reqWithFiles, proxyPath);

      try {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('🔄 Proxy Request:', generateCurlCommand(payload, reqWithFiles));
        }

        if (beforeRequest) {
          const hookResult = await beforeRequest(payload, reqWithFiles);
          if (isShortCircuitResponse(hookResult)) {
            const sc = hookResult;
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
        await dispatchUpstreamResponse(handler, req, res, remoteResponse, config);

        const size = parseSize(remoteResponse.headers['content-length']);
        const upstreamStats: ProxyStats = {
          url: payload.url,
          method: payload.method,
          status: remoteResponse.status,
          durationMs: Date.now() - startedAt,
          source: 'upstream',
        };
        if (size !== undefined) {
          upstreamStats.responseSizeBytes = size;
        }
        await fireStats(upstreamStats);
      } catch (error) {
        const processedError = await applyErrorHook(
          error as ProxyError,
          req,
          res,
          errorHandlerHook,
          errorHandler
        );
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
