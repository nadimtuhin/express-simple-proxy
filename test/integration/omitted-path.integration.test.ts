import express from 'express';
import request from 'supertest';
import nock from 'nock';
import { createProxyController } from '../../src/proxy';
import { ProxyConfig } from '../../src/types';

describe('Omitted Proxy Path Integration Tests', () => {
  let app: express.Application;
  let baseURL: string;
  let config: ProxyConfig;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    baseURL = 'http://api.example.com';
    config = {
      baseURL,
      headers: () => ({ 'User-Agent': 'test-proxy' }),
    };
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Direct Path Mapping (Omitted Proxy Path)', () => {
    it('should proxy GET request to same path when proxy path is omitted', async () => {
      const mockData = { users: [{ id: 1, name: 'John' }] };
      nock(baseURL)
        .get('/api/users')
        .reply(200, mockData);

      const proxy = createProxyController(config);
      app.get('/api/users', proxy() as any);

      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body).toEqual(mockData);
    });

    it('should proxy POST request to same path when proxy path is omitted', async () => {
      const postData = { name: 'Jane Doe', email: 'jane@example.com' };
      const responseData = { id: 2, ...postData };
      
      nock(baseURL)
        .post('/api/users', postData)
        .reply(201, responseData);

      const proxy = createProxyController(config);
      app.post('/api/users', proxy() as any);

      const response = await request(app)
        .post('/api/users')
        .send(postData)
        .expect(201);

      expect(response.body).toEqual(responseData);
    });

    it('should proxy PUT request to same path when proxy path is omitted', async () => {
      const putData = { name: 'John Updated', email: 'john.updated@example.com' };
      const responseData = { id: 1, ...putData };
      
      nock(baseURL)
        .put('/api/users/1', putData)
        .reply(200, responseData);

      const proxy = createProxyController(config);
      app.put('/api/users/:id', proxy() as any);

      const response = await request(app)
        .put('/api/users/1')
        .send(putData)
        .expect(200);

      expect(response.body).toEqual(responseData);
    });

    it('should proxy DELETE request to same path when proxy path is omitted', async () => {
      nock(baseURL)
        .delete('/api/users/1')
        .reply(204);

      const proxy = createProxyController(config);
      app.delete('/api/users/:id', proxy() as any);

      await request(app)
        .delete('/api/users/1')
        .expect(204);
    });

    it('should handle path parameters correctly with omitted proxy path', async () => {
      const mockData = { id: 123, name: 'John', email: 'john@example.com' };
      nock(baseURL)
        .get('/api/users/123')
        .reply(200, mockData);

      const proxy = createProxyController(config);
      app.get('/api/users/:id', proxy() as any);

      const response = await request(app)
        .get('/api/users/123')
        .expect(200);

      expect(response.body).toEqual(mockData);
    });

    it('should handle nested path parameters with omitted proxy path', async () => {
      const mockData = { id: 456, userId: 123, product: 'Laptop' };
      nock(baseURL)
        .get('/api/users/123/orders/456')
        .reply(200, mockData);

      const proxy = createProxyController(config);
      app.get('/api/users/:userId/orders/:orderId', proxy() as any);

      const response = await request(app)
        .get('/api/users/123/orders/456')
        .expect(200);

      expect(response.body).toEqual(mockData);
    });

    it('should handle query parameters with omitted proxy path', async () => {
      const mockData = { users: [], page: 1, limit: 10 };
      nock(baseURL)
        .get('/api/users')
        .query({ page: '1', limit: '10', sort: 'name' })
        .reply(200, mockData);

      const proxy = createProxyController(config);
      app.get('/api/users', proxy() as any);

      const response = await request(app)
        .get('/api/users?page=1&limit=10&sort=name')
        .expect(200);

      expect(response.body).toEqual(mockData);
    });
  });

  describe('API Gateway Pattern with Omitted Paths', () => {
    it('should handle multiple service controllers with omitted paths', async () => {
      const userService = createProxyController({
        baseURL: 'http://user-service.internal',
        headers: () => ({ 'Service': 'user-service' }),
      });

      const orderService = createProxyController({
        baseURL: 'http://order-service.internal',
        headers: () => ({ 'Service': 'order-service' }),
      });

      // Mock both services
      nock('http://user-service.internal')
        .get('/api/users')
        .reply(200, { users: [{ id: 1, name: 'John' }] });

      nock('http://order-service.internal')
        .get('/api/orders')
        .reply(200, { orders: [{ id: 1, userId: 1, total: 100 }] });

      // Setup routes with omitted paths
      app.get('/api/users', userService() as any);
      app.get('/api/orders', orderService() as any);

      // Test user service
      const userResponse = await request(app)
        .get('/api/users')
        .expect(200);
      expect(userResponse.body).toEqual({ users: [{ id: 1, name: 'John' }] });

      // Test order service
      const orderResponse = await request(app)
        .get('/api/orders')
        .expect(200);
      expect(orderResponse.body).toEqual({ orders: [{ id: 1, userId: 1, total: 100 }] });
    });

    it('should handle REST API pattern with omitted paths', async () => {
      const mockUser = { id: 1, name: 'John', email: 'john@example.com' };
      const mockUsers = [mockUser];
      const newUser = { name: 'Jane', email: 'jane@example.com' };
      const createdUser = { id: 2, ...newUser };

      // Mock all CRUD operations
      nock(baseURL)
        .get('/api/users')
        .reply(200, mockUsers);

      nock(baseURL)
        .get('/api/users/1')
        .reply(200, mockUser);

      nock(baseURL)
        .post('/api/users', newUser)
        .reply(201, createdUser);

      nock(baseURL)
        .put('/api/users/1', mockUser)
        .reply(200, mockUser);

      nock(baseURL)
        .delete('/api/users/1')
        .reply(204);

      const proxy = createProxyController(config);

      // Setup REST routes with omitted paths
      app.get('/api/users', proxy() as any);
      app.get('/api/users/:id', proxy() as any);
      app.post('/api/users', proxy() as any);
      app.put('/api/users/:id', proxy() as any);
      app.delete('/api/users/:id', proxy() as any);

      // Test all CRUD operations
      await request(app).get('/api/users').expect(200);
      await request(app).get('/api/users/1').expect(200);
      await request(app).post('/api/users').send(newUser).expect(201);
      await request(app).put('/api/users/1').send(mockUser).expect(200);
      await request(app).delete('/api/users/1').expect(204);
    });
  });

  describe('Complex Path Scenarios', () => {
    it('should handle deeply nested paths with omitted proxy path', async () => {
      const mockData = { 
        id: 'doc-123', 
        tenantId: 'tenant-456', 
        userId: 'user-789',
        content: 'Document content'
      };

      nock(baseURL)
        .get('/api/tenants/tenant-456/users/user-789/documents/doc-123')
        .reply(200, mockData);

      const proxy = createProxyController(config);
      app.get('/api/tenants/:tenantId/users/:userId/documents/:docId', proxy() as any);

      const response = await request(app)
        .get('/api/tenants/tenant-456/users/user-789/documents/doc-123')
        .expect(200);

      expect(response.body).toEqual(mockData);
    });

    it('should handle mixed path patterns in same application', async () => {
      // Mock responses for different path patterns
      nock(baseURL)
        .get('/api/users/1')
        .reply(200, { id: 1, name: 'John' });

      nock(baseURL)
        .get('/api/admin/users')
        .reply(200, { users: [], isAdmin: true });

      nock(baseURL)
        .get('/internal/health-check')
        .reply(200, { status: 'ok' });

      const proxy = createProxyController(config);

      // Mix of omitted and explicit paths
      app.get('/api/users/:id', proxy() as any);              // Omitted - direct mapping
      app.get('/dashboard/users', proxy('/api/admin/users') as any);  // Explicit - path mapping
      app.get('/health', proxy('/internal/health-check') as any);     // Explicit - different path

      // Test all patterns
      await request(app).get('/api/users/1').expect(200);
      await request(app).get('/dashboard/users').expect(200);
      await request(app).get('/health').expect(200);
    });

    it('should preserve request headers with omitted proxy path', async () => {
      nock(baseURL)
        .get('/api/users')
        .matchHeader('authorization', 'Bearer token123')
        .matchHeader('user-agent', 'test-proxy')
        .reply(200, { users: [] });

      const proxy = createProxyController({
        baseURL,
        headers: (req) => ({
          'Authorization': req.headers.authorization as string,
          'User-Agent': 'test-proxy',
        }),
      });

      app.get('/api/users', proxy() as any);

      await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer token123')
        .expect(200);
    });

    it('should handle errors correctly with omitted proxy path', async () => {
      nock(baseURL)
        .get('/api/users/999')
        .reply(404, { error: 'User not found' });

      const proxy = createProxyController(config);
      app.get('/api/users/:id', proxy() as any);

      const response = await request(app)
        .get('/api/users/999')
        .expect(404);

      expect(response.body).toEqual({
        error: {
          message: 'Request failed with status code 404',
          code: 'UNKNOWN_ERROR',
          details: { error: 'User not found' },
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle root path with omitted proxy path', async () => {
      nock(baseURL)
        .get('/')
        .reply(200, { message: 'API Root' });

      const proxy = createProxyController(config);
      app.get('/', proxy() as any);

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toEqual({ message: 'API Root' });
    });

    it('should handle paths with special characters and omitted proxy path', async () => {
      nock(baseURL)
        .get('/api/search')
        .query({ q: 'test@example.com' })
        .reply(200, { results: [] });

      const proxy = createProxyController(config);
      app.get('/api/search', proxy() as any);

      await request(app)
        .get('/api/search?q=test@example.com')
        .expect(200);
    });

    it('should handle multiple proxy controllers with omitted paths', async () => {
      const serviceA = createProxyController({
        baseURL: 'http://service-a.internal',
        headers: () => ({ 'Service': 'A' }),
      });

      const serviceB = createProxyController({
        baseURL: 'http://service-b.internal',
        headers: () => ({ 'Service': 'B' }),
      });

      nock('http://service-a.internal')
        .get('/api/data')
        .reply(200, { service: 'A', data: 'test' });

      nock('http://service-b.internal')
        .get('/api/data')
        .reply(200, { service: 'B', data: 'test' });

      // Different apps/routers with omitted paths
      const routerA = express.Router();
      const routerB = express.Router();

      routerA.get('/api/data', serviceA() as any);
      routerB.get('/api/data', serviceB() as any);

      app.use('/service-a', routerA);
      app.use('/service-b', routerB);

      const responseA = await request(app)
        .get('/service-a/api/data')
        .expect(200);
      expect(responseA.body).toEqual({ service: 'A', data: 'test' });

      const responseB = await request(app)
        .get('/service-b/api/data')
        .expect(200);
      expect(responseB.body).toEqual({ service: 'B', data: 'test' });
    });
  });
});