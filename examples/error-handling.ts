import express from 'express';
import { createProxyController } from '../src/index';

const app = express();

// Create proxy controller with comprehensive error handling
const proxy = createProxyController({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: (req) => ({
    'User-Agent': 'express-simple-proxy-example',
    'X-Request-ID': req.headers['x-request-id'] || `req-${Date.now()}`,
  }),
  
  // Error processing hook
  errorHandlerHook: async (error, req, res) => {
    // Log error with context
    console.error('Proxy Error:', {
      message: error.message,
      status: error.status,
      url: req.originalUrl,
      method: req.method,
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    });
    
    // Add request context to error
    (error as any).context = {
      method: req.method,
      path: req.path,
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    };
    
    return error;
  },
  
  // Custom error response handler
  errorHandler: (error, req, res) => {
    const response = {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        status: error.status || 500,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        path: req.path,
      },
    };
    
    // Add development details
    if (process.env.NODE_ENV === 'development') {
      (response.error as any).details = error.data;
      (response.error as any).stack = error.stack;
    }
    
    res.status(error.status || 500).json(response);
  },
});

// Routes
app.get('/users', proxy('/users'));
app.get('/users/:id', proxy('/users/:id'));
app.get('/nonexistent', proxy('/nonexistent-endpoint'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Error handling proxy server running on port ${PORT}`);
  console.log('Try:');
  console.log(`  curl http://localhost:${PORT}/users`);
  console.log(`  curl http://localhost:${PORT}/users/1`);
  console.log(`  curl http://localhost:${PORT}/nonexistent`);
});