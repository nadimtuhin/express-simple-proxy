/**
 * Omitted Proxy Path Examples
 * 
 * This example demonstrates various scenarios where omitting the proxy path
 * parameter results in cleaner, more maintainable code. When you omit the
 * proxy path, the middleware uses the original request path directly.
 */

import express from 'express';
import { createProxyController } from '../src';

const app = express();
app.use(express.json());

// ============================================================================
// Example 1: Simple API Gateway with Direct Path Mapping
// ============================================================================

console.log('🚀 Example 1: Simple API Gateway');

const userService = createProxyController({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: (req) => ({
    'User-Agent': 'express-simple-proxy-example',
    'X-Forwarded-For': req.ip,
  })
});

// Direct mapping - request paths match backend paths exactly
app.get('/posts', userService());           // → https://jsonplaceholder.typicode.com/posts
app.get('/posts/:id', userService());       // → https://jsonplaceholder.typicode.com/posts/:id
app.get('/users', userService());           // → https://jsonplaceholder.typicode.com/users
app.get('/users/:id', userService());       // → https://jsonplaceholder.typicode.com/users/:id
app.get('/comments', userService());        // → https://jsonplaceholder.typicode.com/comments

// ============================================================================
// Example 2: Multi-Service Architecture
// ============================================================================

console.log('🏗️ Example 2: Multi-Service Architecture');

// Mock different services with different base URLs
const authService = createProxyController({
  baseURL: process.env.AUTH_SERVICE_URL || 'https://auth-api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Service': 'auth-service',
  })
});

const productService = createProxyController({
  baseURL: process.env.PRODUCT_SERVICE_URL || 'https://product-api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Service': 'product-service',
  })
});

const orderService = createProxyController({
  baseURL: process.env.ORDER_SERVICE_URL || 'https://order-api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Service': 'order-service',
  })
});

// Each service handles its own namespace with omitted paths
app.post('/api/auth/login', authService());
app.post('/api/auth/register', authService());
app.get('/api/auth/profile', authService());

app.get('/api/products', productService());
app.get('/api/products/:id', productService());
app.post('/api/products', productService());
app.put('/api/products/:id', productService());

app.get('/api/orders', orderService());
app.post('/api/orders', orderService());
app.get('/api/orders/:id', orderService());

// ============================================================================
// Example 3: Development Environment Mirror
// ============================================================================

console.log('🔧 Example 3: Development Environment Mirror');

const devProxy = createProxyController({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://api.company.com'
    : 'https://api-dev.company.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Environment': process.env.NODE_ENV || 'development',
    'X-Request-ID': generateRequestId(),
  })
});

// Development middleware
if (process.env.NODE_ENV === 'development') {
  app.use('/api', (req, res, next) => {
    console.log(`[DEV] ${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Mirror production API structure exactly in development
app.get('/api/v1/users', devProxy());
app.post('/api/v1/users', devProxy());
app.get('/api/v1/users/:id', devProxy());
app.put('/api/v1/users/:id', devProxy());
app.delete('/api/v1/users/:id', devProxy());

app.get('/api/v1/analytics/dashboard', devProxy());
app.get('/api/v1/reports/sales', devProxy());

// ============================================================================
// Example 4: Multi-Tenant SaaS Application
// ============================================================================

console.log('🏢 Example 4: Multi-Tenant SaaS Application');

const tenantProxy = createProxyController({
  baseURL: 'https://tenant-api.saas.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Tenant-ID': req.params.tenantId,
    'X-Request-Source': 'api-gateway',
  })
});

// Tenant-scoped API endpoints
app.get('/api/tenants/:tenantId/users', tenantProxy());
app.post('/api/tenants/:tenantId/users', tenantProxy());
app.get('/api/tenants/:tenantId/users/:userId', tenantProxy());
app.put('/api/tenants/:tenantId/users/:userId', tenantProxy());
app.delete('/api/tenants/:tenantId/users/:userId', tenantProxy());

app.get('/api/tenants/:tenantId/projects', tenantProxy());
app.post('/api/tenants/:tenantId/projects', tenantProxy());
app.get('/api/tenants/:tenantId/projects/:projectId', tenantProxy());

app.get('/api/tenants/:tenantId/analytics/usage', tenantProxy());
app.get('/api/tenants/:tenantId/billing/invoices', tenantProxy());

// ============================================================================
// Example 5: REST API with Full CRUD Operations
// ============================================================================

console.log('📚 Example 5: REST API with Full CRUD Operations');

const crudProxy = createProxyController({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: (req) => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  })
});

// Complete REST API mapping for multiple resources
const resources = ['posts', 'users', 'albums', 'photos', 'todos'];

resources.forEach(resource => {
  app.get(`/${resource}`, crudProxy());              // List all
  app.get(`/${resource}/:id`, crudProxy());          // Get by ID
  app.post(`/${resource}`, crudProxy());             // Create
  app.put(`/${resource}/:id`, crudProxy());          // Update (full)
  app.patch(`/${resource}/:id`, crudProxy());        // Update (partial)
  app.delete(`/${resource}/:id`, crudProxy());       // Delete
});

// Nested resource relationships
app.get('/posts/:postId/comments', crudProxy());
app.get('/users/:userId/posts', crudProxy());
app.get('/users/:userId/albums', crudProxy());
app.get('/albums/:albumId/photos', crudProxy());

// ============================================================================
// Example 6: API Versioning with Consistent Paths
// ============================================================================

console.log('🔢 Example 6: API Versioning with Consistent Paths');

const v1Proxy = createProxyController({
  baseURL: 'https://api-v1.example.com',
  headers: (req) => ({
    'API-Version': '1.0',
    'Authorization': req.headers.authorization,
  })
});

const v2Proxy = createProxyController({
  baseURL: 'https://api-v2.example.com',
  headers: (req) => ({
    'API-Version': '2.0',
    'Authorization': req.headers.authorization,
  })
});

// Version 1 endpoints
app.get('/api/v1/users', v1Proxy());
app.get('/api/v1/users/:id', v1Proxy());
app.post('/api/v1/users', v1Proxy());

// Version 2 endpoints (same paths, different backend)
app.get('/api/v2/users', v2Proxy());
app.get('/api/v2/users/:id', v2Proxy());
app.post('/api/v2/users', v2Proxy());

// ============================================================================
// Example 7: Microservices with Service Discovery
// ============================================================================

console.log('🔍 Example 7: Microservices with Service Discovery');

// Factory function to create service proxies
const createServiceProxy = (serviceName: string, servicePort?: number) => {
  const baseURL = servicePort 
    ? `http://localhost:${servicePort}`
    : `https://${serviceName}.k8s.cluster.local`;

  return createProxyController({
    baseURL,
    headers: (req) => ({
      'Authorization': req.headers.authorization,
      'X-Correlation-ID': req.headers['x-correlation-id'] || generateRequestId(),
      'X-Service-Name': serviceName,
      'X-Request-Timestamp': new Date().toISOString(),
    })
  });
};

// Service instances
const userSvc = createServiceProxy('user-service', 3001);
const notificationSvc = createServiceProxy('notification-service', 3002);
const analyticsService = createServiceProxy('analytics-service', 3003);

// Service-specific routing with consistent paths
app.get('/api/users', userSvc());
app.get('/api/users/:id/notifications', notificationSvc());
app.post('/api/analytics/events', analyticsService());

// ============================================================================
// Example 8: Error Handling with Omitted Paths
// ============================================================================

console.log('⚠️ Example 8: Error Handling with Omitted Paths');

const resilientProxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
  }),
  errorHandler: (error, req, res) => {
    console.error(`Proxy error for ${req.method} ${req.path}:`, error.message);
    
    res.status(error.status || 500).json({
      success: false,
      error: {
        message: error.message,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      }
    });
  },
  errorHandlerHook: async (error, req, res) => {
    // Log to monitoring service
    await logToMonitoring({
      error: error.message,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    });
    
    return error;
  }
});

// Error-resilient endpoints
app.get('/api/users', resilientProxy());
app.get('/api/health', resilientProxy());

// ============================================================================
// Utility Functions
// ============================================================================

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

async function logToMonitoring(data: any): Promise<void> {
  // Mock monitoring service call
  console.log('📊 Monitoring:', JSON.stringify(data, null, 2));
}

// ============================================================================
// Server Setup and Documentation
// ============================================================================

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Express Simple Proxy - Omitted Path Examples',
    examples: [
      'GET /posts - Simple API Gateway',
      'GET /api/auth/profile - Multi-Service Architecture',
      'GET /api/v1/users - Development Environment Mirror',
      'GET /api/tenants/:tenantId/users - Multi-Tenant SaaS',
      'GET /users - REST API with CRUD Operations',
      'GET /api/v2/users - API Versioning',
      'GET /api/users - Microservices with Service Discovery',
      'GET /api/health - Error Handling'
    ],
    documentation: {
      'Omitted Path Pattern': 'When proxy path is omitted, uses request path directly',
      'Benefits': [
        'Zero configuration path mapping',
        'Consistent frontend/backend URLs',
        'Automatic parameter preservation',
        'Perfect for microservices'
      ],
      'Use Cases': [
        'API Gateways',
        'Service-to-service communication',
        'Development environment mirrors',
        'Multi-tenant applications'
      ]
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🌟 Express Simple Proxy Examples running on port ${PORT}`);
    console.log(`📖 Visit http://localhost:${PORT} for documentation`);
    console.log('');
    console.log('🔗 Example Endpoints:');
    console.log('  GET  /posts              - Proxy to JSONPlaceholder');
    console.log('  GET  /users              - Proxy to JSONPlaceholder');
    console.log('  GET  /api/v1/users       - Development mirror example');
    console.log('  GET  /api/tenants/1/users - Multi-tenant example');
    console.log('');
    console.log('💡 All examples use omitted proxy paths for direct URL mapping');
  });
}

export default app;