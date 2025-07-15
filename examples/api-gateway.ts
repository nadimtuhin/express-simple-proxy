/**
 * API Gateway Example with Omitted Proxy Paths
 * 
 * This example demonstrates a real-world API Gateway implementation using
 * omitted proxy paths. It showcases how to aggregate multiple microservices
 * behind a single frontend API using direct path mapping.
 * 
 * Run with: npm run example:api-gateway
 */

import express from 'express';
import { createProxyController } from '../src';

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Authentication middleware (mock)
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token && req.path.includes('/auth/')) {
    return next(); // Allow auth endpoints without token
  }
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // Mock token validation
  req.user = { id: 'user123', email: 'user@example.com' };
  next();
};

app.use(authenticateToken);

// ============================================================================
// Service Configuration
// ============================================================================

// Real external API for demonstration (JSONPlaceholder)
const jsonPlaceholderProxy = createProxyController({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: (req) => ({
    'User-Agent': 'API-Gateway/1.0',
    'X-Forwarded-For': req.ip,
    'X-Request-ID': generateRequestId(),
  }),
  errorHandler: (error, req, res) => {
    console.error(`❌ Proxy Error [${req.method} ${req.path}]:`, error.message);
    res.status(error.status || 500).json({
      success: false,
      error: {
        message: error.message,
        service: 'jsonplaceholder',
        path: req.path,
        timestamp: new Date().toISOString(),
      }
    });
  }
});

// Mock internal services (would be real microservices in production)
const userServiceProxy = createProxyController({
  baseURL: process.env.USER_SERVICE_URL || 'https://jsonplaceholder.typicode.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Service': 'user-service',
    'X-User-ID': req.user?.id,
    'X-Request-ID': generateRequestId(),
  }),
  timeout: 30000,
  errorHandler: (error, req, res) => {
    console.error(`❌ User Service Error:`, error.message);
    res.status(error.status || 500).json({
      success: false,
      error: {
        message: 'User service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
        retryAfter: 30,
      }
    });
  }
});

const contentServiceProxy = createProxyController({
  baseURL: process.env.CONTENT_SERVICE_URL || 'https://jsonplaceholder.typicode.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Service': 'content-service',
    'X-User-ID': req.user?.id,
    'Content-Type': 'application/json',
  }),
  errorHandlerHook: async (error, req, res) => {
    // Log to monitoring service
    await logServiceError('content-service', error, req);
    return error;
  }
});

// ============================================================================
// API Routes with Omitted Proxy Paths
// ============================================================================

// Authentication routes (public)
app.post('/api/auth/login', (req, res) => {
  // Mock login implementation
  res.json({
    success: true,
    token: 'mock-jwt-token-' + generateRequestId(),
    user: { id: 'user123', email: req.body.email }
  });
});

app.post('/api/auth/register', (req, res) => {
  // Mock registration implementation
  res.json({
    success: true,
    message: 'User registered successfully',
    user: { id: 'user' + Date.now(), email: req.body.email }
  });
});

// User Management Routes - Direct mapping to user service
console.log('🔧 Setting up User Management routes...');
app.get('/api/users', userServiceProxy());           // → https://user-service/api/users
app.get('/api/users/:id', userServiceProxy());       // → https://user-service/api/users/:id
app.post('/api/users', userServiceProxy());          // → https://user-service/api/users
app.put('/api/users/:id', userServiceProxy());       // → https://user-service/api/users/:id
app.delete('/api/users/:id', userServiceProxy());    // → https://user-service/api/users/:id

// Content Management Routes - Direct mapping to content service
console.log('📝 Setting up Content Management routes...');
app.get('/api/posts', contentServiceProxy());        // → https://content-service/api/posts
app.get('/api/posts/:id', contentServiceProxy());    // → https://content-service/api/posts/:id
app.post('/api/posts', contentServiceProxy());       // → https://content-service/api/posts
app.put('/api/posts/:id', contentServiceProxy());    // → https://content-service/api/posts/:id
app.delete('/api/posts/:id', contentServiceProxy()); // → https://content-service/api/posts/:id

// Comments (nested resource)
app.get('/api/posts/:postId/comments', contentServiceProxy());
app.post('/api/posts/:postId/comments', contentServiceProxy());

// Public API endpoints (using JSONPlaceholder for demo)
console.log('🌐 Setting up Public API routes...');
app.get('/posts', jsonPlaceholderProxy());           // → https://jsonplaceholder.typicode.com/posts
app.get('/posts/:id', jsonPlaceholderProxy());       // → https://jsonplaceholder.typicode.com/posts/:id
app.get('/comments', jsonPlaceholderProxy());        // → https://jsonplaceholder.typicode.com/comments
app.get('/users', jsonPlaceholderProxy());           // → https://jsonplaceholder.typicode.com/users
app.get('/albums', jsonPlaceholderProxy());          // → https://jsonplaceholder.typicode.com/albums
app.get('/photos', jsonPlaceholderProxy());          // → https://jsonplaceholder.typicode.com/photos

// ============================================================================
// Advanced Routing Patterns
// ============================================================================

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      'user-service': 'unknown',
      'content-service': 'unknown',
      'external-api': 'unknown'
    },
    version: process.env.npm_package_version || '1.0.0'
  };

  res.json(healthCheck);
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'API Gateway Documentation',
    version: '1.0.0',
    description: 'Microservices API Gateway with omitted proxy paths',
    endpoints: {
      authentication: {
        'POST /api/auth/login': 'Login with email and password',
        'POST /api/auth/register': 'Register new user account'
      },
      users: {
        'GET /api/users': 'List all users',
        'GET /api/users/:id': 'Get user by ID',
        'POST /api/users': 'Create new user',
        'PUT /api/users/:id': 'Update user',
        'DELETE /api/users/:id': 'Delete user'
      },
      content: {
        'GET /api/posts': 'List all posts',
        'GET /api/posts/:id': 'Get post by ID',
        'POST /api/posts': 'Create new post',
        'PUT /api/posts/:id': 'Update post',
        'DELETE /api/posts/:id': 'Delete post',
        'GET /api/posts/:postId/comments': 'Get post comments',
        'POST /api/posts/:postId/comments': 'Add comment to post'
      },
      public: {
        'GET /posts': 'Public posts (via JSONPlaceholder)',
        'GET /users': 'Public users (via JSONPlaceholder)',
        'GET /comments': 'Public comments (via JSONPlaceholder)'
      }
    },
    features: {
      'omitted_proxy_paths': 'Direct URL mapping between frontend and backend',
      'error_handling': 'Comprehensive error handling with service-specific responses',
      'authentication': 'JWT-based authentication middleware',
      'monitoring': 'Request logging and error tracking'
    }
  });
});

// Metrics endpoint
app.get('/api/metrics', (req, res) => {
  res.json({
    requests: {
      total: Math.floor(Math.random() * 10000),
      success: Math.floor(Math.random() * 9000),
      errors: Math.floor(Math.random() * 1000)
    },
    services: {
      'user-service': { status: 'healthy', responseTime: '120ms' },
      'content-service': { status: 'healthy', responseTime: '95ms' },
      'external-api': { status: 'healthy', responseTime: '200ms' }
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// Utility Functions
// ============================================================================

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

async function logServiceError(serviceName: string, error: any, req: any): Promise<void> {
  const errorLog = {
    service: serviceName,
    error: error.message,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  };
  
  console.error('🚨 Service Error:', JSON.stringify(errorLog, null, 2));
  
  // In production, this would send to your monitoring service
  // await monitoring.logError(errorLog);
}

// ============================================================================
// Error Handling Middleware
// ============================================================================

// Global error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('💥 Unhandled Error:', error);
  
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      requestId: generateRequestId(),
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      path: req.path,
      method: req.method,
      availableEndpoints: [
        'GET /api/docs - API Documentation',
        'GET /api/health - Health Check',
        'POST /api/auth/login - Authentication',
        'GET /api/users - User Management',
        'GET /api/posts - Content Management',
        'GET /posts - Public API'
      ]
    }
  });
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('🚀 API Gateway Server started successfully!');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('📖 Quick Start:');
    console.log(`   curl http://localhost:${PORT}/api/docs`);
    console.log(`   curl http://localhost:${PORT}/api/health`);
    console.log(`   curl http://localhost:${PORT}/posts`);
    console.log('');
    console.log('🔐 Authentication:');
    console.log(`   curl -X POST http://localhost:${PORT}/api/auth/login \\`);
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -d \'{"email":"user@example.com","password":"password"}\'');
    console.log('');
    console.log('👥 User Management (requires auth):');
    console.log(`   curl http://localhost:${PORT}/api/users \\`);
    console.log('        -H "Authorization: Bearer YOUR_TOKEN"');
    console.log('');
    console.log('💡 All routes use omitted proxy paths for direct URL mapping!');
  });
}

export default app;