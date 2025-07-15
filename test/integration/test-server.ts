/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
import express from 'express';
import multer from 'multer';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Mock data
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
];

const posts = [
  { id: 1, title: 'Post 1', content: 'Content 1', userId: 1 },
  { id: 2, title: 'Post 2', content: 'Content 2', userId: 2 },
];

// Utility function to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Users endpoints
app.get('/users', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;
  
  let filteredUsers = users;
  
  if (search) {
    filteredUsers = users.filter(user => 
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedUsers = filteredUsers.slice(start, end);
  
  res.json({
    data: paginatedUsers,
    pagination: {
      page,
      limit,
      total: filteredUsers.length,
      pages: Math.ceil(filteredUsers.length / limit),
    },
  });
});

app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  return res.json({ data: user });
});

app.post('/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      error: 'Validation failed',
      details: {
        name: !name ? 'Name is required' : undefined,
        email: !email ? 'Email is required' : undefined,
      },
    });
  }
  
  const newUser = {
    id: Math.max(...users.map(u => u.id)) + 1,
    name,
    email,
  };
  
  users.push(newUser);
  
  return res.status(201).json({
    data: newUser,
    message: 'User created successfully',
  });
});

app.put('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email } = req.body;
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (!name || !email) {
    return res.status(400).json({
      error: 'Validation failed',
      details: {
        name: !name ? 'Name is required' : undefined,
        email: !email ? 'Email is required' : undefined,
      },
    });
  }
  
  users[userIndex] = { ...users[userIndex], name, email };
  
  return res.json({
    data: users[userIndex],
    message: 'User updated successfully',
  });
});

app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  users.splice(userIndex, 1);
  
  res.status(204).send();
});

// Posts endpoints
app.get('/posts', (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  
  let filteredPosts = posts;
  
  if (userId) {
    filteredPosts = posts.filter(post => post.userId === userId);
  }
  
  res.json({ data: filteredPosts });
});

app.get('/posts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const post = posts.find(p => p.id === id);
  
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  res.json({ data: post });
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    data: {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fieldname: req.file.fieldname,
    },
    message: 'File uploaded successfully',
  });
});

// Multiple file upload endpoint
app.post('/upload-multiple', upload.array('files'), (req, res) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  const files = req.files as Express.Multer.File[];
  
  res.json({
    data: files.map(file => ({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      fieldname: file.fieldname,
    })),
    message: 'Files uploaded successfully',
  });
});

// Form data endpoint
app.post('/form-data', upload.single('avatar'), (req, res) => {
  const { name, email, description } = req.body;
  
  const response: any = {
    data: {
      name,
      email,
      description,
    },
  };
  
  if (req.file) {
    response.data.avatar = {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    };
  }
  
  res.json(response);
});

// Error simulation endpoints
app.get('/error/400', (_req, res) => {
  res.status(400).json({
    error: 'Bad Request',
    message: 'This is a simulated 400 error',
  });
});

app.get('/error/401', (_req, res) => {
  res.status(401).json({
    error: 'Unauthorized',
    message: 'This is a simulated 401 error',
  });
});

app.get('/error/403', (_req, res) => {
  res.status(403).json({
    error: 'Forbidden',
    message: 'This is a simulated 403 error',
  });
});

app.get('/error/404', (_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'This is a simulated 404 error',
  });
});

app.get('/error/500', (_req, res) => {
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'This is a simulated 500 error',
  });
});

// Rate limiting simulation
let rateLimitCount = 0;
app.get('/rate-limit', (req, res) => {
  rateLimitCount++;
  
  if (rateLimitCount > 3) {
    return res.status(429)
      .set({
        'retry-after': '60',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1234567890',
      })
      .json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
      });
  }
  
  res.set({
    'x-ratelimit-remaining': String(3 - rateLimitCount),
    'x-ratelimit-reset': '1234567890',
  });
  
  res.json({
    data: { message: 'Success', count: rateLimitCount },
  });
});

// Timeout simulation
app.get('/timeout', async (req, res) => {
  const delayMs = parseInt(req.query.delay as string) || 5000;
  await delay(delayMs);
  
  res.json({
    data: { message: 'Response after delay', delay: delayMs },
  });
});

// Headers test endpoint
app.get('/headers', (req, res) => {
  res.json({
    data: {
      receivedHeaders: req.headers,
      userAgent: req.headers['user-agent'],
      authorization: req.headers.authorization,
      customHeader: req.headers['x-custom-header'],
    },
  });
});

// Redirect endpoint
app.get('/redirect', (_req, res) => {
  res.redirect(302, '/users');
});

// Activity log simulation
app.post('/activity', (req, res) => {
  const { action, entity_type } = req.body;
  
  const activityId = Date.now();
  
  res.status(201).json({
    data: {
      id: activityId,
      action,
      entity_type,
      timestamp: new Date().toISOString(),
    },
  });
});

// Job simulation
app.post('/jobs', (req, res) => {
  const { type, data } = req.body;
  
  const jobId = `job_${Date.now()}`;
  
  res.status(201).json({
    data: {
      job_id: jobId,
      type,
      data,
      status: 'queued',
      created_at: new Date().toISOString(),
    },
  });
});

// Catch-all 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Test server error:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
});

export default app;