# Express Simple Proxy

A simple, powerful, and TypeScript-ready Express.js proxy middleware with comprehensive error handling, request/response transformation, and file upload support.

[![npm version](https://badge.fury.io/js/express-simple-proxy.svg)](https://badge.fury.io/js/express-simple-proxy)
[![Build Status](https://github.com/nadimtuhin/express-simple-proxy/actions/workflows/ci.yml/badge.svg)](https://github.com/nadimtuhin/express-simple-proxy/actions)
[![Coverage](https://img.shields.io/badge/coverage-93.18%25-brightgreen)](https://github.com/nadimtuhin/express-simple-proxy/actions)
[![Tests](https://img.shields.io/badge/tests-109%20passed-brightgreen)](https://github.com/nadimtuhin/express-simple-proxy/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
[![Known Vulnerabilities](https://snyk.io/test/github/nadimtuhin/express-simple-proxy/badge.svg)](https://snyk.io/test/github/nadimtuhin/express-simple-proxy)

## Features

- 🚀 **Simple Setup**: Get started with just a few lines of code
- 🔒 **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- 🛡️ **Error Handling**: Advanced error handling with custom error handlers and hooks
- 📁 **File Upload Support**: Handle multipart/form-data and file uploads seamlessly
- 🔄 **Request/Response Transformation**: Transform requests and responses as needed
- 🏷️ **URL Template Support**: Dynamic URL path parameter replacement
- 🎯 **Query Parameter Handling**: Automatic query string building and encoding
- 🔍 **Debug Support**: Built-in curl command generation for debugging
- 🔧 **Configurable**: Extensive configuration options for timeouts, headers, and more
- 🧪 **Well Tested**: 93.18% coverage with 76 passing tests across unit and integration suites
- 🏗️ **CI/CD Ready**: Automated testing, building, and publishing pipeline

## Why Choose Express Simple Proxy?

### 🎯 **Perfect for API Gateways & Microservices**
Unlike general-purpose proxies, this package is specifically designed for **API-to-API communication** in modern web applications:

- **REST API Proxying**: Built from the ground up for JSON APIs with automatic content-type handling
- **Microservices Architecture**: Seamlessly proxy requests between services with TypeScript safety
- **API Gateway Pattern**: Ideal for aggregating multiple backend services into a single frontend API

### 🔄 **Comparison with Other Proxy Solutions**

| Feature | Express Simple Proxy | http-proxy-middleware | express-http-proxy | node-http-proxy |
|---------|---------------------|----------------------|-------------------|-----------------|
| **Primary Use Case** | API-to-API communication | General HTTP proxying | HTTP request proxying | Low-level HTTP proxy |
| **TypeScript Support** | ✅ Native & Complete | ⚠️ Types available | ⚠️ Types available | ❌ Limited |
| **File Upload Handling** | ✅ Built-in multipart/form-data | ❌ Manual setup required | ⚠️ Basic support | ❌ Not supported |
| **JSON API Focus** | ✅ Optimized for REST APIs | ⚠️ Generic proxy | ⚠️ Generic proxy | ❌ Low-level |
| **Error Handling** | ✅ Comprehensive with hooks | ⚠️ Basic | ⚠️ Basic | ❌ Manual |
| **Request/Response Transform** | ✅ Built-in handlers | ✅ Supported | ✅ Supported | ⚠️ Manual |
| **Debugging Support** | ✅ Curl generation | ❌ None | ❌ None | ❌ None |
| **Setup Complexity** | 🟢 Simple | 🟡 Moderate | 🟡 Moderate | 🔴 Complex |

### 🎪 **When to Use This Package**

**✅ Choose Express Simple Proxy when:**
- Building API gateways that aggregate multiple backend services
- Creating microservices that need to communicate with other APIs
- Developing applications that require file uploads through proxy
- You need comprehensive error handling and request/response transformation
- TypeScript is important for your project's type safety
- You want built-in debugging capabilities (curl generation)
- Your backend communication is primarily REST/JSON based

**❌ Consider alternatives when:**
- You need WebSocket proxying (use `http-proxy-middleware`)
- You require low-level HTTP proxy control (use `node-http-proxy`)
- You need to proxy non-API traffic like static files or HTML pages
- You're building a traditional reverse proxy or load balancer

### 🏗️ **Architecture Benefits**

```typescript
// Express Simple Proxy - Built for modern API architecture
const userService = createProxyController({
  baseURL: 'https://user-service.internal',
  headers: (req) => ({ 'Authorization': req.headers.authorization })
});

const orderService = createProxyController({
  baseURL: 'https://order-service.internal',
  headers: (req) => ({ 'Authorization': req.headers.authorization })
});

// Clean, maintainable API gateway
app.get('/api/users/:id', userService('/users/:id'));
app.get('/api/orders/:id', orderService('/orders/:id'));
app.post('/api/orders', orderService('/orders'));
```

## Installation

```bash
npm install express-simple-proxy
```

## Quick Start

```typescript
import express from 'express';
import { createProxyController } from 'express-simple-proxy';

const app = express();

// Create proxy controller
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': `Bearer ${req.headers.authorization}`,
    'User-Agent': 'MyApp/1.0'
  })
});

// Use proxy middleware
app.get('/users', proxy('/api/users'));
app.get('/users/:id', proxy('/api/users/:id'));
app.post('/users', proxy('/api/users'));

app.listen(3000, () => {
  console.log('Proxy server running on port 3000');
});
```

## Configuration

### Basic Configuration

```typescript
import { createProxyController, ProxyConfig } from 'express-simple-proxy';

const config: ProxyConfig = {
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': `Bearer ${req.locals.token}`,
    'Content-Type': 'application/json'
  }),
  timeout: 30000, // 30 seconds
  responseHeaders: (response) => ({
    'X-Proxy-Response': 'true',
    'X-Response-Time': Date.now().toString()
  }),
  errorHandler: (error, req, res) => {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  },
  errorHandlerHook: async (error, req, res) => {
    // Log error to external service
    await logErrorToService(error, req);
    
    // Add context to error
    error.context = `${req.method} ${req.path}`;
    return error;
  }
};

const proxy = createProxyController(config);
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `baseURL` | `string` | ✅ | Base URL for the target API |
| `headers` | `function` | ✅ | Function that returns headers object based on request |
| `timeout` | `number` | ❌ | Request timeout in milliseconds (default: 30000) |
| `responseHeaders` | `function` | ❌ | Function to transform response headers |
| `errorHandler` | `function` | ❌ | Custom error handling function |
| `errorHandlerHook` | `function` | ❌ | Error processing hook function |

## Usage Examples

### Basic Proxy

```typescript
// 1. Omitted proxy path - uses request path directly
app.get('/api/users', proxy());
// GET /api/users → https://api.example.com/api/users

app.post('/api/users', proxy());
// POST /api/users → https://api.example.com/api/users

app.get('/api/users/:id', proxy());
// GET /api/users/123 → https://api.example.com/api/users/123

// 2. Explicit proxy path - redirects to specific endpoint
app.get('/users', proxy('/api/users'));
// GET /users → https://api.example.com/api/users

app.get('/profile', proxy('/api/users/me'));
// GET /profile → https://api.example.com/api/users/me

// 3. Path parameter transformation
app.get('/users/:id', proxy('/api/users/:id'));
// GET /users/123 → https://api.example.com/api/users/123

app.get('/users/:userId/orders/:orderId', proxy('/api/users/:userId/orders/:orderId'));
// GET /users/123/orders/456 → https://api.example.com/api/users/123/orders/456

// 4. Path mapping - different frontend and backend paths
app.get('/dashboard/users', proxy('/api/admin/users'));
// GET /dashboard/users → https://api.example.com/api/admin/users

app.get('/public/health', proxy('/internal/health-check'));
// GET /public/health → https://api.example.com/internal/health-check
```

### Advanced Path Scenarios

```typescript
// 1. REST API Gateway Pattern
const userAPI = createProxyController({
  baseURL: 'https://user-service.internal',
  headers: (req) => ({ 'Authorization': req.headers.authorization })
});

// Omitted paths - direct mapping
app.get('/api/users', userAPI());           // → /api/users
app.post('/api/users', userAPI());          // → /api/users
app.get('/api/users/:id', userAPI());       // → /api/users/:id
app.put('/api/users/:id', userAPI());       // → /api/users/:id
app.delete('/api/users/:id', userAPI());    // → /api/users/:id

// 2. Service-to-Service Communication
const orderService = createProxyController({
  baseURL: 'https://order-service.internal',
  headers: (req) => ({ 'Service-Token': process.env.SERVICE_TOKEN })
});

// Direct service calls
app.get('/orders', orderService());              // → /orders
app.get('/orders/:id', orderService());          // → /orders/:id
app.post('/orders', orderService());             // → /orders

// 3. API Version Mapping
app.get('/v1/users', proxy('/api/v1/users'));
app.get('/v2/users', proxy('/api/v2/users'));
app.get('/latest/users', proxy('/api/v3/users'));  // Latest maps to v3

// 4. Multi-Service Aggregation
const services = {
  users: createProxyController({ baseURL: 'https://user-service.internal', headers: authHeaders }),
  orders: createProxyController({ baseURL: 'https://order-service.internal', headers: authHeaders }),
  products: createProxyController({ baseURL: 'https://product-service.internal', headers: authHeaders })
};

// Omitted paths for clean service routing
app.use('/api/users', services.users());
app.use('/api/orders', services.orders());
app.use('/api/products', services.products());

// 5. Dynamic Path Routing
app.get('/tenant/:tenantId/users', proxy('/api/tenants/:tenantId/users'));
app.get('/tenant/:tenantId/users/:userId', proxy('/api/tenants/:tenantId/users/:userId'));
```

### Omitted Proxy Path Pattern

When you omit the proxy path parameter, the middleware uses the original request path, making it perfect for **direct API passthrough** scenarios:

```typescript
const proxy = createProxyController({
  baseURL: 'https://api.backend.com',
  headers: (req) => ({ 'Authorization': req.headers.authorization })
});

// Direct passthrough - request path matches backend path exactly
app.get('/api/users', proxy());              // GET /api/users → https://api.backend.com/api/users
app.post('/api/users', proxy());             // POST /api/users → https://api.backend.com/api/users
app.get('/api/users/:id', proxy());          // GET /api/users/123 → https://api.backend.com/api/users/123
app.put('/api/users/:id', proxy());          // PUT /api/users/123 → https://api.backend.com/api/users/123
app.delete('/api/users/:id', proxy());       // DELETE /api/users/123 → https://api.backend.com/api/users/123

// Perfect for REST API proxying
app.get('/api/orders', proxy());
app.post('/api/orders', proxy());
app.get('/api/orders/:id', proxy());
app.put('/api/orders/:id', proxy());
app.delete('/api/orders/:id', proxy());

// Handles complex nested paths automatically
app.get('/api/users/:userId/orders/:orderId', proxy());
// → https://api.backend.com/api/users/123/orders/456
```

**Benefits of Omitted Proxy Path:**
- ✅ **Zero Configuration**: No path mapping needed
- ✅ **Consistent Routing**: Frontend and backend paths stay in sync
- ✅ **Automatic Parameter Handling**: All path parameters are preserved
- ✅ **Perfect for Microservices**: Direct service-to-service communication
- ✅ **Maintainable**: Changes to API structure don't require proxy updates

**When to Use Omitted Proxy Path:**
- API Gateway scenarios where frontend and backend paths match
- Microservices communication with consistent API structure
- When you want to maintain URL consistency between layers
- Rapid prototyping and development environments

### Real-World Omitted Path Examples

```typescript
// 1. E-Commerce API Gateway
const productService = createProxyController({
  baseURL: 'https://product-service.company.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Request-ID': req.headers['x-request-id'],
  })
});

const orderService = createProxyController({
  baseURL: 'https://order-service.company.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-User-ID': req.user?.id,
  })
});

// Direct passthrough - no path transformation needed
app.get('/api/products', productService());           // → /api/products
app.get('/api/products/:id', productService());       // → /api/products/:id
app.post('/api/products/:id/reviews', productService()); // → /api/products/:id/reviews

app.get('/api/orders', orderService());               // → /api/orders
app.post('/api/orders', orderService());              // → /api/orders
app.get('/api/orders/:id/tracking', orderService());  // → /api/orders/:id/tracking

// 2. Multi-Tenant SaaS Application
const tenantProxy = createProxyController({
  baseURL: 'https://tenant-api.saas.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Tenant-ID': req.params.tenantId,
    'Content-Type': 'application/json'
  })
});

// All tenant-specific routes use direct mapping
app.get('/api/tenants/:tenantId/users', tenantProxy());
app.post('/api/tenants/:tenantId/users', tenantProxy());
app.get('/api/tenants/:tenantId/users/:userId', tenantProxy());
app.put('/api/tenants/:tenantId/users/:userId', tenantProxy());
app.get('/api/tenants/:tenantId/analytics/dashboard', tenantProxy());
app.get('/api/tenants/:tenantId/billing/invoices', tenantProxy());

// 3. Development Environment Proxy
const devApiProxy = createProxyController({
  baseURL: process.env.API_BASE_URL || 'https://api-dev.company.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Environment': 'development',
    'X-Developer': req.headers['x-developer-id'],
  })
});

// Mirror production API structure exactly
app.use('/api', (req, res, next) => {
  // Add development-specific middleware
  console.log(`[DEV] ${req.method} ${req.path}`);
  next();
});

app.get('/api/*', devApiProxy());     // Catch-all for GET requests
app.post('/api/*', devApiProxy());    // Catch-all for POST requests
app.put('/api/*', devApiProxy());     // Catch-all for PUT requests
app.delete('/api/*', devApiProxy());  // Catch-all for DELETE requests

// 4. GraphQL and REST API Bridge
const graphqlService = createProxyController({
  baseURL: 'https://graphql-api.company.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'Content-Type': 'application/json',
  })
});

const restService = createProxyController({
  baseURL: 'https://rest-api.company.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'Accept': 'application/json',
  })
});

// GraphQL endpoint
app.post('/graphql', graphqlService());

// REST endpoints - direct mapping
app.get('/api/v1/users', restService());
app.post('/api/v1/users', restService());
app.get('/api/v1/users/:id', restService());
app.put('/api/v1/users/:id', restService());
app.delete('/api/v1/users/:id', restService());

// 5. Microservices with Service Mesh
const createServiceProxy = (serviceName: string) => {
  return createProxyController({
    baseURL: `https://${serviceName}.mesh.internal`,
    headers: (req) => ({
      'Authorization': req.headers.authorization,
      'X-Correlation-ID': req.headers['x-correlation-id'] || generateId(),
      'X-Service-Name': serviceName,
    })
  });
};

const userService = createServiceProxy('user-service');
const notificationService = createServiceProxy('notification-service');
const auditService = createServiceProxy('audit-service');

// Service mesh routing - paths stay consistent
app.get('/api/users', userService());
app.get('/api/users/:id/notifications', notificationService());
app.post('/api/audit/events', auditService());

// 6. API Versioning with Omitted Paths
const v1Service = createProxyController({
  baseURL: 'https://api-v1.company.com',
  headers: (req) => ({ 'API-Version': '1.0' })
});

const v2Service = createProxyController({
  baseURL: 'https://api-v2.company.com',
  headers: (req) => ({ 'API-Version': '2.0' })
});

// Version-specific routing with direct path mapping
app.use('/api/v1', (req, res, next) => {
  // v1 specific middleware
  next();
});

app.use('/api/v2', (req, res, next) => {
  // v2 specific middleware
  next();
});

// Direct mapping preserves API structure
app.get('/api/v1/users', v1Service());
app.get('/api/v1/users/:id', v1Service());
app.get('/api/v2/users', v2Service());
app.get('/api/v2/users/:id', v2Service());
```

### File Upload Proxy

```typescript
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

// Single file upload
app.post('/upload', upload.single('file'), proxy('/api/upload'));

// Multiple file upload
app.post('/upload-multiple', upload.array('files'), proxy('/api/upload-multiple'));

// Form data with file
app.post('/profile', upload.single('avatar'), proxy('/api/profile'));
```

### Custom Response Handler

```typescript
// Custom response transformation
app.get('/users', proxy('/api/users', (req, res, remoteResponse) => {
  res.json({
    success: true,
    data: remoteResponse.data,
    timestamp: new Date().toISOString()
  });
}));

// Return raw response
app.get('/users', proxy('/api/users', true));
```

### Advanced Error Handling

```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({ 'Authorization': req.headers.authorization }),
  
  // Error processing hook
  errorHandlerHook: async (error, req, res) => {
    // Log to monitoring service
    await monitoring.logError(error, {
      method: req.method,
      path: req.path,
      userId: req.user?.id
    });
    
    // Send alert for server errors
    if (error.status >= 500) {
      await alerting.sendAlert({
        title: 'API Proxy Error',
        message: `${error.status}: ${error.message}`,
        severity: 'high'
      });
    }
    
    return error;
  },
  
  // Custom error response
  errorHandler: (error, req, res) => {
    const response = {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        status: error.status
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        path: req.path
      }
    };
    
    // Forward rate limiting headers
    if (error.status === 429 && error.headers) {
      ['retry-after', 'x-ratelimit-remaining'].forEach(header => {
        if (error.headers[header]) {
          res.set(header, error.headers[header]);
        }
      });
    }
    
    res.status(error.status || 500).json(response);
  }
});
```

## Error Handling

The proxy provides comprehensive error handling with three types of errors:

### 1. Response Errors (4xx/5xx)
Server responded with an error status. The proxy preserves the original status code and error data.

### 2. Network Errors (503)
Request was made but no response was received (timeout, connection refused, DNS failures).

### 3. Request Setup Errors (500)
Error in request configuration (invalid URL, malformed data).

### Error Handler Flow

1. **Error Occurs**: Network, HTTP, or setup error
2. **Error Hook Processing**: Process/modify error (if configured)
3. **Error Handling**: Send response to client (custom or default)
4. **Fallback**: If custom handlers fail, use default error handler

## Utility Functions

The package exports several utility functions for advanced usage:

```typescript
import {
  urlJoin,
  replaceUrlTemplate,
  buildQueryString,
  createFormDataPayload,
  generateCurlCommand,
  asyncWrapper
} from 'express-simple-proxy';

// URL manipulation
const url = urlJoin('https://api.example.com', 'users', '?page=1');
const templated = replaceUrlTemplate('/users/:id', { id: 123 });

// Query string building
const qs = buildQueryString({ page: 1, tags: ['red', 'blue'] });

// Form data creation for file uploads
const formData = createFormDataPayload(req);

// Generate curl command for debugging
const curlCommand = generateCurlCommand(payload, req);

// Async wrapper for Express middleware
const wrappedMiddleware = asyncWrapper(async (req, res, next) => {
  // Your async middleware logic
});
```

## TypeScript Support

The package is written in TypeScript and includes comprehensive type definitions:

```typescript
import {
  ProxyConfig,
  ProxyError,
  ProxyResponse,
  RequestWithLocals,
  ErrorHandler,
  ErrorHandlerHook,
  ResponseHandler
} from 'express-simple-proxy';

const config: ProxyConfig = {
  baseURL: 'https://api.example.com',
  headers: (req: RequestWithLocals) => ({
    'Authorization': `Bearer ${req.locals?.token}`
  }),
  errorHandler: (error: ProxyError, req: RequestWithLocals, res: Response) => {
    // Type-safe error handling
    res.status(error.status || 500).json({
      error: error.message
    });
  }
};
```

## Testing

The package includes comprehensive unit and integration tests with **93.18% coverage**.

For common questions and troubleshooting, see the [FAQ](./FAQ.md).

### Test Coverage Details
- **Total Coverage**: 93.18%
- **Tests Passed**: 109/109 ✅
- **Test Suites**: 5 (Unit, Integration, Utils, Omitted Path)
- **Files Covered**: 
  - `proxy.ts`: 91.01% coverage
  - `types.ts`: 100% coverage
  - `utils.ts`: 95.23% coverage

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

### CI/CD Pipeline
- ✅ **Multi-Node Testing**: Node.js 16.x, 18.x, 20.x
- ✅ **TypeScript Compilation**: Full type checking
- ✅ **ESLint**: Code quality checks
- ✅ **Test Coverage**: Comprehensive test coverage reporting
- ✅ **Automated Publishing**: NPM deployment on main branch

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Run examples
npm run example               # Basic usage example
npm run example:basic         # Basic proxy usage
npm run example:omitted-path  # Comprehensive omitted path examples
npm run example:api-gateway   # Real-world API Gateway example
```

## Examples

The repository includes comprehensive examples demonstrating various use cases:

### Basic Usage (`examples/basic-usage.ts`)
Simple proxy setup with basic configuration and usage patterns.

### Omitted Path Examples (`examples/omitted-path.ts`)
Comprehensive examples showcasing omitted proxy path patterns:
- Simple API Gateway with direct path mapping
- Multi-service architecture
- Development environment mirrors
- Multi-tenant SaaS applications
- REST API with full CRUD operations
- API versioning with consistent paths
- Microservices with service discovery
- Error handling with omitted paths

### API Gateway (`examples/api-gateway.ts`)
A complete, runnable API Gateway implementation featuring:
- **Authentication**: JWT-based auth with login/register endpoints
- **Multiple Services**: User management, content management, and public APIs
- **Direct Path Mapping**: All routes use omitted proxy paths
- **Error Handling**: Service-specific error responses and monitoring
- **Health Checks**: Service health monitoring and metrics
- **Documentation**: Built-in API documentation endpoint

**Quick Start with API Gateway:**
```bash
# Start the API Gateway
npm run example:api-gateway

# Test endpoints
curl http://localhost:8080/api/docs          # API documentation
curl http://localhost:8080/api/health        # Health check
curl http://localhost:8080/posts             # Public posts via JSONPlaceholder

# Authentication
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use authenticated endpoints
curl http://localhost:8080/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on how to contribute to this project.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a detailed history of changes to this project.

## Support

If you encounter any issues or have questions, please:

1. Check the [FAQ](./FAQ.md) - Common questions and solutions
2. Review the [Examples](./examples/) - Practical usage examples
3. Search [existing issues](https://github.com/nadimtuhin/express-simple-proxy/issues)
4. Create a [new issue](https://github.com/nadimtuhin/express-simple-proxy/issues/new)

## Related Projects

- [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) - More advanced proxy middleware
- [express-http-proxy](https://github.com/villadora/express-http-proxy) - Another Express proxy solution
- [axios](https://github.com/axios/axios) - HTTP client library used internally

---

Made with ❤️ by [Nadim Tuhin](https://github.com/nadimtuhin)