import express from 'express';
import { createProxyController } from '../src/index';

const app = express();

// Create proxy controller
const proxy = createProxyController({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: (req) => ({
    'User-Agent': 'express-simple-proxy-example',
    'Authorization': req.headers.authorization || '',
  }),
});

// Basic proxy routes
app.get('/users', proxy('/users'));
app.get('/users/:id', proxy('/users/:id'));
app.get('/posts', proxy('/posts'));
app.get('/posts/:id', proxy('/posts/:id'));

// Custom path mapping
app.get('/api/users', proxy('/users'));
app.get('/api/users/:id', proxy('/users/:id'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Basic proxy server running on port ${PORT}`);
  console.log('Try:');
  console.log(`  curl http://localhost:${PORT}/users`);
  console.log(`  curl http://localhost:${PORT}/users/1`);
  console.log(`  curl http://localhost:${PORT}/posts`);
  console.log(`  curl http://localhost:${PORT}/api/users`);
});