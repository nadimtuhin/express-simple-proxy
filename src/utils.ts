import { URLSearchParams } from 'url';
import FormData from 'form-data';
import { Response, NextFunction } from 'express';
import { UrlVariables, RequestWithFiles, RequestWithLocals, CurlCommandOptions } from './types';

/**
 * Joins URL parts with proper handling of slashes and query strings
 */
export function urlJoin(...parts: string[]): string {
  const filteredParts = parts.filter(part => part && part.length > 0);

  if (filteredParts.length === 0) {
    return '';
  }

  const joined = filteredParts
    .map((part, index) => {
      if (index === 0) {
        return part.replace(/\/+$/, '');
      }
      return part.replace(/^\/+/, '').replace(/\/+$/, '');
    })
    .join('/');

  // Handle query strings - if last part starts with ?, merge it with previous part
  const lastPart = filteredParts[filteredParts.length - 1];
  if (lastPart && lastPart.startsWith('?')) {
    const pathParts = filteredParts.slice(0, -1);
    const queryString = lastPart;

    if (pathParts.length === 0) {
      return queryString;
    }

    const pathJoined = pathParts
      .map((part, index) => {
        if (index === 0) {
          return part.replace(/\/+$/, '');
        }
        return part.replace(/^\/+/, '').replace(/\/+$/, '');
      })
      .join('/');

    return pathJoined + queryString;
  }

  return joined;
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
 * Create FormData payload from Express request
 */
export function createFormDataPayload(req: RequestWithFiles): FormData {
  const bodyFormData = new FormData();

  // Add body fields
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      const value = req.body[key];
      if (value !== undefined && value !== null) {
        bodyFormData.append(key, String(value));
      }
    });
  }

  // Add files
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach(file => {
      bodyFormData.append(file.fieldname, file.buffer, {
        contentType: file.mimetype,
        filename: file.originalname,
      });
    });
  } else if (req.file) {
    bodyFormData.append(req.file.fieldname, req.file.buffer, {
      contentType: req.file.mimetype,
      filename: req.file.originalname,
    });
  }

  return bodyFormData;
}

/**
 * Generate curl command for logging/debugging
 */
export function generateCurlCommand(payload: CurlCommandOptions, req?: RequestWithFiles): string {
  const { url, method, headers, data } = payload;

  let curlCommand = `curl -X ${method} '${url}'`;

  // Add headers (excluding Content-Type for FormData as curl will set it)
  if (headers && Object.keys(headers).length > 0) {
    Object.keys(headers).forEach(key => {
      if (!(data instanceof FormData && key.toLowerCase() === 'content-type')) {
        curlCommand += ` -H '${key}: ${headers[key]}'`;
      }
    });
  }

  // Add data/body
  if (data) {
    if (typeof data === 'string') {
      // JSON data
      curlCommand += ` -d '${data}'`;
    } else if (data instanceof FormData) {
      // FormData - generate proper -F flags
      const formFields: string[] = [];

      // Add body fields
      if (req?.body) {
        Object.keys(req.body).forEach(key => {
          formFields.push(`-F '${key}=${req.body[key]}'`);
        });
      }

      // Add files
      if (req?.files && Array.isArray(req.files)) {
        req.files.forEach(file => {
          formFields.push(`-F '${file.fieldname}=@${file.originalname}'`);
        });
      } else if (req?.file) {
        formFields.push(`-F '${req.file.fieldname}=@${req.file.originalname}'`);
      }

      curlCommand += ` ${formFields.join(' ')}`;
    } else {
      // Other data types
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
