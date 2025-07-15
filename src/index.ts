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
} from './utils';

// Types and interfaces
export type {
  ProxyConfig,
  ProxyError,
  ProxyResponse,
  ProxyRequestPayload,
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
