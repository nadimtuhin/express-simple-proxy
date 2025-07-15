import {
  urlJoin,
  replaceUrlTemplate,
  buildQueryString,
  createFormDataPayload,
  generateCurlCommand,
  asyncWrapper,
} from '../../src/utils';
import { RequestWithFiles } from '../../src/types';
import FormData from 'form-data';

describe('Utils', () => {
  describe('urlJoin', () => {
    it('should join URL parts correctly', () => {
      expect(urlJoin('http://example.com', 'api', 'users')).toBe('http://example.com/api/users');
    });

    it('should handle trailing slashes', () => {
      expect(urlJoin('http://example.com/', '/api/', '/users/')).toBe('http://example.com/api/users');
    });

    it('should handle single part', () => {
      expect(urlJoin('http://example.com')).toBe('http://example.com');
    });

    it('should handle empty parts', () => {
      expect(urlJoin('http://example.com', '', 'api', '', 'users')).toBe('http://example.com/api/users');
    });

    it('should handle query strings', () => {
      expect(urlJoin('http://example.com', 'api', '?page=1')).toBe('http://example.com/api?page=1');
    });
  });

  describe('replaceUrlTemplate', () => {
    it('should replace single parameter', () => {
      const url = '/users/:id';
      const variables = { id: 123 };
      expect(replaceUrlTemplate(url, variables)).toBe('/users/123');
    });

    it('should replace multiple parameters', () => {
      const url = '/users/:userId/posts/:postId';
      const variables = { userId: 123, postId: 456 };
      expect(replaceUrlTemplate(url, variables)).toBe('/users/123/posts/456');
    });

    it('should handle string parameters', () => {
      const url = '/users/:id/profile';
      const variables = { id: 'john-doe' };
      expect(replaceUrlTemplate(url, variables)).toBe('/users/john-doe/profile');
    });

    it('should handle no parameters', () => {
      const url = '/users/profile';
      const variables = {};
      expect(replaceUrlTemplate(url, variables)).toBe('/users/profile');
    });
  });

  describe('buildQueryString', () => {
    it('should build query string from object', () => {
      const query = { page: 1, limit: 10, sort: 'name' };
      const result = buildQueryString(query);
      expect(result).toBe('?page=1&limit=10&sort=name');
    });

    it('should handle array values', () => {
      const query = { tags: ['red', 'blue', 'green'] };
      const result = buildQueryString(query);
      expect(result).toBe('?tags=red&tags=blue&tags=green');
    });

    it('should handle empty object', () => {
      expect(buildQueryString({})).toBe('');
    });

    it('should handle null and undefined values', () => {
      const query = { page: 1, limit: null, sort: undefined, active: true };
      const result = buildQueryString(query);
      expect(result).toBe('?page=1&active=true');
    });

    it('should handle boolean values', () => {
      const query = { active: true, disabled: false };
      const result = buildQueryString(query);
      expect(result).toBe('?active=true&disabled=false');
    });
  });

  describe('createFormDataPayload', () => {
    it('should create FormData from request body', () => {
      const req = {
        body: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      } as RequestWithFiles;

      const formData = createFormDataPayload(req);
      expect(formData).toBeInstanceOf(FormData);
    });

    it('should handle single file upload', () => {
      const req = {
        body: { name: 'John Doe' },
        file: {
          fieldname: 'avatar',
          originalname: 'avatar.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('fake-image-data'),
          size: 1024,
        },
      } as RequestWithFiles;

      const formData = createFormDataPayload(req);
      expect(formData).toBeInstanceOf(FormData);
    });

    it('should handle multiple file uploads', () => {
      const req = {
        body: { name: 'John Doe' },
        files: [
          {
            fieldname: 'avatar',
            originalname: 'avatar.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            buffer: Buffer.from('fake-image-data'),
            size: 1024,
          },
          {
            fieldname: 'document',
            originalname: 'doc.pdf',
            encoding: '7bit',
            mimetype: 'application/pdf',
            buffer: Buffer.from('fake-pdf-data'),
            size: 2048,
          },
        ],
      } as RequestWithFiles;

      const formData = createFormDataPayload(req);
      expect(formData).toBeInstanceOf(FormData);
    });

    it('should handle empty request', () => {
      const req = {} as RequestWithFiles;
      const formData = createFormDataPayload(req);
      expect(formData).toBeInstanceOf(FormData);
    });

    it('should handle null and undefined values in body', () => {
      const req = {
        body: {
          name: 'John Doe',
          description: null,
          age: undefined,
          active: true,
        },
      } as RequestWithFiles;

      const formData = createFormDataPayload(req);
      expect(formData).toBeInstanceOf(FormData);
    });
  });

  describe('generateCurlCommand', () => {
    it('should generate basic curl command', () => {
      const payload = {
        url: 'http://example.com/api/users',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token123',
        },
      };

      const result = generateCurlCommand(payload);
      expect(result).toBe("curl -X GET 'http://example.com/api/users' -H 'Authorization: Bearer token123'");
    });

    it('should handle POST with JSON data', () => {
      const payload = {
        url: 'http://example.com/api/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: '{"name":"John Doe"}',
      };

      const result = generateCurlCommand(payload);
      expect(result).toBe("curl -X POST 'http://example.com/api/users' -H 'Content-Type: application/json' -d '{\"name\":\"John Doe\"}'");
    });

    it('should handle FormData', () => {
      const formData = new FormData();
      const payload = {
        url: 'http://example.com/api/upload',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer token123',
        },
        data: formData,
      };

      const req = {
        body: { name: 'John Doe' },
        file: {
          fieldname: 'avatar',
          originalname: 'avatar.jpg',
        },
      } as RequestWithFiles;

      const result = generateCurlCommand(payload, req);
      expect(result).toContain("curl -X POST 'http://example.com/api/upload'");
      expect(result).toContain("-H 'Authorization: Bearer token123'");
      expect(result).toContain("-F 'name=John Doe'");
      expect(result).toContain("-F 'avatar=@avatar.jpg'");
    });

    it('should handle binary data', () => {
      const payload = {
        url: 'http://example.com/api/upload',
        method: 'POST',
        headers: {},
        data: Buffer.from('binary-data'),
      };

      const result = generateCurlCommand(payload);
      expect(result).toBe("curl -X POST 'http://example.com/api/upload' -d '<binary-data>'");
    });
  });


  describe('asyncWrapper', () => {
    it('should wrap async function and handle success', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const mockNext = jest.fn();
      const wrappedFn = asyncWrapper(mockFn);

      await wrappedFn('req', 'res', mockNext);

      expect(mockFn).toHaveBeenCalledWith('req', 'res', mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should wrap async function and handle error', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const mockNext = jest.fn();
      const wrappedFn = asyncWrapper(mockFn);

      await wrappedFn('req', 'res', mockNext);

      expect(mockFn).toHaveBeenCalledWith('req', 'res', mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should wrap sync function that throws', async () => {
      const error = new Error('Test error');
      const mockFn = jest.fn().mockImplementation(() => {
        throw error;
      });
      const mockNext = jest.fn();
      const wrappedFn = asyncWrapper(mockFn);

      await wrappedFn('req', 'res', mockNext);

      expect(mockFn).toHaveBeenCalledWith('req', 'res', mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});