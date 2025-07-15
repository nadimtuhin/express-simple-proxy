import axios, { AxiosError } from 'axios';
import { Response } from 'express';
import {
  ProxyConfig,
  ProxyError,
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

    // Enhanced error handling with proper status codes
    if (axiosError.response) {
      // Server responded with error status
      const enhancedError: ProxyError = new Error(
        ((axiosError.response.data as Record<string, unknown>)?.message as string) ||
          axiosError.message
      );
      enhancedError.status = axiosError.response.status;
      enhancedError.data = axiosError.response.data;
      enhancedError.headers = axiosError.response.headers as Record<string, string>;
      throw enhancedError;
    } else if (axiosError.request) {
      // Request was made but no response received
      const enhancedError: ProxyError = new Error('Network error: No response received');
      enhancedError.status = 503;
      enhancedError.code = 'NETWORK_ERROR';
      throw enhancedError;
    } else {
      // Error setting up the request
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
      if (header.toLowerCase() !== 'content-length') {
        res.set(header, error.headers![header]);
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

/**
 * Create proxy controller with given configuration
 */
export function createProxyController(config: ProxyConfig): ProxyController {
  // Validate configuration
  validateConfig(config);

  const { errorHandler = defaultErrorHandler, errorHandlerHook } = config;

  return function proxyController(proxyPath?: string, handler?: ResponseHandler | boolean) {
    return asyncWrapper(async (req: RequestWithLocals, res: Response): Promise<void> => {
      const qs = buildQueryString(req.query);
      let modifiedProxyPath = '';

      if (proxyPath) {
        modifiedProxyPath = replaceUrlTemplate(proxyPath, req.params);
      } else {
        modifiedProxyPath = req.path;
      }

      const payload: ProxyRequestPayload = {
        url: urlJoin(config.baseURL, modifiedProxyPath, qs),
        headers: { ...config.headers(req) }, // Clone headers to avoid mutation
        method: req.method,
        timeout: config.timeout || DEFAULT_TIMEOUT,
      };

      // Handle request body for POST/PUT/PATCH/DELETE methods
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const useFormData = req.is('multipart/form-data');
        const requestWithFiles = req as RequestWithFiles;

        if (useFormData) {
          // Handle as form data
          const bodyFormData = createFormDataPayload(requestWithFiles);
          payload.data = bodyFormData;

          // Get proper boundary from FormData headers
          const formDataHeaders = bodyFormData.getHeaders();
          Object.assign(payload.headers, formDataHeaders);
        } else {
          // Handle as JSON
          payload.data = JSON.stringify(req.body);
          // Ensure Content-Type is set for JSON if not already present
          if (!payload.headers['Content-Type']) {
            payload.headers['Content-Type'] = 'application/json';
          }
        }
      }

      try {
        // Log curl command in development mode
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('🔄 Proxy Request:', generateCurlCommand(payload, req as RequestWithFiles));
        }

        const remoteResponse = await axiosProxyRequest(payload);

        if (!handler) {
          // Set status code before sending response
          res.status(remoteResponse.status);

          if (config.responseHeaders) {
            res.set(config.responseHeaders(remoteResponse));
          }

          res.json(remoteResponse.data);
        } else if (typeof handler === 'function') {
          await handler(req, res, remoteResponse);
        } else {
          // For handler === true, return raw response
          res.json(remoteResponse.data);
        }
      } catch (error) {
        let processedError = error as ProxyError;

        // Apply error handler hook if provided
        if (errorHandlerHook) {
          try {
            const hookResult = await errorHandlerHook(processedError, req, res);
            // If hook returns an error object, use it; otherwise keep original
            if (hookResult && (hookResult instanceof Error || 'message' in hookResult)) {
              processedError = hookResult;
            }
          } catch (hookError) {
            // If hook itself throws, log it but continue with original error
            console.error('Error handler hook failed:', hookError);
          }
        }

        // Use custom error handler or default
        try {
          await errorHandler(processedError, req, res);
        } catch (handlerError) {
          // If custom error handler fails, fall back to default
          console.error('Custom error handler failed:', handlerError);
          defaultErrorHandler(processedError, req, res);
        }
      }
    });
  };
}
