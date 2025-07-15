import express from 'express';
import { createProxyController } from '../src/index';

const app = express();

// Create proxy controller
const proxy = createProxyController({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: (req) => ({
    'User-Agent': 'express-simple-proxy-example',
  }),
});

// Transform user data
app.get('/users', proxy('/users', (req, res, remoteResponse) => {
  const transformedUsers = remoteResponse.data.map((user: any) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    website: user.website,
    company: user.company.name,
    address: `${user.address.street}, ${user.address.city}`,
  }));
  
  res.json({
    success: true,
    data: transformedUsers,
    total: transformedUsers.length,
    timestamp: new Date().toISOString(),
  });
}));

// Add metadata to posts
app.get('/posts', proxy('/posts', (req, res, remoteResponse) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;
  
  const paginatedPosts = remoteResponse.data.slice(offset, offset + limit);
  
  res.json({
    success: true,
    data: paginatedPosts,
    pagination: {
      page,
      limit,
      total: remoteResponse.data.length,
      pages: Math.ceil(remoteResponse.data.length / limit),
    },
    timestamp: new Date().toISOString(),
  });
}));

// Add statistics
app.get('/stats', proxy('/posts', (req, res, remoteResponse) => {
  const posts = remoteResponse.data;
  const userStats = posts.reduce((acc: any, post: any) => {
    acc[post.userId] = (acc[post.userId] || 0) + 1;
    return acc;
  }, {});
  
  res.json({
    success: true,
    data: {
      totalPosts: posts.length,
      uniqueUsers: Object.keys(userStats).length,
      postsPerUser: userStats,
      averagePostsPerUser: posts.length / Object.keys(userStats).length,
    },
    timestamp: new Date().toISOString(),
  });
}));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Response transformation proxy server running on port ${PORT}`);
  console.log('Try:');
  console.log(`  curl http://localhost:${PORT}/users`);
  console.log(`  curl http://localhost:${PORT}/posts?page=1&limit=5`);
  console.log(`  curl http://localhost:${PORT}/stats`);
});