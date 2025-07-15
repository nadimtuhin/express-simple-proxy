# Frequently Asked Questions (FAQ)

## Table of Contents

- [General Questions](#general-questions)
- [Getting Started](#getting-started)
- [Proxy Path Configuration](#proxy-path-configuration)
- [Error Handling](#error-handling)
- [File Uploads](#file-uploads)
- [TypeScript Support](#typescript-support)
- [Performance & Production](#performance--production)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

## General Questions

### Q: What is Express Simple Proxy and when should I use it?

**A:** Express Simple Proxy is a TypeScript-first middleware for Express.js that simplifies API-to-API communication. Use it when:

- Building API gateways that aggregate multiple backend services
- Creating microservices that need to communicate with other APIs
- Developing applications with file upload requirements
- You need comprehensive error handling and request/response transformation
- TypeScript type safety is important for your project

### Q: How does this differ from other proxy solutions like http-proxy-middleware?

**A:** Key differences:

| Feature | Express Simple Proxy | http-proxy-middleware |
|---------|---------------------|----------------------|
| **Primary Focus** | API-to-API communication | General HTTP proxying |
| **TypeScript** | Native TypeScript support | Types available separately |
| **File Uploads** | Built-in multipart/form-data handling | Manual setup required |
| **Error Handling** | Comprehensive with hooks | Basic error handling |
| **JSON APIs** | Optimized for REST APIs | Generic proxy solution |
| **Setup** | Simple configuration | More complex setup |

### Q: Is this package production-ready?

**A:** Yes! The package includes:
- 93.18% test coverage with 109+ tests
- Comprehensive error handling
- TypeScript support for type safety
- Automated CI/CD pipeline
- Real-world examples and documentation

## Getting Started

### Q: How do I install and set up Express Simple Proxy?

**A:** Install via npm or pnpm:

```bash
npm install express-simple-proxy
# or
pnpm add express-simple-proxy
```

Basic setup:

```typescript
import express from 'express';
import { createProxyController } from 'express-simple-proxy';

const app = express();

const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
  })
});

app.get('/api/users', proxy('/users'));
```

### Q: What are the minimum requirements?

**A:** Requirements:
- Node.js >= 14.0.0
- Express.js >= 4.18.0
- TypeScript >= 4.0 (if using TypeScript)

## Proxy Path Configuration

### Q: When should I omit the proxy path vs. specify an explicit path?

**A:** Use **omitted proxy path** (`proxy()`) when:
- Frontend and backend URLs should match exactly
- Building API gateways with consistent routing
- Working with microservices that use the same URL structure
- You want zero-configuration path mapping

Use **explicit proxy path** (`proxy('/different/path')`) when:
- Backend and frontend URLs differ
- You need to map multiple frontend paths to the same backend endpoint
- Implementing API versioning or path transformations

### Q: How do omitted proxy paths work?

**A:** When you omit the proxy path, the middleware uses the original request path:

```typescript
// Request: GET /api/users/123
app.get('/api/users/:id', proxy()); 
// → Proxies to: https://api.example.com/api/users/123

// Request: POST /api/orders
app.post('/api/orders', proxy());
// → Proxies to: https://api.example.com/api/orders
```

### Q: Can I use path parameters with omitted proxy paths?

**A:** Yes! Path parameters are automatically preserved:

```typescript
app.get('/api/users/:userId/orders/:orderId', proxy());
// GET /api/users/123/orders/456 
// → https://api.example.com/api/users/123/orders/456
```

## Error Handling

### Q: How do I handle errors from the proxied API?

**A:** Express Simple Proxy provides multiple error handling options:

```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({ /* headers */ }),
  
  // Custom error handler
  errorHandler: (error, req, res) => {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      code: error.code
    });
  },
  
  // Error processing hook
  errorHandlerHook: async (error, req, res) => {
    // Log to monitoring service
    await logError(error, req);
    return error;
  }
});
```

### Q: What types of errors does the proxy handle?

**A:** Three types of errors:

1. **Response Errors (4xx/5xx)**: Server responded with error status
2. **Network Errors (503)**: No response received (timeout, connection issues)
3. **Request Setup Errors (500)**: Invalid configuration or malformed requests

### Q: How do I add monitoring and logging?

**A:** Use the error handler hook:

```typescript
errorHandlerHook: async (error, req, res) => {
  // Send to monitoring service
  await monitoring.logError({
    error: error.message,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  // Send alerts for server errors
  if (error.status >= 500) {
    await alerting.sendAlert({
      title: 'API Proxy Error',
      severity: 'high',
      message: `${error.status}: ${error.message}`
    });
  }
  
  return error;
}
```

## File Uploads

### Q: How do I proxy file uploads?

**A:** Express Simple Proxy handles multipart/form-data automatically:

```typescript
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({ /* headers */ })
});

// Single file upload
app.post('/upload', upload.single('file'), proxy('/api/upload'));

// Multiple files
app.post('/upload-multiple', upload.array('files'), proxy('/api/upload-multiple'));
```

### Q: Do I need special configuration for file uploads?

**A:** No! The proxy automatically:
- Detects multipart/form-data content type
- Creates FormData with proper boundaries
- Includes both form fields and files
- Sets correct Content-Type headers

### Q: What file upload formats are supported?

**A:** All formats supported by Express and multer:
- Single files (`req.file`)
- Multiple files (`req.files` as array)
- Multiple field files (`req.files` as object)
- Mixed form data (files + text fields)

## TypeScript Support

### Q: How do I get proper TypeScript types?

**A:** Import types from the package:

```typescript
import {
  ProxyConfig,
  ProxyError,
  RequestWithLocals,
  ResponseHandler,
  ErrorHandler
} from 'express-simple-proxy';

const config: ProxyConfig = {
  baseURL: 'https://api.example.com',
  headers: (req: RequestWithLocals) => ({
    'Authorization': req.headers.authorization
  }),
  errorHandler: (error: ProxyError, req: RequestWithLocals, res: Response) => {
    // Fully typed error handling
  }
};
```

### Q: What's the difference between RequestWithLocals and RequestWithFiles?

**A:** 
- **RequestWithLocals**: Standard Express request with `req.locals` for custom data
- **RequestWithFiles**: Extends RequestWithLocals with file upload properties (`req.file`, `req.files`)

The proxy automatically handles the type conversion internally.

### Q: Can I use this with JavaScript (non-TypeScript) projects?

**A:** Yes! The package works perfectly with JavaScript:

```javascript
const { createProxyController } = require('express-simple-proxy');

const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization
  })
});
```

## Performance & Production

### Q: What's the performance impact of using this proxy?

**A:** The proxy is designed for high performance:
- Built on Axios for efficient HTTP requests
- Minimal overhead for request/response processing
- Configurable timeouts and request limits
- Connection pooling through Axios

### Q: How do I configure timeouts?

**A:** Set timeout in the configuration:

```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({ /* headers */ }),
  timeout: 30000 // 30 seconds (default)
});
```

### Q: Are there any rate limiting considerations?

**A:** The proxy forwards rate limiting headers from the backend:

```typescript
errorHandler: (error, req, res) => {
  // Forward rate limiting headers
  if (error.status === 429 && error.headers) {
    ['retry-after', 'x-ratelimit-remaining'].forEach(header => {
      if (error.headers[header]) {
        res.set(header, error.headers[header]);
      }
    });
  }
}
```

### Q: How do I handle CORS in production?

**A:** Configure CORS headers through the proxy:

```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({ /* headers */ }),
  responseHeaders: (response) => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  })
});
```

## Troubleshooting

### Q: Why am I getting "Request failed with status code 404"?

**A:** Common causes:
1. **Incorrect baseURL**: Verify the backend service URL
2. **Path mismatch**: Check if frontend and backend paths align
3. **Service unavailable**: Ensure the backend service is running

Debug with curl generation:

```typescript
// Enable in development
if (process.env.NODE_ENV === 'development') {
  // Curl commands are automatically logged to console
}
```

### Q: Why are my file uploads failing?

**A:** Check these common issues:
1. **Missing multer middleware**: Ensure multer is configured before the proxy
2. **Incorrect field names**: Verify field names match between frontend and backend
3. **File size limits**: Check if files exceed size limits
4. **Content-Type**: Ensure multipart/form-data is set

### Q: How do I debug proxy requests?

**A:** Use the built-in curl generation:

```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({ /* headers */ })
});

// In development, curl commands are logged automatically
// Check console output for the generated curl commands
```

### Q: Why am I getting TypeScript errors?

**A:** Common TypeScript issues:
1. **Import errors**: Ensure you're importing from 'express-simple-proxy'
2. **Type casting**: Use `as any` for Express middleware integration
3. **Request types**: Use `RequestWithLocals` or `RequestWithFiles` as needed

## Advanced Usage

### Q: Can I transform responses before sending to the client?

**A:** Yes, use custom response handlers:

```typescript
app.get('/api/users', proxy('/users', (req, res, remoteResponse) => {
  // Transform the response
  res.json({
    success: true,
    data: remoteResponse.data,
    timestamp: new Date().toISOString(),
    cached: false
  });
}));
```

### Q: How do I implement authentication forwarding?

**A:** Use the headers function:

```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => {
    const headers: Record<string, string> = {};
    
    // Forward authentication
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }
    
    // Add service-to-service authentication
    if (process.env.SERVICE_TOKEN) {
      headers['X-Service-Token'] = process.env.SERVICE_TOKEN;
    }
    
    // Add user context
    if (req.user) {
      headers['X-User-ID'] = req.user.id;
      headers['X-User-Role'] = req.user.role;
    }
    
    return headers;
  }
});
```

### Q: Can I use this with GraphQL?

**A:** Yes! Perfect for GraphQL endpoints:

```typescript
// GraphQL endpoint
app.post('/graphql', proxy('/graphql'));

// GraphQL with custom headers
const graphqlProxy = createProxyController({
  baseURL: 'https://graphql-api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'Content-Type': 'application/json'
  })
});

app.post('/graphql', graphqlProxy());
```

### Q: How do I implement service discovery?

**A:** Use dynamic baseURL configuration:

```typescript
const createServiceProxy = (serviceName: string) => {
  return createProxyController({
    baseURL: process.env[`${serviceName.toUpperCase()}_URL`] || 
             `https://${serviceName}.k8s.cluster.local`,
    headers: (req) => ({
      'Authorization': req.headers.authorization,
      'X-Service-Name': serviceName
    })
  });
};

const userService = createServiceProxy('user-service');
const orderService = createServiceProxy('order-service');
```

### Q: Can I cache responses?

**A:** Implement caching in custom response handlers:

```typescript
const cache = new Map();

app.get('/api/users', proxy('/users', async (req, res, remoteResponse) => {
  const cacheKey = `users:${JSON.stringify(req.query)}`;
  
  // Cache the response
  cache.set(cacheKey, {
    data: remoteResponse.data,
    timestamp: Date.now()
  });
  
  res.json({
    data: remoteResponse.data,
    cached: false,
    timestamp: new Date().toISOString()
  });
}));
```

---

## Still Have Questions?

If you don't find your question here:

1. **Check the Documentation**: Review the [README.md](./README.md) for detailed examples
2. **Run Examples**: Try the example files in the `examples/` directory
3. **Search Issues**: Look through [existing GitHub issues](https://github.com/nadimtuhin/express-simple-proxy/issues)
4. **Create an Issue**: [Open a new issue](https://github.com/nadimtuhin/express-simple-proxy/issues/new) with:
   - Your use case and expected behavior
   - Minimal code example reproducing the issue
   - Error messages and stack traces
   - Environment details (Node.js version, Express version, etc.)

## Contributing

Found an error in this FAQ or want to add more questions? 

1. Fork the repository
2. Edit this FAQ.md file
3. Submit a pull request

Your contributions help make this package better for everyone! 🎉