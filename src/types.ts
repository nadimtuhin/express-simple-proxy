import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { AxiosResponse } from 'axios';

export type ProxyErrorCode =
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_UNREACHABLE'
  | 'NETWORK_ERROR'
  | 'UPSTREAM_AUTH'
  | 'REQUEST_ERROR'
  | 'UNKNOWN_ERROR';

export interface ShortCircuitResponse {
  status: number;
  data: unknown;
  headers?: Record<string, string>;
  statusText?: string;
}

export interface ProxyStats {
  url: string;
  method: string;
  status: number;
  durationMs: number;
  responseSizeBytes?: number;
  source: 'upstream' | 'short-circuit';
}

export type BeforeRequestHook = (
  payload: ProxyRequestPayload,
  req: RequestWithFiles
) => void | ShortCircuitResponse | Promise<void | ShortCircuitResponse>;

export type OnResponseCallback = (
  stats: ProxyStats,
  req: RequestWithFiles,
  res: Response
) => void | Promise<void>;

export interface ProxyConfig {
  baseURL: string;
  headers: (req: Request) => Record<string, string>;
  timeout?: number;
  responseHeaders?: (response: AxiosResponse) => Record<string, string>;
  errorHandler?: ErrorHandler;
  errorHandlerHook?: ErrorHandlerHook;
  beforeRequest?: BeforeRequestHook;
  onResponse?: OnResponseCallback;
}

export interface ProxyError extends Error {
  status?: number;
  code?: string;
  data?: unknown;
  headers?: Record<string, string>;
}

export interface ProxyResponse extends AxiosResponse {
  data: unknown;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ProxyRequestPayload {
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: unknown;
  timeout: number;
}

export interface CurlCommandOptions {
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: unknown;
}

export interface RequestWithLocals extends Request {
  locals?: {
    token?: string;
    [key: string]: unknown;
  };
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
  method: string;
  path: string;
  is: (type: string) => string | false | null;
}

export type ErrorHandler = (
  error: ProxyError,
  req: RequestWithLocals,
  res: Response
) => void | Promise<void>;
export type ErrorHandlerHook = (
  error: ProxyError,
  req: RequestWithLocals,
  res: Response
) => ProxyError | Promise<ProxyError>;
export type ResponseHandler = (
  req: RequestWithLocals,
  res: Response,
  remoteResponse: ProxyResponse
) => void | Promise<void>;
export type ProxyController = (
  proxyPath?: string,
  handler?: ResponseHandler | boolean
) => (req: RequestWithFiles, res: Response, next: NextFunction) => Promise<void>;

export interface UrlVariables {
  [key: string]: string | number;
}

export interface QueryParams {
  [key: string]: string | string[] | number | boolean | undefined;
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  stream?: Readable | undefined;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface RequestWithFiles extends Omit<RequestWithLocals, 'file' | 'files'> {
  files?: FileUpload[] | { [fieldname: string]: FileUpload[] };
  file?: FileUpload;
}

export const DEFAULT_TIMEOUT = 30000;
export const MAX_REQUEST_SIZE = 100 * 1024 * 1024; // 100MB
export const DEFAULT_RETRY_COUNT = 2;
