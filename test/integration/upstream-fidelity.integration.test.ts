import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import request from 'supertest';
import { createProxyController } from '../../src/proxy';

describe('Upstream request and response fidelity', () => {
  let upstream: http.Server;
  let upstreamUrl: string;
  let receivedUrls: string[];

  beforeAll(done => {
    upstream = http.createServer((req, res) => {
      receivedUrls.push(req.url as string);
      if (req.url?.startsWith('/html-error')) {
        res.writeHead(502, { 'Content-Type': 'text/html', 'X-Upstream': 'yes' });
        res.write('<h1>Bad');
        res.end(' gateway</h1>');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ url: req.url }));
    });
    upstream.listen(0, () => {
      upstreamUrl = `http://localhost:${(upstream.address() as AddressInfo).port}`;
      done();
    });
  });

  afterAll(done => {
    upstream.close(() => done());
  });

  beforeEach(() => {
    receivedUrls = [];
  });

  function appWith(route: string, proxyPath?: string): express.Application {
    const app = express();
    const proxy = createProxyController({ baseURL: upstreamUrl, headers: () => ({}) });
    app.get(route, proxy(proxyPath) as any);
    return app;
  }

  describe('path parameters', () => {
    it('keeps an encoded slash inside one path segment', async () => {
      const app = appWith('/users/:id', '/users/:id');

      await request(app).get('/users/..%2Fadmin').expect(200);

      expect(receivedUrls).toEqual(['/users/..%2Fadmin']);
    });

    it('does not let an encoded "?" in a parameter start a query string', async () => {
      const app = appWith('/users/:id', '/users/:id');

      await request(app).get('/users/1%3Frole%3Dadmin').expect(200);

      expect(receivedUrls).toEqual(['/users/1%3Frole%3Dadmin']);
    });
  });

  describe('query strings', () => {
    it('forwards nested query parameters instead of "[object Object]"', async () => {
      const app = appWith('/search', '/search');

      await request(app).get('/search?filter[name]=ann&filter[tags][]=a&filter[tags][]=b');

      const forwarded = new URL(receivedUrls[0] as string, 'http://x').searchParams;
      expect(forwarded.get('filter[name]')).toBe('ann');
      expect(forwarded.getAll('filter[tags]')).toEqual(['a', 'b']);
    });
  });

  describe('upstream error responses', () => {
    it('labels the JSON error body as JSON, not with the upstream content-type', async () => {
      const app = appWith('/html-error', '/html-error');

      const response = await request(app).get('/html-error').expect(502);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['x-upstream']).toBe('yes');
    });

    it('does not forward hop-by-hop headers from the upstream response', async () => {
      const app = appWith('/html-error', '/html-error');

      const response = await request(app).get('/html-error').expect(502);

      expect(response.headers['transfer-encoding']).toBeUndefined();
      expect(response.headers['content-length']).toBeDefined();
    });
  });
});
