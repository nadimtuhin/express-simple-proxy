import { URLSearchParams } from 'url';
import FormData from 'form-data';
import { Response, NextFunction } from 'express';
import {
  UrlVariables,
  RequestWithFiles,
  RequestWithLocals,
  CurlCommandOptions,
  FileUpload,
} from './types';

/**
 * Parse a content-length header string into a number, or undefined if invalid
 */
export function parseSize(contentLength: string | undefined): number | undefined {
  if (!contentLength) {
    return undefined;
  }
  const n = parseInt(contentLength, 10);
  return isNaN(n) ? undefined : n;
}

/**
 * Resolve the proxy path: apply URL template substitution if proxyPath is provided,
 * otherwise use reqPath as-is.
 */
export function resolveProxyPath(
  proxyPath: string | undefined,
  reqPath: string,
  params: Record<string, string>
): string {
  if (proxyPath) {
    return replaceUrlTemplate(proxyPath, params);
  }
  return reqPath;
}

/**
 * Joins URL parts with proper handling of slashes and query strings
 */
export function urlJoin(...parts: string[]): string {
  const filteredParts = parts.filter(part => part && part.length > 0);

  if (filteredParts.length === 0) {
    return '';
  }

  const lastPart = filteredParts[filteredParts.length - 1] as string;
  const hasQuerySuffix = lastPart.startsWith('?');
  const pathParts = hasQuerySuffix ? filteredParts.slice(0, -1) : filteredParts;

  if (pathParts.length === 0) {
    return lastPart;
  }

  const pathJoined = pathParts
    .map((part, index) => {
      if (index === 0) {
        return part.replace(/\/+$/, '');
      }
      return part.replace(/^\/+/, '').replace(/\/+$/, '');
    })
    .join('/');

  return hasQuerySuffix ? pathJoined + lastPart : pathJoined;
}

/**
 * Replace URL template placeholders with actual values
 */
export function replaceUrlTemplate(url: string, urlVariables: UrlVariables): string {
  const placeholders = Object.keys(urlVariables);
  let result = url;

  placeholders.forEach(placeholder => {
    const pattern = new RegExp(`:${placeholder}`, 'g');
    result = result.replace(pattern, String(urlVariables[placeholder]));
  });

  return result;
}

/**
 * Build query string from object with proper encoding
 */
export function buildQueryString(query: Record<string, string | string[] | undefined>): string {
  if (!query || Object.keys(query).length === 0) {
    return '';
  }

  const params = new URLSearchParams();

  Object.keys(query).forEach(key => {
    const value = query[key];

    if (Array.isArray(value)) {
      value.forEach(v => params.append(key, String(v)));
    } else if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Collect all uploaded files from a request into a flat array.
 * Handles all three multer upload shapes: single file, array, and fields object.
 */
function getRequestFiles(req: RequestWithFiles | undefined): FileUpload[] {
  if (!req) {
    return [];
  }
  if (req.files) {
    return Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  }
  return req.file ? [req.file] : [];
}

/**
 * Create FormData payload from Express request
 */
export function createFormDataPayload(req: RequestWithFiles): FormData {
  const bodyFormData = new FormData();

  if (req.body) {
    Object.keys(req.body).forEach(key => {
      const value = req.body[key];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => bodyFormData.append(key, String(v)));
        } else {
          bodyFormData.append(key, String(value));
        }
      }
    });
  }

  getRequestFiles(req).forEach(file => {
    bodyFormData.append(file.fieldname, file.buffer, {
      contentType: file.mimetype,
      filename: file.originalname,
    });
  });

  return bodyFormData;
}

/**
 * Generate curl command for logging/debugging
 */
export function generateCurlCommand(payload: CurlCommandOptions, req?: RequestWithFiles): string {
  const { url, method, headers, data } = payload;

  let curlCommand = `curl -X ${method} '${url}'`;

  if (headers && Object.keys(headers).length > 0) {
    Object.keys(headers).forEach(key => {
      if (!(data instanceof FormData && key.toLowerCase() === 'content-type')) {
        curlCommand += ` -H '${key}: ${headers[key]}'`;
      }
    });
  }

  if (data) {
    if (typeof data === 'string') {
      curlCommand += ` -d '${data}'`;
    } else if (data instanceof FormData) {
      const formFields: string[] = [];

      if (req?.body) {
        Object.keys(req.body).forEach(key => {
          const value = req.body[key];
          if (Array.isArray(value)) {
            value.forEach(v => formFields.push(`-F '${key}=${v}'`));
          } else {
            formFields.push(`-F '${key}=${value}'`);
          }
        });
      }

      getRequestFiles(req).forEach(file => {
        formFields.push(`-F '${file.fieldname}=@${file.originalname}'`);
      });

      curlCommand += ` ${formFields.join(' ')}`;
    } else {
      curlCommand += ` -d '<binary-data>'`;
    }
  }

  return curlCommand;
}

/**
 * Async wrapper for Express middleware
 */
export function asyncWrapper(
  fn: (req: RequestWithLocals, res: Response, next?: NextFunction) => Promise<void>
): (req: RequestWithFiles, res: Response, next: NextFunction) => Promise<void> {
  return async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    try {
      await fn(req as RequestWithLocals, res, next);
    } catch (error) {
      next(error);
    }
  };
}
