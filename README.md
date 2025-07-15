# Express Simple Proxy

A simple, powerful, and TypeScript-ready Express.js proxy middleware with comprehensive error handling, request/response transformation, and file upload support.

[![npm version](https://badge.fury.io/js/express-simple-proxy.svg)](https://badge.fury.io/js/express-simple-proxy)
[![Build Status](https://github.com/nadimtuhin/express-simple-proxy/actions/workflows/ci.yml/badge.svg)](https://github.com/nadimtuhin/express-simple-proxy/actions)
[![Coverage](https://img.shields.io/badge/coverage-93.18%25-brightgreen)](https://github.com/nadimtuhin/express-simple-proxy/actions)
[![Tests](https://img.shields.io/badge/tests-76%20passed-brightgreen)](https://github.com/nadimtuhin/express-simple-proxy/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)

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
// Proxy all requests to the same path
app.get('/api/users', proxy());

// Proxy to a different path
app.get('/users', proxy('/api/users'));

// Proxy with path parameters
app.get('/users/:id', proxy('/api/users/:id'));
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

The package includes comprehensive unit and integration tests with **93.18% coverage**:

### Test Coverage Details
- **Total Coverage**: 93.18%
- **Tests Passed**: 76/76 ✅
- **Test Suites**: 3 (Unit, Integration, Utils)
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

# Run example
npm run example
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

1. Check the [FAQ](./docs/FAQ.md)
2. Search [existing issues](https://github.com/nadimtuhin/express-simple-proxy/issues)
3. Create a [new issue](https://github.com/nadimtuhin/express-simple-proxy/issues/new)

## Related Projects

- [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) - More advanced proxy middleware
- [express-http-proxy](https://github.com/villadora/express-http-proxy) - Another Express proxy solution
- [axios](https://github.com/axios/axios) - HTTP client library used internally

---

Made with ❤️ by [Nadim Tuhin](https://github.com/nadimtuhin)