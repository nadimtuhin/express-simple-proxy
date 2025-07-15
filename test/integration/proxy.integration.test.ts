import express from 'express';
import request from 'supertest';
import multer from 'multer';
import { createProxyController } from '../../src/proxy';
import { ProxyConfig } from '../../src/types';
import testServer from './test-server';

describe('Proxy Integration Tests', () => {
  let app: express.Application;
  let testServerInstance: any;
  let testServerPort: number;
  let testServerUrl: string;

  beforeAll(async () => {
    // Start test server
    testServerInstance = testServer.listen(0);
    testServerPort = testServerInstance.address().port;
    testServerUrl = `http://localhost:${testServerPort}`;
  });

  afterAll(async () => {
    if (testServerInstance) {
      testServerInstance.close();
    }
  });

  beforeEach(() => {
    // Create Express app with proxy middleware
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Configure multer for file uploads
    const storage = multer.memoryStorage();
    const upload = multer({ storage });
    app.use(upload.any());
  });

  describe('Basic Proxy Functionality', () => {
    it('should proxy GET requests successfully', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({ 'User-Agent': 'test-proxy' }),
      };

      const proxy = createProxyController(config);
      app.get('/health', proxy() as any);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });

    it('should proxy GET requests with query parameters', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.get('/users', proxy() as any);

      const response = await request(app)
        .get('/users?page=1&limit=5&search=john')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('John');
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 5,
        total: 1,
        pages: 1,
      });
    });

    it('should proxy GET requests with path parameters', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.get('/users/:id', proxy() as any);

      const response = await request(app)
        .get('/users/1')
        .expect(200);

      expect(response.body.data).toEqual({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should proxy POST requests with JSON body', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({ 'Content-Type': 'application/json' }),
      };

      const proxy = createProxyController(config);
      app.post('/users', proxy() as any);

      const userData = {
        name: 'Alice Johnson',
        email: 'alice@example.com',
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body.data).toEqual({
        id: expect.any(Number),
        name: 'Alice Johnson',
        email: 'alice@example.com',
      });
      expect(response.body.message).toBe('User created successfully');
    });

    it('should proxy PUT requests', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({ 'Content-Type': 'application/json' }),
      };

      const proxy = createProxyController(config);
      app.put('/users/:id', proxy() as any);

      const userData = {
        name: 'John Updated',
        email: 'john.updated@example.com',
      };

      const response = await request(app)
        .put('/users/1')
        .send(userData)
        .expect(200);

      expect(response.body.data).toEqual({
        id: 1,
        name: 'John Updated',
        email: 'john.updated@example.com',
      });
    });

    it('should proxy DELETE requests', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.delete('/users/:id', proxy() as any);

      await request(app)
        .delete('/users/2')
        .expect(204);
    });
  });

  describe('File Upload Proxy', () => {
    it('should proxy single file upload', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.post('/upload', proxy() as any);

      const response = await request(app)
        .post('/upload')
        .attach('file', Buffer.from('test file content'), 'test.txt')
        .expect(200);

      expect(response.body.data).toEqual({
        filename: 'test.txt',
        mimetype: 'text/plain',
        size: expect.any(Number),
        fieldname: 'file',
      });
    });

    it('should proxy multiple file upload', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.post('/upload-multiple', proxy() as any);

      const response = await request(app)
        .post('/upload-multiple')
        .attach('files', Buffer.from('file 1 content'), 'file1.txt')
        .attach('files', Buffer.from('file 2 content'), 'file2.txt')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].filename).toBe('file1.txt');
      expect(response.body.data[1].filename).toBe('file2.txt');
    });

    it('should proxy form data with file and fields', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.post('/form-data', proxy() as any);

      const response = await request(app)
        .post('/form-data')
        .field('name', 'John Doe')
        .field('email', 'john@example.com')
        .field('description', 'Test description')
        .attach('avatar', Buffer.from('avatar content'), 'avatar.jpg')
        .expect(200);

      expect(response.body.data).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        description: 'Test description',
        avatar: {
          filename: 'avatar.jpg',
          mimetype: 'image/jpeg',
          size: expect.any(Number),
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should proxy 400 errors', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.get('/error/400', proxy() as any);

      const response = await request(app)
        .get('/error/400')
        .expect(400);

      expect(response.body.error).toEqual({
        message: 'This is a simulated 400 error',
        code: 'UNKNOWN_ERROR',
        details: {
          error: 'Bad Request',
          message: 'This is a simulated 400 error',
        },
      });
    });

    it('should proxy 404 errors', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.get('/error/404', proxy() as any);

      const response = await request(app)
        .get('/error/404')
        .expect(404);

      expect(response.body.error).toEqual({
        message: 'This is a simulated 404 error',
        code: 'UNKNOWN_ERROR',
        details: {
          error: 'Not Found',
          message: 'This is a simulated 404 error',
        },
      });
    });

    it('should proxy 500 errors', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.get('/error/500', proxy() as any);

      const response = await request(app)
        .get('/error/500')
        .expect(500);

      expect(response.body.error).toEqual({
        message: 'This is a simulated 500 error',
        code: 'UNKNOWN_ERROR',
        details: {
          error: 'Internal Server Error',
          message: 'This is a simulated 500 error',
        },
      });
    });

    it('should handle custom error handler', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
        errorHandler: (error, _req, res) => {
          res.status(error.status || 500).json({
            success: false,
            error: {
              message: error.message,
              timestamp: new Date().toISOString(),
            },
          });
        },
      };

      const proxy = createProxyController(config);
      app.get('/error/400', proxy() as any);

      const response = await request(app)
        .get('/error/400')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'This is a simulated 400 error',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle error handler hook', async () => {
      const errorHandlerHook = jest.fn().mockImplementation((error) => {
        error.context = 'Added by hook';
        return error;
      });

      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
        errorHandlerHook,
      };

      const proxy = createProxyController(config);
      app.get('/error/400', proxy() as any);

      await request(app)
        .get('/error/400')
        .expect(400);

      expect(errorHandlerHook).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: 'This is a simulated 400 error',
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('Custom Response Handling', () => {
    it('should handle custom response handler', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const customHandler = jest.fn().mockImplementation((_req, res, remoteResponse) => {
        res.status(remoteResponse.status).json({
          success: true,
          data: remoteResponse.data.data,
          timestamp: new Date().toISOString(),
        });
      });

      const proxy = createProxyController(config);
      app.get('/users/:id', proxy(undefined, customHandler) as any);

      const response = await request(app)
        .get('/users/1')
        .expect(200);

      expect(customHandler).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: true,
        data: {
          id: 1,
          name: expect.any(String),
          email: expect.any(String),
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle boolean handler (return raw response)', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.get('/users/:id', proxy(undefined, true) as any);

      const response = await request(app)
        .get('/users/1')
        .expect(200);

      expect(response.body).toEqual({
        data: {
          id: 1,
          name: expect.any(String),
          email: expect.any(String),
        },
      });
    });
  });

  describe('Header Handling', () => {
    it('should forward request headers', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: (req) => ({
          'Authorization': req.headers.authorization || '',
          'X-Custom-Header': (req.headers['x-custom-header'] as string) || '',
          'User-Agent': 'express-simple-proxy',
        }),
      };

      const proxy = createProxyController(config);
      app.get('/headers', proxy() as any);

      const response = await request(app)
        .get('/headers')
        .set('Authorization', 'Bearer token123')
        .set('X-Custom-Header', 'custom-value')
        .expect(200);

      expect(response.body.data.authorization).toBe('Bearer token123');
      expect(response.body.data.customHeader).toBe('custom-value');
      expect(response.body.data.userAgent).toBe('express-simple-proxy');
    });

    it('should handle response headers configuration', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
        responseHeaders: () => ({
          'X-Proxy-Response': 'true',
          'X-Timestamp': new Date().toISOString(),
        }),
      };

      const proxy = createProxyController(config);
      app.get('/users/1', proxy() as any);

      const response = await request(app)
        .get('/users/1')
        .expect(200);

      expect(response.headers['x-proxy-response']).toBe('true');
      expect(response.headers['x-timestamp']).toBeDefined();
    });

    it('should forward rate limit headers', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
        errorHandler: (error, _req, res) => {
          // Forward rate limiting headers
          if (error.status === 429 && error.headers) {
            ['retry-after', 'x-ratelimit-remaining', 'x-ratelimit-reset'].forEach(header => {
              if (error.headers![header]) {
                res.set(header, error.headers![header]);
              }
            });
          }
          
          res.status(error.status || 500).json({
            error: error.message,
            retryAfter: error.headers?.['retry-after'],
          });
        },
      };

      const proxy = createProxyController(config);
      app.get('/rate-limit', proxy() as any);

      // Make requests to trigger rate limiting
      await request(app).get('/rate-limit').expect(200);
      await request(app).get('/rate-limit').expect(200);
      await request(app).get('/rate-limit').expect(200);
      
      const response = await request(app)
        .get('/rate-limit')
        .expect(429);

      expect(response.headers['retry-after']).toBe('60');
      expect(response.headers['x-ratelimit-remaining']).toBe('0');
      expect(response.body.retryAfter).toBe('60');
    });
  });

  describe('Advanced Features', () => {
    it('should handle custom proxy path mapping', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.get('/api/v1/users/:id', proxy('/users/:id') as any);

      const response = await request(app)
        .get('/api/v1/users/1')
        .expect(200);

      expect(response.body.data.id).toBe(1);
    });

    it('should handle timeout configuration', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
        timeout: 1000, // 1 second timeout
      };

      const proxy = createProxyController(config);
      app.get('/timeout', proxy() as any);

      const response = await request(app)
        .get('/timeout?delay=2000') // 2 second delay
        .expect(503);

      expect(response.body.error.code).toBe('NETWORK_ERROR');
    });

  });

  describe('Edge Cases', () => {
    it('should handle empty response body', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.delete('/users/:id', proxy() as any);

      await request(app)
        .delete('/users/1')
        .expect(204);
    });

    it('should handle non-existent endpoints', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({}),
      };

      const proxy = createProxyController(config);
      app.get('/non-existent', proxy() as any);

      const response = await request(app)
        .get('/non-existent')
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });

    it('should handle large JSON payloads', async () => {
      const config: ProxyConfig = {
        baseURL: testServerUrl,
        headers: () => ({ 'Content-Type': 'application/json' }),
      };

      const proxy = createProxyController(config);
      app.post('/users', proxy() as any);

      const largeData = {
        name: 'Test User',
        email: 'test@example.com',
        description: 'A'.repeat(1000), // 1KB description
      };

      const response = await request(app)
        .post('/users')
        .send(largeData)
        .expect(201);

      expect(response.body.data.name).toBe('Test User');
      expect(response.body.data.email).toBe('test@example.com');
    });
  });
});