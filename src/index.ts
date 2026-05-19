// Main exports
export { createProxyController, axiosProxyRequest, defaultErrorHandler } from './proxy';

// Utility functions
export {
  urlJoin,
  replaceUrlTemplate,
  buildQueryString,
  createFormDataPayload,
  generateCurlCommand,
  asyncWrapper,
  parseSize,
  resolveProxyPath,
} from './utils';

// Error classification helpers
export {
  classifyResponseError,
  classifyNetworkError,
  isShortCircuitResponse,
  buildErrorResponseBody,
  filterProxyResponseHeaders,
} from './errors';

// Types and interfaces
export type {
  ProxyConfig,
  ProxyError,
  ProxyErrorCode,
  ProxyResponse,
  ProxyRequestPayload,
  ProxyStats,
  ShortCircuitResponse,
  BeforeRequestHook,
  OnResponseCallback,
  CurlCommandOptions,
  RequestWithLocals,
  RequestWithFiles,
  ErrorHandler,
  ErrorHandlerHook,
  ResponseHandler,
  ProxyController,
  UrlVariables,
  QueryParams,
  FileUpload,
} from './types';

// Constants
export { DEFAULT_TIMEOUT, MAX_REQUEST_SIZE, DEFAULT_RETRY_COUNT } from './types';

// Default export
export { createProxyController as default } from './proxy';
