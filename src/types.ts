import { Request, Response, NextFunction } from 'express';
import { AxiosResponse } from 'axios';

export interface ProxyConfig {
  baseURL: string;
  headers: (req: Request) => Record<string, string>;
  timeout?: number;
  responseHeaders?: (response: AxiosResponse) => Record<string, string>;
  errorHandler?: ErrorHandler;
  errorHandlerHook?: ErrorHandlerHook;
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
  query: QueryParams;
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
) => (req: RequestWithLocals, res: Response, next: NextFunction) => Promise<void>;

export interface UrlVariables {
  [key: string]: string | number;
}

export interface QueryParams {
  [key: string]: string | string[] | number | boolean | undefined | null;
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  stream?: unknown;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface RequestWithFiles extends Omit<RequestWithLocals, 'file' | 'files'> {
  files?: FileUpload[];
  file?: FileUpload;
}

export const DEFAULT_TIMEOUT = 30000;
export const MAX_REQUEST_SIZE = 100 * 1024 * 1024; // 100MB
export const DEFAULT_RETRY_COUNT = 2;
