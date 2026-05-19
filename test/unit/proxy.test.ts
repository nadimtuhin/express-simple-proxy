import nock from 'nock';
import { Response } from 'express';
import { axiosProxyRequest, createProxyController, defaultErrorHandler } from '../../src/proxy';
import { ProxyConfig, ProxyError, RequestWithFiles } from '../../src/types';

describe('Proxy', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  describe('axiosProxyRequest', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'John Doe' };
      nock('http://example.com').get('/api/users/1').reply(200, mockData);

      const payload = {
        url: 'http://example.com/api/users/1',
        method: 'GET',
        headers: {},
        timeout: 5000,
      };

      const response = await axiosProxyRequest(payload);
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockData);
    });

    it('should make successful POST request', async () => {
      const requestData = { name: 'John Doe' };
      const responseData = { id: 1, name: 'John Doe' };

      nock('http://example.com').post('/api/users', requestData).reply(201, responseData);

      const payload = {
        url: 'http://example.com/api/users',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(requestData),
        timeout: 5000,
      };

      const response = await axiosProxyRequest(payload);
      expect(response.status).toBe(201);
      expect(response.data).toEqual(responseData);
    });

    it('should handle 404 error', async () => {
      nock('http://example.com').get('/api/users/999').reply(404, { message: 'User not found' });

      const payload = {
        url: 'http://example.com/api/users/999',
        method: 'GET',
        headers: {},
        timeout: 5000,
      };

      await expect(axiosProxyRequest(payload)).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });

    it('should handle 500 error', async () => {
      nock('http://example.com').get('/api/users').reply(500, { message: 'Internal server error' });

      const payload = {
        url: 'http://example.com/api/users',
        method: 'GET',
        headers: {},
        timeout: 5000,
      };

      await expect(axiosProxyRequest(payload)).rejects.toMatchObject({
        status: 500,
        message: 'Internal server error',
      });
    });

    it('should handle network error', async () => {
      nock('http://example.com').get('/api/users').replyWithError('Network error');

      const payload = {
        url: 'http://example.com/api/users',
        method: 'GET',
        headers: {},
        timeout: 5000,
      };

      await expect(axiosProxyRequest(payload)).rejects.toMatchObject({
        status: 503,
        code: 'NETWORK_ERROR',
        message: 'Network error: No response received',
      });
    });

    it('should handle timeout', async () => {
      nock('http://example.com').get('/api/users').delay(6000).reply(200, {});

      const payload = {
        url: 'http://example.com/api/users',
        method: 'GET',
        headers: {},
        timeout: 1000,
      };

      await expect(axiosProxyRequest(payload)).rejects.toMatchObject({
        status: 503,
        code: 'UPSTREAM_TIMEOUT',
      });
    });

    it('should throw error for missing URL', async () => {
      const payload = {
        url: '',
        method: 'GET',
        headers: {},
        timeout: 5000,
      };

      await expect(axiosProxyRequest(payload)).rejects.toThrow(
        'url is required for axiosProxyRequest'
      );
    });
  });

  describe('defaultErrorHandler', () => {
    let mockRes: Partial<Response>;
    let mockReq: RequestWithFiles;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      };
      mockReq = {} as RequestWithFiles;
    });

    it('should handle basic error', () => {
      const error: ProxyError = new Error('Test error');
      error.status = 400;
      error.code = 'BAD_REQUEST';

      defaultErrorHandler(error, mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Test error',
          code: 'BAD_REQUEST',
        },
      });
    });

    it('should handle error with data', () => {
      const error: ProxyError = new Error('Validation error');
      error.status = 422;
      error.code = 'VALIDATION_ERROR';
      error.data = { field: 'name', message: 'required' };

      defaultErrorHandler(error, mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: { field: 'name', message: 'required' },
        },
      });
    });

    it('should handle error with headers', () => {
      const error: ProxyError = new Error('Rate limited');
      error.status = 429;
      error.headers = {
        'retry-after': '60',
        'x-ratelimit-remaining': '0',
        'content-length': '100',
      };

      defaultErrorHandler(error, mockReq as any, mockRes as Response);

      expect(mockRes.set).toHaveBeenCalledWith('retry-after', '60');
      expect(mockRes.set).toHaveBeenCalledWith('x-ratelimit-remaining', '0');
      expect(mockRes.set).not.toHaveBeenCalledWith('content-length', '100');
    });

    it('should use default values for missing properties', () => {
      const error: ProxyError = new Error();

      defaultErrorHandler(error, mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          message: 'Internal server error',
          code: 'UNKNOWN_ERROR',
        },
      });
    });
  });

  describe('createProxyController', () => {
    let mockReq: RequestWithFiles;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        path: '/users',
        query: {},
        params: {},
        body: {},
        is: jest.fn(),
        locals: {},
      } as any;

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      };

      mockNext = jest.fn();
    });

    it('should validate required config', () => {
      expect(() => createProxyController(null as any)).toThrow('config is required');
    });

    it('should validate baseURL', () => {
      const config = {
        headers: () => ({}),
      } as any;

      expect(() => createProxyController(config)).toThrow('config.baseURL is required');
    });

    it('should validate headers function', () => {
      const config = {
        baseURL: 'http://example.com',
        headers: 'not-a-function',
      } as any;

      expect(() => createProxyController(config)).toThrow('config.headers must be a function');
    });

    it('should validate errorHandler function', () => {
      const config = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        errorHandler: 'not-a-function',
      } as any;

      expect(() => createProxyController(config)).toThrow('config.errorHandler must be a function');
    });

    it('should validate errorHandlerHook function', () => {
      const config = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        errorHandlerHook: 'not-a-function',
      } as any;

      expect(() => createProxyController(config)).toThrow(
        'config.errorHandlerHook must be a function'
      );
    });

    it('should create proxy controller with valid config', () => {
      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({ Authorization: 'Bearer token' }),
      };

      const controller = createProxyController(config);
      expect(typeof controller).toBe('function');

      const middleware = controller();
      expect(typeof middleware).toBe('function');
    });

    it('should handle successful GET request', async () => {
      const mockData = { id: 1, name: 'John' };
      nock('http://example.com').get('/users').reply(200, mockData);

      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({ Authorization: 'Bearer token' }),
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle custom proxy path', async () => {
      const mockData = { id: 1, name: 'John' };
      nock('http://example.com').get('/api/users').reply(200, mockData);

      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
      };

      const controller = createProxyController(config);
      const middleware = controller('/api/users');

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should handle URL parameters', async () => {
      const mockData = { id: 123, name: 'John' };
      nock('http://example.com').get('/api/users/123').reply(200, mockData);

      mockReq.params = { id: '123' };

      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
      };

      const controller = createProxyController(config);
      const middleware = controller('/api/users/:id');

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should handle query parameters', async () => {
      const mockData = { users: [] };
      nock('http://example.com')
        .get('/users')
        .query({ page: '1', limit: '10' })
        .reply(200, mockData);

      mockReq.query = { page: '1', limit: '10' };

      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should handle POST request with JSON body', async () => {
      const requestData = { name: 'John Doe' };
      const responseData = { id: 1, name: 'John Doe' };

      nock('http://example.com').post('/users', requestData).reply(201, responseData);

      mockReq.method = 'POST';
      mockReq.body = requestData;
      mockReq.is = jest.fn().mockReturnValue(false);

      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({ 'Content-Type': 'application/json' }),
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(responseData);
    });

    it('should handle custom response handler', async () => {
      const mockData = { id: 1, name: 'John' };
      nock('http://example.com').get('/users').reply(200, mockData);

      const customHandler = jest.fn();
      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
      };

      const controller = createProxyController(config);
      const middleware = controller(undefined, customHandler);

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(customHandler).toHaveBeenCalledWith(
        mockReq,
        mockRes,
        expect.objectContaining({
          status: 200,
          data: mockData,
        })
      );
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle errors with custom error handler', async () => {
      nock('http://example.com').get('/users').reply(500, { message: 'Server error' });

      const customErrorHandler = jest.fn();
      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        errorHandler: customErrorHandler,
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(customErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
          message: 'Server error',
        }),
        mockReq,
        mockRes
      );
    });

    it('should handle errors with error handler hook', async () => {
      nock('http://example.com').get('/users').reply(500, { message: 'Server error' });

      const customErrorHandler = jest.fn();
      const errorHandlerHook = jest.fn().mockImplementation(error => {
        error.context = 'Added by hook';
        return error;
      });

      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        errorHandler: customErrorHandler,
        errorHandlerHook,
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(errorHandlerHook).toHaveBeenCalled();
      expect(customErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
          message: 'Server error',
          context: 'Added by hook',
        }),
        mockReq,
        mockRes
      );
    });

    it('should handle response headers configuration', async () => {
      const mockData = { id: 1, name: 'John' };
      nock('http://example.com').get('/users').reply(200, mockData, { 'x-custom-header': 'value' });

      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        responseHeaders: response => ({
          'x-forwarded-header': response.headers['x-custom-header'],
        }),
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({
        'x-forwarded-header': 'value',
      });
    });
  });

  describe('beforeRequest hook', () => {
    let mockReq: RequestWithFiles;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        path: '/users',
        query: {},
        params: {},
        body: {},
        is: jest.fn(),
        locals: {},
      } as any;
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it('should short-circuit and return custom response without hitting upstream', async () => {
      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        beforeRequest: () => ({ status: 202, data: { cached: true } }),
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(202);
      expect(mockRes.json).toHaveBeenCalledWith({ cached: true });
    });

    it('should short-circuit with custom headers', async () => {
      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        beforeRequest: () => ({
          status: 200,
          data: { ok: true },
          headers: { 'x-cache': 'HIT' },
        }),
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith({ 'x-cache': 'HIT' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should proceed to upstream when hook returns void', async () => {
      const mockData = { id: 1 };
      nock('http://example.com').get('/users').reply(200, mockData);

      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        beforeRequest: () => undefined,
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should allow hook to mutate payload headers', async () => {
      nock('http://example.com')
        .get('/users')
        .matchHeader('x-injected', 'yes')
        .reply(200, { ok: true });

      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        beforeRequest: payload => {
          payload.headers['x-injected'] = 'yes';
        },
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('onResponse callback', () => {
    let mockReq: RequestWithFiles;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        path: '/users',
        query: {},
        params: {},
        body: {},
        is: jest.fn(),
        locals: {},
      } as any;
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it('should call onResponse with upstream stats on success', async () => {
      nock('http://example.com').get('/users').reply(200, { id: 1 });

      const onResponse = jest.fn();
      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        onResponse,
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(onResponse).toHaveBeenCalledTimes(1);
      const stats = onResponse.mock.calls[0][0];
      expect(stats.status).toBe(200);
      expect(stats.source).toBe('upstream');
      expect(typeof stats.durationMs).toBe('number');
      expect(stats.method).toBe('GET');
    });

    it('should call onResponse with short-circuit stats', async () => {
      const onResponse = jest.fn();
      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        beforeRequest: () => ({ status: 202, data: {} }),
        onResponse,
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(onResponse).toHaveBeenCalledTimes(1);
      expect(onResponse.mock.calls[0][0].source).toBe('short-circuit');
      expect(onResponse.mock.calls[0][0].status).toBe(202);
    });

    it('should call onResponse on error path', async () => {
      nock('http://example.com').get('/users').reply(404, { message: 'Not found' });

      const onResponse = jest.fn();
      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        onResponse,
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(onResponse).toHaveBeenCalledTimes(1);
      expect(onResponse.mock.calls[0][0].status).toBe(404);
      expect(onResponse.mock.calls[0][0].source).toBe('upstream');
    });

    it('should fire exactly once per request', async () => {
      nock('http://example.com').get('/users').reply(200, { id: 1 });

      const onResponse = jest.fn();
      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        onResponse,
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await middleware(mockReq, mockRes as Response, mockNext);

      expect(onResponse).toHaveBeenCalledTimes(1);
    });

    it('should swallow errors thrown by onResponse callback', async () => {
      nock('http://example.com').get('/users').reply(200, { id: 1 });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
        onResponse: () => {
          throw new Error('callback fail');
        },
      };

      const controller = createProxyController(config);
      const middleware = controller();

      await expect(middleware(mockReq, mockRes as Response, mockNext)).resolves.toBeUndefined();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('granular error codes', () => {
    it('should set UPSTREAM_AUTH code for 401 responses', async () => {
      nock('http://example.com').get('/users').reply(401, { message: 'Unauthorized' });

      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
      };

      const mockReq = {
        method: 'GET',
        path: '/users',
        query: {},
        params: {},
        body: {},
        is: jest.fn(),
        locals: {},
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const mockNext = jest.fn();

      const controller = createProxyController(config);
      await controller()(mockReq, mockRes, mockNext);

      const jsonArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg.error.code).toBe('UPSTREAM_AUTH');
    });

    it('should set UPSTREAM_AUTH code for 403 responses', async () => {
      nock('http://example.com').get('/users').reply(403, { message: 'Forbidden' });

      const config: ProxyConfig = {
        baseURL: 'http://example.com',
        headers: () => ({}),
      };

      const mockReq = {
        method: 'GET',
        path: '/users',
        query: {},
        params: {},
        body: {},
        is: jest.fn(),
        locals: {},
      } as any;
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const mockNext = jest.fn();

      const controller = createProxyController(config);
      await controller()(mockReq, mockRes, mockNext);

      const jsonArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg.error.code).toBe('UPSTREAM_AUTH');
    });
  });
});
