import express from 'express';
import multer from 'multer';
import { createProxyController } from '../src/index';

const app = express();

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Create proxy controller
const proxy = createProxyController({
  baseURL: 'https://httpbin.org',
  headers: (req) => ({
    'User-Agent': 'express-simple-proxy-example',
  }),
});

// File upload routes
app.post('/upload', upload.single('file'), proxy('/post'));
app.post('/upload-multiple', upload.array('files'), proxy('/post'));

// Form data with file
app.post('/form', upload.single('avatar'), proxy('/post'));

// JSON endpoint for comparison
app.post('/json', proxy('/post'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`File upload proxy server running on port ${PORT}`);
  console.log('Try:');
  console.log(`  curl -F "file=@package.json" http://localhost:${PORT}/upload`);
  console.log(`  curl -F "files=@package.json" -F "files=@tsconfig.json" http://localhost:${PORT}/upload-multiple`);
  console.log(`  curl -F "avatar=@package.json" -F "name=John" http://localhost:${PORT}/form`);
  console.log(`  curl -H "Content-Type: application/json" -d '{"name":"John"}' http://localhost:${PORT}/json`);
});