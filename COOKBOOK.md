# Express Simple Proxy Cookbook

A collection of practical examples and recipes for common use cases with Express Simple Proxy.

## Table of Contents

- [Authentication & Security](#authentication--security)
- [File Handling](#file-handling)
- [Database & Caching](#database--caching)
- [Monitoring & Observability](#monitoring--observability)
- [Load Balancing & Failover](#load-balancing--failover)
- [Development & Testing](#development--testing)
- [Rate Limiting & Throttling](#rate-limiting--throttling)
- [Data Transformation](#data-transformation)
- [Content Negotiation](#content-negotiation)

## Authentication & Security

### JWT Token Forwarding
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-User-ID': req.user?.id,
    'X-Request-ID': crypto.randomUUID()
  })
});
```

### API Key Authentication
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'X-API-Key': process.env.API_KEY,
    'Authorization': `Bearer ${req.headers.authorization}`
  })
});
```

### Basic Auth Conversion
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => {
    const { username, password } = req.body;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    return { 'Authorization': `Basic ${auth}` };
  }
});
```

### Multi-Factor Authentication Headers
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-MFA-Token': req.headers['x-mfa-token'],
    'X-Device-ID': req.headers['x-device-id'],
    'X-Session-ID': req.sessionID
  })
});
```

### OAuth2 Token Refresh
```typescript
// Token refresh middleware
const tokenRefreshMiddleware = async (req, res, next) => {
  let token = req.headers.authorization;
  
  // Check if token needs refresh
  if (isTokenExpired(token)) {
    try {
      token = await refreshAccessToken(req.user.refreshToken);
      req.headers.authorization = token;
    } catch (error) {
      return res.status(401).json({ error: 'Token refresh failed' });
    }
  }
  
  next();
};

const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization
  })
});

// Use refresh middleware before proxy
app.use('/api', tokenRefreshMiddleware, proxy());
```

## File Handling

### Single File Upload
```typescript
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), proxy('/api/upload'));
```

### Multiple Files with Validation
```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

app.post('/upload-images', upload.array('images', 5), proxy('/api/upload'));
```

### Form Data with Files
```typescript
app.post('/profile', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'documents', maxCount: 3 }
]), proxy('/api/profile'));
```

### File Upload with Progress Tracking
```typescript
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'video/', 'application/pdf'];
    if (allowedTypes.some(type => file.mimetype.startsWith(type))) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

app.post('/upload-with-progress', upload.single('file'), 
  (req, res, next) => {
    // Add file metadata to headers
    req.headers['x-file-size'] = req.file?.size?.toString();
    req.headers['x-file-type'] = req.file?.mimetype;
    next();
  },
  proxy('/api/upload')
);
```

### Chunked File Upload
```typescript
app.post('/upload-chunk', (req, res, next) => {
  const chunkIndex = req.headers['x-chunk-index'];
  const totalChunks = req.headers['x-total-chunks'];
  const fileId = req.headers['x-file-id'];
  
  req.headers['x-chunk-info'] = JSON.stringify({
    index: chunkIndex,
    total: totalChunks,
    fileId: fileId
  });
  
  next();
}, proxy('/api/upload/chunk'));
```

## Database & Caching

### Database Connection Headers
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'X-Database-Pool': 'primary',
    'X-Read-Preference': req.method === 'GET' ? 'secondary' : 'primary',
    'X-Transaction-ID': req.headers['x-transaction-id']
  })
});
```

### Cache Control
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  responseHeaders: (response) => ({
    'Cache-Control': response.data?.cacheable ? 'public, max-age=300' : 'no-cache',
    'X-Cache-Status': 'MISS'
  })
});
```

### Database Sharding
```typescript
const getShardURL = (userId) => {
  const shardId = userId % 4; // 4 shards
  return `https://api-shard-${shardId}.example.com`;
};

// Create proxy based on user shard
app.use('/api', (req, res, next) => {
  const userId = req.user?.id || 0;
  const shardURL = getShardURL(userId);
  
  const proxy = createProxyController({
    baseURL: shardURL,
    headers: (req) => ({
      'Authorization': req.headers.authorization,
      'X-User-ID': req.user?.id,
      'X-Shard-ID': userId % 4
    })
  });
  
  proxy()(req, res, next);
});
```

### Redis Cache Integration
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Cache middleware that runs before proxy
const cacheMiddleware = async (req, res, next) => {
  if (req.method === 'GET') {
    const cacheKey = `${req.method}:${req.path}:${req.user?.id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  }
  next();
};

const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Cache-Key': `${req.method}:${req.path}:${req.user?.id}`
  }),
  errorHandlerHook: (error, req, res) => {
    // Log cache miss on error
    console.log('Cache miss and API error:', error.message);
    return error;
  }
});

// Use both middleware
app.use('/api', cacheMiddleware, proxy());
```

## Monitoring & Observability

### Request Tracing
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'X-Trace-ID': req.headers['x-trace-id'] || crypto.randomUUID(),
    'X-Span-ID': crypto.randomUUID(),
    'X-Parent-Span': req.headers['x-span-id']
  })
});
```

### Performance Monitoring
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  errorHandlerHook: async (error, req, res) => {
    // Log performance metrics
    const duration = Date.now() - req.startTime;
    console.log({
      method: req.method,
      path: req.path,
      status: error.status,
      duration,
      error: error.message
    });
    
    return error;
  }
});

// Middleware to track start time
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});
```

### Health Checks
```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/health', proxy('/health'));
```

### OpenTelemetry Integration
```typescript
import { trace } from '@opentelemetry/api';

const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => {
    const span = trace.getActiveSpan();
    const traceId = span?.spanContext().traceId;
    const spanId = span?.spanContext().spanId;
    
    return {
      'Authorization': req.headers.authorization,
      'X-Trace-ID': traceId,
      'X-Span-ID': spanId,
      'X-Service-Name': 'api-gateway'
    };
  }
});
```

### Prometheus Metrics
```typescript
import client from 'prom-client';

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'status_code', 'endpoint']
});

const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({ 'Authorization': req.headers.authorization }),
  errorHandlerHook: async (error, req, res) => {
    const duration = (Date.now() - req.startTime) / 1000;
    httpRequestDuration
      .labels(req.method, error.status || 500, req.path)
      .observe(duration);
    return error;
  }
});
```

## Load Balancing & Failover

### Round Robin Load Balancing
```typescript
const servers = [
  'https://api1.example.com',
  'https://api2.example.com',
  'https://api3.example.com'
];

let currentServer = 0;

// Create separate proxy controllers for each server
const getLoadBalancedProxy = () => {
  const server = servers[currentServer];
  currentServer = (currentServer + 1) % servers.length;
  
  return createProxyController({
    baseURL: server,
    headers: (req) => ({ 'Authorization': req.headers.authorization })
  });
};

// Use in middleware
app.use('/api', (req, res, next) => {
  const proxy = getLoadBalancedProxy();
  proxy()(req, res, next);
});
```

### Weighted Load Balancing
```typescript
const servers = [
  { url: 'https://api1.example.com', weight: 3 },
  { url: 'https://api2.example.com', weight: 2 },
  { url: 'https://api3.example.com', weight: 1 }
];

const getWeightedServer = () => {
  const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
  const random = Math.random() * totalWeight;
  let weightSum = 0;
  
  for (const server of servers) {
    weightSum += server.weight;
    if (random <= weightSum) {
      return server.url;
    }
  }
  return servers[0].url;
};

// Create proxy with weighted selection
app.use('/api', (req, res, next) => {
  const selectedServer = getWeightedServer();
  const proxy = createProxyController({
    baseURL: selectedServer,
    headers: (req) => ({ 'Authorization': req.headers.authorization })
  });
  proxy()(req, res, next);
});
```

### Failover with Retry
```typescript
const primaryProxy = createProxyController({
  baseURL: 'https://api-primary.example.com',
  timeout: 5000,
  headers: (req) => ({ 'Authorization': req.headers.authorization })
});

const fallbackProxy = createProxyController({
  baseURL: 'https://api-fallback.example.com',
  headers: (req) => ({ 'Authorization': req.headers.authorization })
});

// Failover middleware
app.use('/api', async (req, res, next) => {
  try {
    await primaryProxy()(req, res, next);
  } catch (error) {
    if (error.status >= 500) {
      console.log('Primary failed, using fallback');
      await fallbackProxy()(req, res, next);
    } else {
      throw error;
    }
  }
});
```

### Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  constructor(failureThreshold = 5, timeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  canExecute() {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true; // HALF_OPEN
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

const circuitBreaker = new CircuitBreaker();

const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({ 'Authorization': req.headers.authorization }),
  errorHandlerHook: async (error, req, res) => {
    if (!circuitBreaker.canExecute()) {
      res.status(503).json({ error: 'Service temporarily unavailable' });
      return null;
    }
    
    if (error.status >= 500) {
      circuitBreaker.onFailure();
    } else {
      circuitBreaker.onSuccess();
    }
    
    return error;
  }
});
```

## Development & Testing

### Environment-Based Routing
```typescript
const getBaseURL = () => {
  switch (process.env.NODE_ENV) {
    case 'production': return 'https://api.prod.com';
    case 'staging': return 'https://api.staging.com';
    default: return 'https://api.dev.com';
  }
};

const proxy = createProxyController({
  baseURL: getBaseURL(),
  headers: (req) => ({
    'X-Environment': process.env.NODE_ENV,
    'Authorization': req.headers.authorization
  })
});
```

### Mock Responses for Testing
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({ 'Authorization': req.headers.authorization }),
  errorHandler: (error, req, res) => {
    if (process.env.NODE_ENV === 'test' && req.path.includes('/mock')) {
      return res.json({ mocked: true, path: req.path });
    }
    res.status(error.status || 500).json({ error: error.message });
  }
});
```

### Debug Mode
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => {
    const headers = { 'Authorization': req.headers.authorization };
    
    if (process.env.DEBUG === 'true') {
      console.log('Proxy Request:', {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body
      });
    }
    
    return headers;
  }
});
```

### A/B Testing
```typescript
// A/B testing middleware
app.use('/api', (req, res, next) => {
  const userId = req.user?.id;
  const isVariantB = userId % 2 === 0; // 50/50 split
  const baseURL = isVariantB ? 'https://api-variant-b.com' : 'https://api-variant-a.com';
  
  const proxy = createProxyController({
    baseURL: baseURL,
    headers: (req) => ({
      'Authorization': req.headers.authorization,
      'X-Variant': isVariantB ? 'B' : 'A'
    })
  });
  
  proxy()(req, res, next);
});
```

### Feature Flags
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'X-Feature-Flags': JSON.stringify({
      newUserInterface: req.user?.features?.includes('new-ui'),
      betaFeatures: req.user?.isBeta,
      experimentalApi: process.env.EXPERIMENTAL_API === 'true'
    })
  })
});
```

## Rate Limiting & Throttling

### Request Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter, proxy());
```

### Per-User Rate Limiting
```typescript
const userLimiters = new Map();

const getUserLimiter = (userId) => {
  if (!userLimiters.has(userId)) {
    userLimiters.set(userId, rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      skip: () => false
    }));
  }
  return userLimiters.get(userId);
};

app.use('/api', (req, res, next) => {
  const userId = req.user?.id;
  if (userId) {
    getUserLimiter(userId)(req, res, next);
  } else {
    next();
  }
}, proxy());
```

### Sliding Window Rate Limiting
```typescript
import Redis from 'ioredis';
const redis = new Redis();

const slidingWindowLimiter = async (req, res, next) => {
  const key = `rate_limit:${req.ip}`;
  const window = 60; // 60 seconds
  const limit = 100; // 100 requests per window
  
  const now = Date.now();
  const pipeline = redis.pipeline();
  
  // Remove old entries
  pipeline.zremrangebyscore(key, 0, now - window * 1000);
  // Add current request
  pipeline.zadd(key, now, now);
  // Count requests in window
  pipeline.zcard(key);
  // Set expiry
  pipeline.expire(key, window);
  
  const results = await pipeline.exec();
  const requestCount = results[2][1];
  
  if (requestCount > limit) {
    return res.status(429).json({ error: 'Too Many Requests' });
  }
  
  next();
};

app.use('/api', slidingWindowLimiter, proxy());
```

### Distributed Rate Limiting
```typescript
import Redis from 'ioredis';
const redis = new Redis.Cluster([
  { host: 'redis-1', port: 6379 },
  { host: 'redis-2', port: 6379 }
]);

const distributedRateLimit = async (req, res, next) => {
  const userId = req.user?.id || req.ip;
  const key = `global_rate_limit:${userId}`;
  
  const script = `
    local key = KEYS[1]
    local window = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    redis.call('zremrangebyscore', key, 0, now - window * 1000)
    local count = redis.call('zcard', key)
    
    if count < limit then
      redis.call('zadd', key, now, now)
      redis.call('expire', key, window)
      return {1, limit - count - 1}
    else
      return {0, 0}
    end
  `;
  
  const [allowed, remaining] = await redis.eval(
    script, 1, key, 60, 1000, Date.now()
  );
  
  if (!allowed) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      retryAfter: 60 
    });
  }
  
  res.set('X-RateLimit-Remaining', remaining);
  next();
};

app.use('/api', distributedRateLimit, proxy());
```

## Data Transformation

### Request Body Transformation
```typescript
app.use(express.json());

app.post('/api/users', (req, res, next) => {
  // Transform camelCase to snake_case
  req.body = Object.fromEntries(
    Object.entries(req.body).map(([k, v]) => [
      k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`), v
    ])
  );
  next();
}, proxy());
```

### Response Transformation
```typescript
app.get('/api/users', proxy(undefined, (req, res, remoteResponse) => {
  // Transform snake_case to camelCase
  const transformedData = remoteResponse.data.map(user => 
    Object.fromEntries(
      Object.entries(user).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), v
      ])
    )
  );
  
  res.json({
    success: true,
    data: transformedData,
    meta: {
      count: transformedData.length,
      timestamp: new Date().toISOString()
    }
  });
}));
```

### Schema Validation and Transformation
```typescript
import Joi from 'joi';

const userSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required()
});

app.post('/api/users', (req, res, next) => {
  const { error, value } = userSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  // Transform to backend format
  req.body = {
    first_name: value.firstName,
    last_name: value.lastName,
    email_address: value.email
  };
  
  next();
}, proxy());
```

### GraphQL to REST Transformation
```typescript
app.post('/graphql', express.json(), (req, res, next) => {
  const { query, variables } = req.body;
  
  // Simple query parser (use a proper GraphQL parser in production)
  if (query.includes('user(id:')) {
    const userId = variables?.id || query.match(/id:\s*"?(\w+)"?/)?.[1];
    req.method = 'GET';
    req.url = `/api/users/${userId}`;
    return proxy()(req, res);
  }
  
  if (query.includes('createUser')) {
    req.method = 'POST';
    req.url = '/api/users';
    req.body = variables?.input;
    return proxy()(req, res);
  }
  
  next();
});
```

## Content Negotiation

### Accept Header Handling
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => {
    const acceptHeader = req.headers.accept || 'application/json';
    return {
      'Authorization': req.headers.authorization,
      'Accept': acceptHeader,
      'Content-Type': req.headers['content-type'] || 'application/json'
    };
  }
});
```

### Language Negotiation
```typescript
const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'Accept-Language': req.headers['accept-language'] || 'en-US',
    'X-User-Locale': req.user?.locale || 'en'
  })
});
```

### Content Compression
```typescript
import compression from 'compression';

app.use(compression());

const proxy = createProxyController({
  baseURL: 'https://api.example.com',
  headers: (req) => ({
    'Authorization': req.headers.authorization,
    'Accept-Encoding': req.headers['accept-encoding'] || 'gzip, deflate'
  }),
  responseHeaders: (response) => ({
    'Content-Encoding': 'gzip',
    'Vary': 'Accept-Encoding'
  })
});
```

### Multi-format Response
```typescript
app.get('/api/users/:id', (req, res) => {
  const acceptHeader = req.headers.accept;
  
  if (acceptHeader?.includes('application/xml')) {
    return proxy('/api/users/:id.xml')(req, res);
  } else if (acceptHeader?.includes('text/csv')) {
    return proxy('/api/users/:id.csv')(req, res);
  } else {
    return proxy('/api/users/:id.json')(req, res);
  }
});
```

---

For more examples and use cases, check the [main documentation](./README.md) and [examples directory](./examples/).