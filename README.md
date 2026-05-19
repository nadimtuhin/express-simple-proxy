# Express Simple Proxy

[![npm version](https://badge.fury.io/js/express-simple-proxy.svg)](https://badge.fury.io/js/express-simple-proxy)
[![Build Status](https://github.com/nadimtuhin/express-simple-proxy/actions/workflows/ci.yml/badge.svg)](https://github.com/nadimtuhin/express-simple-proxy/actions)
[![Coverage](https://img.shields.io/badge/coverage-93%25-brightgreen)](https://github.com/nadimtuhin/express-simple-proxy/actions)
[![Tests](https://img.shields.io/badge/tests-137%20passed-brightgreen)](https://github.com/nadimtuhin/express-simple-proxy/actions)
[![Security](https://img.shields.io/badge/security-trivy%20scanned-blue)](https://github.com/nadimtuhin/express-simple-proxy/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
[![Known Vulnerabilities](https://snyk.io/test/github/nadimtuhin/express-simple-proxy/badge.svg)](https://snyk.io/test/github/nadimtuhin/express-simple-proxy)

TypeScript-ready Express middleware for proxying API requests with zero configuration needed. Perfect for API gateways and microservices.

**⚠️ Note:** This package handles HTTP requests only. For WebSocket proxying, use dedicated WebSocket proxy solutions like `http-proxy-middleware`.

```bash
npm install express-simple-proxy
```

## Quick Start

### 1. Basic Proxy
```typescript
import express from 'express';
import { createProxyController } from 'express-simple-proxy';

const app = express();

const proxy = createProxyController({
  baseURL: 'https://api.example.com'
});

// Direct path mapping - no configuration needed
app.get('/users', proxy());
app.post('/users', proxy());
app.get('/users/:id', proxy());
```

### 2. With Authentication
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': `Bearer ${req.headers.authorization}`,
    'User-Agent': 'MyApp/1.0'
  })
});

app.use('/api', proxy()); // Proxy all /api/* routes
```

### 3. With Error Handling
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({ 'Authorization': req.headers.authorization }),
  errorHandler: (error, req, res) => {
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

## Core Concepts

### Omitted Path Pattern
The key differentiator is **omitted proxy paths** - when you call `proxy()` without a path parameter, it uses the original request path:

```typescript
// Traditional proxy libraries require explicit path mapping:
app.get('/users', proxy('/api/users'));        // Maps /users → /api/users
app.get('/users/:id', proxy('/api/users/:id')); // Maps /users/123 → /api/users/123

// Express Simple Proxy - zero configuration:
app.get('/users', proxy());                     // Maps /users → /users
app.get('/users/:id', proxy());                 // Maps /users/123 → /users/123
```

**Benefits:**
- ✅ **Zero Configuration**: No path mapping needed
- ✅ **Consistent Routing**: Frontend and backend paths stay in sync
- ✅ **Automatic Parameter Handling**: All path parameters are preserved
- ✅ **Perfect for Microservices**: Direct service-to-service communication

### TypeScript-First Approach
Built from the ground up with TypeScript, not retrofitted:

```typescript
import { ProxyConfig, ProxyError, RequestWithLocals } from 'express-simple-proxy';

const config: ProxyConfig = {
  baseURL: 'https://api.example.com',
  headers: (req: RequestWithLocals) => ({
    'Authorization': `Bearer ${req.locals?.token}`
  }),
  errorHandler: (error: ProxyError, req: RequestWithLocals, res: Response) => {
    // Full type safety throughout
  }
};
```

### API-Focused vs General HTTP Proxy
Optimized specifically for REST API communication:

| Feature | Express Simple Proxy | General HTTP Proxies |
|---------|---------------------|---------------------|
| **JSON APIs** | ✅ Optimized handling | ⚠️ Generic support |
| **File Uploads** | ✅ Built-in multipart/form-data | ❌ Manual setup |
| **Error Processing** | ✅ Structured error hooks | ⚠️ Basic forwarding |
| **TypeScript** | ✅ Native & complete | ⚠️ Addon types |
| **Setup Complexity** | 🟢 Minimal | 🟡 Configuration heavy |

## Configuration

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `baseURL` | `string` | ✅ | Base URL for the target API |
| `headers` | `function` | ✅ | Function that returns headers object based on request |
| `timeout` | `number` | ❌ | Request timeout in milliseconds (default: 30000) |
| `responseHeaders` | `function` | ❌ | Function to transform response headers |
| `errorHandler` | `function` | ❌ | Custom error handling function |
| `errorHandlerHook` | `function` | ❌ | Error processing hook function |
| `beforeRequest` | `function` | ❌ | Hook to mutate the payload or short-circuit with a custom response before the upstream call |
| `onResponse` | `function` | ❌ | Callback fired once per request on every terminal path (upstream, short-circuit, error) with traffic stats |

### Advanced Configuration

```typescript
const config: ProxyConfig = {
  baseURL: 'https://api.example.com',
  timeout: 30000,
  
  headers: (req) => ({
    'Authorization': `Bearer ${req.locals.token}`,
    'Content-Type': 'application/json',
    'X-Request-ID': req.headers['x-request-id']
  }),
  
  responseHeaders: (response) => ({
    'X-Proxy-Response': 'true',
    'X-Response-Time': Date.now().toString()
  }),
  
  // Error processing hook - runs before error handler
  errorHandlerHook: async (error, req, res) => {
    // Log to monitoring service
    await logErrorToService(error, req);
    
    // Add context to error
    error.context = `${req.method} ${req.path}`;
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
    
    res.status(error.status || 500).json(response);
  }
};
```

## Advanced Usage

### File Upload Proxy
```typescript
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

// Single file upload
app.post('/upload', upload.single('file'), proxy());

// Multiple file upload
app.post('/upload-multiple', upload.array('files'), proxy());

// Form data with file
app.post('/profile', upload.single('avatar'), proxy());
```

### Custom Response Transformation
```typescript
// Transform response data
app.get('/users', proxy(undefined, (req, res, remoteResponse) => {
  res.json({
    success: true,
    data: remoteResponse.data,
    timestamp: new Date().toISOString()
  });
}));

// Return raw response
app.get('/raw-data', proxy(undefined, true));
```

### Path Mapping (When Needed)
```typescript
// Explicit path mapping for different frontend/backend structures
app.get('/dashboard/users', proxy('/api/admin/users'));
app.get('/public/health', proxy('/internal/health-check'));

// API version mapping
app.get('/v1/users', proxy('/api/v1/users'));
app.get('/latest/users', proxy('/api/v3/users'));
```

## Use Cases & Examples

### API Gateway Pattern
```typescript
const userService = createProxyController({
  baseURL: 'https://user-service.internal',
  headers: (req) => ({ 'Authorization': req.headers.authorization })
});

const orderService = createProxyController({
  baseURL: 'https://order-service.internal',
  headers: (req) => ({ 'Authorization': req.headers.authorization })
});

// Clean service routing with omitted paths
app.get('/api/users', userService());
app.post('/api/users', userService());
app.get('/api/users/:id', userService());

app.get('/api/orders', orderService());
app.post('/api/orders', orderService());
app.get('/api/orders/:id', orderService());
```

### Multi-Tenant SaaS
```typescript
const tenantProxy = createProxyController({
  baseURL: 'https://tenant-api.saas.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Tenant-ID': req.params.tenantId
  })
});

// All tenant routes use direct mapping
app.get('/api/tenants/:tenantId/users', tenantProxy());
app.get('/api/tenants/:tenantId/billing', tenantProxy());
app.get('/api/tenants/:tenantId/analytics', tenantProxy());
```

### Development Environment Mirror
```typescript
const devProxy = createProxyController({
  baseURL: process.env.API_BASE_URL || 'https://api-dev.company.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Environment': 'development'
  })
});

// Mirror production API structure exactly
app.use('/api', devProxy());  // Catch-all for all API routes
```

### Microservices with Service Discovery
```typescript
const createServiceProxy = (serviceName: string) => {
  return createProxyController({
    baseURL: `https://${serviceName}.mesh.internal`,
    headers: (req) => ({
      'Authorization': req.headers.authorization,
      'X-Correlation-ID': req.headers['x-correlation-id'] || generateId(),
      'X-Service-Name': serviceName
    })
  });
};

const userService = createServiceProxy('user-service');
const notificationService = createServiceProxy('notification-service');

// Service mesh routing with consistent paths
app.get('/api/users', userService());
app.get('/api/notifications', notificationService());
```

## Cookbook

A comprehensive collection of practical examples for common use cases. See the **[Complete Cookbook](./COOKBOOK.md)** for detailed recipes.

### Quick Examples

**Authentication & Security:**
```typescript
// JWT Token Forwarding
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-User-ID': req.user?.id,
    'X-Request-ID': crypto.randomUUID()
  })
});
```

**File Uploads:**
```typescript
import multer from 'multer';
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/upload', upload.single('file'), proxy('/api/upload'));
```

**Load Balancing:**
```typescript
const servers = ['https://api1.com', 'https://api2.com', 'https://api3.com'];
let current = 0;

app.use('/api', (req, res, next) => {
  const selectedServer = servers[current++ % servers.length];
  const proxy = createProxyController({
    baseURL: selectedServer,
    headers: (req) => ({ 'Authorization': req.headers.authorization })
  });
  proxy()(req, res, next);
});
```

**Performance Monitoring:**
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  errorHandlerHook: async (error, req, res) => {
    console.log({
      method: req.method,
      path: req.path,
      duration: Date.now() - req.startTime,
      status: error.status
    });
    return error;
  }
});
```

**📖 [View Complete Cookbook](./COOKBOOK.md)** - Contains 50+ recipes for:
- Authentication & Security (JWT, API Keys, OAuth2)
- File Handling (Uploads, Validation, Chunking)
- Database & Caching (Sharding, Redis, Cache Control)
- Monitoring & Observability (Tracing, Metrics, Health Checks)
- Load Balancing & Failover (Round Robin, Circuit Breakers)
- Development & Testing (Mocking, A/B Testing, Feature Flags)
- Rate Limiting & Throttling (Basic, Per-user)
- Data Transformation (Schema Validation, GraphQL)
- Content Negotiation (Accept Headers, Compression)

## Lifecycle Hooks

### `beforeRequest` — Mutate or Short-Circuit

Runs after the payload is assembled but before the upstream call. Return a `ShortCircuitResponse` to skip the upstream entirely.

```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: () => ({}),

  // Inject headers before forwarding
  beforeRequest: (payload, req) => {
    payload.headers['X-Request-ID'] = crypto.randomUUID();
    payload.headers['X-User-ID'] = req.locals?.userId;
  },
});

// Or short-circuit (e.g. serve from cache)
const cachingProxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: () => ({}),

  beforeRequest: async (payload, req) => {
    const cached = await cache.get(payload.url);
    if (cached) {
      return { status: 200, data: cached, headers: { 'X-Cache': 'HIT' } };
    }
    // returning undefined → proceeds to upstream
  },
});
```

### `onResponse` — Traffic Stats Callback

Fires exactly once per request on all three terminal paths: upstream success, short-circuit, and error. Never throws to the caller — exceptions are swallowed and logged.

```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: () => ({}),

  onResponse: (stats, req, res) => {
    console.log({
      url: stats.url,
      method: stats.method,
      status: stats.status,
      durationMs: stats.durationMs,
      responseSizeBytes: stats.responseSizeBytes, // from content-length header
      source: stats.source, // 'upstream' | 'short-circuit'
    });
  },
});
```

### Granular Error Codes

`error.code` is now more specific, making it easier to take targeted action:

| `error.code` | Meaning |
|---|---|
| `UPSTREAM_TIMEOUT` | Timeout waiting for upstream response |
| `UPSTREAM_UNREACHABLE` | Connection refused / DNS failure / reset |
| `UPSTREAM_AUTH` | Upstream returned 401 or 403 |
| `NETWORK_ERROR` | Other network-level failure (fallback) |
| `REQUEST_ERROR` | Axios request setup failure |
| `UNKNOWN_ERROR` | Unclassified error |

HTTP status codes are unchanged — network errors still return **503**.

```typescript
errorHandler: (error, req, res) => {
  if (error.code === 'UPSTREAM_TIMEOUT') {
    return res.status(504).json({ error: 'Gateway timeout' });
  }
  if (error.code === 'UPSTREAM_AUTH') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  res.status(error.status || 500).json({ error: error.message });
}
```

## Error Handling

### Error Types
1. **Response Errors (4xx/5xx)**: Server responded with error status
2. **Network Errors (503)**: No response received (timeout, connection refused)
3. **Request Setup Errors (500)**: Invalid configuration or malformed data

### Error Handler Flow
1. **Error Occurs** → 2. **Error Hook Processing** → 3. **Error Handling** → 4. **Fallback**

### Advanced Error Handling
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  
  errorHandlerHook: async (error, req, res) => {
    // Monitor and alert
    await monitoring.logError(error, { method: req.method, path: req.path });
    
    if (error.status >= 500) {
      await alerting.sendAlert({
        title: 'API Proxy Error',
        severity: 'high'
      });
    }
    
    return error;
  },
  
  errorHandler: (error, req, res) => {
    // Forward rate limiting headers
    if (error.status === 429 && error.headers) {
      ['retry-after', 'x-ratelimit-remaining'].forEach(header => {
        if (error.headers[header]) {
          res.set(header, error.headers[header]);
        }
      });
    }
    
    res.status(error.status || 500).json({
      success: false,
      error: error.message,
      requestId: req.headers['x-request-id']
    });
  }
});
```

## API Reference

### Types
```typescript
import {
  ProxyConfig,
  ProxyError,
  ProxyErrorCode,
  ProxyResponse,
  ProxyStats,
  ShortCircuitResponse,
  BeforeRequestHook,
  OnResponseCallback,
  RequestWithLocals,
  ErrorHandler,
  ErrorHandlerHook,
  ResponseHandler
} from 'express-simple-proxy';
```

### Utility Functions
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

// Form data creation
const formData = createFormDataPayload(req);

// Debug curl generation
const curlCommand = generateCurlCommand(payload, req);

// Async wrapper for middleware
const wrappedMiddleware = asyncWrapper(async (req, res, next) => {
  // Your async logic
});
```

## Development & Testing

### Test Coverage
- **Total Coverage**: ~93%
- **Tests Passed**: 137/137 ✅
- **Test Suites**: Unit, Integration, Utils, Omitted Path

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --coverage     # With coverage report
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:watch         # Watch mode
```

### Development Commands
```bash
npm install                # Install dependencies
npm run build              # Build the project
npm run dev                # Development mode
npm run lint               # Lint code
npm run format             # Format code
```

### Examples
```bash
npm run example                # Basic usage
npm run example:omitted-path   # Omitted path patterns
npm run example:api-gateway    # Real-world API Gateway
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- [FAQ](./FAQ.md) - Common questions and solutions
- [Examples](./examples/) - Practical usage examples
- [Issues](https://github.com/nadimtuhin/express-simple-proxy/issues) - Bug reports and feature requests

## License

MIT License - see [LICENSE](./LICENSE) file for details.

---

Made with ❤️ by [Nadim Tuhin](https://github.com/nadimtuhin)