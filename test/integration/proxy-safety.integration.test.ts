import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import request from 'supertest';
import { createProxyController } from '../../src/proxy';
import { ProxyConfig } from '../../src/types';

interface Received {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}

describe('Proxy safety and request fidelity', () => {
  let upstream: http.Server;
  let upstreamUrl: string;
  let received: Received[];

  beforeAll(done => {
    upstream = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        received.push({
          method: req.method as string,
          url: req.url as string,
          headers: req.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
        if (req.url?.startsWith('/redirect')) {
          res.writeHead(302, { Location: `${upstreamUrl}/internal/secret` });
          res.end();
          return;
        }
        if (req.url?.startsWith('/internal')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ secret: 'internal-only' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    });
    upstream.listen(0, () => {
      upstreamUrl = `http://localhost:${(upstream.address() as AddressInfo).port}`;
      done();
    });
  });

  afterAll(done => {
    upstream.closeAllConnections();
    upstream.close(() => done());
  });

  beforeEach(() => {
    received = [];
  });

  function proxyFor(overrides: Partial<ProxyConfig> = {}, basePath = '') {
    return createProxyController({
      baseURL: `${upstreamUrl}${basePath}`,
      headers: () => ({}),
      timeout: 3000,
      ...overrides,
    });
  }

  describe('dot segments (path traversal out of the proxied prefix)', () => {
    it('rejects a path param of ".." instead of letting the URL parser resolve it', async () => {
      const app = express();
      app.get('/users/:id/profile', proxyFor()('/users/:id/profile') as any);

      await request(app).get('/users/%2E%2E/profile').expect(400);

      expect(received).toEqual([]);
    });

    it('rejects an encoded "%2e%2e" segment when the request path is forwarded as-is', async () => {
      const app = express();
      app.use('/api', proxyFor({}, '/v1/public')() as any);

      await request(app).get('/api/%2e%2e/%2e%2e/internal/secret').expect(400);

      expect(received).toEqual([]);
    });

    it('still forwards ordinary paths and params containing dots', async () => {
      const app = express();
      app.get('/files/:name', proxyFor()('/files/:name') as any);
      app.use('/api', proxyFor({}, '/v1')() as any);

      await request(app).get('/files/report.v2.pdf').expect(200);
      await request(app).get('/api/a/.well-known/b').expect(200);

      expect(received.map(r => r.url)).toEqual(['/files/report.v2.pdf', '/v1/a/.well-known/b']);
    });
  });

  describe('upstream redirects', () => {
    it('passes a 3xx back to the client instead of following it server-side', async () => {
      const app = express();
      app.get('/redirect', proxyFor()('/redirect') as any);

      const response = await request(app).get('/redirect').redirects(0);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(`${upstreamUrl}/internal/secret`);
      expect(JSON.stringify(response.body)).not.toContain('internal-only');
      expect(received.map(r => r.url)).toEqual(['/redirect']);
    });
  });

  describe('outgoing headers', () => {
    it('drops Host, Content-Length and hop-by-hop headers taken from the client request', async () => {
      const app = express();
      app.use(express.json());
      app.post(
        '/items',
        proxyFor({ headers: req => ({ ...(req.headers as any) }) })('/items') as any
      );

      // Re-serialization shrinks this body, so a copied Content-Length would be stale.
      const raw = '{ "name" :   "widget" }';
      await request(app)
        .post('/items')
        .set('Host', 'proxy.example.com')
        .set('Content-Type', 'application/json')
        .set('Connection', 'keep-alive, x-secret-hop')
        .set('X-Secret-Hop', 'should-not-pass')
        .set('X-Trace', 't1')
        .send(raw)
        .expect(200);

      expect(received).toHaveLength(1);
      const got = received[0] as Received;
      expect(got.body).toBe('{"name":"widget"}');
      expect(got.headers['content-length']).toBe(String(Buffer.byteLength(got.body)));
      expect(got.headers.host).toBe(new URL(upstreamUrl).host);
      expect(got.headers['x-secret-hop']).toBeUndefined();
      expect(got.headers['x-trace']).toBe('t1');
    });

    it('keeps a lowercase content-type from config.headers instead of adding a second one', async () => {
      const app = express();
      app.use(express.json());
      app.post(
        '/items',
        proxyFor({ headers: () => ({ 'content-type': 'application/vnd.api+json' }) })(
          '/items'
        ) as any
      );

      await request(app).post('/items').send({ a: 1 }).expect(200);

      expect((received[0] as Received).headers['content-type']).toBe('application/vnd.api+json');
    });
  });

  describe('request bodies without a body parser', () => {
    it('streams the raw body through instead of dropping it', async () => {
      const app = express();
      app.post('/upload', proxyFor()('/upload') as any);

      const big = 'x'.repeat(2 * 1024 * 1024);
      await request(app).post('/upload').set('Content-Type', 'text/plain').send(big).expect(200);

      const got = received[0] as Received;
      expect(got.body.length).toBe(big.length);
      expect(got.headers['content-type']).toBe('text/plain');
    });

    it('forwards a body the JSON parser skipped because of its content type', async () => {
      const app = express();
      app.use(express.json());
      app.put('/doc', proxyFor()('/doc') as any);

      await request(app)
        .put('/doc')
        .set('Content-Type', 'application/xml')
        .send('<doc>hi</doc>')
        .expect(200);

      const got = received[0] as Received;
      expect(got.body).toBe('<doc>hi</doc>');
      expect(got.headers['content-type']).toBe('application/xml');
    });

    it('does not forward a stale incoming Content-Length for a streamed body', async () => {
      const app = express();
      // Simulate a Content-Length that no longer matches the bytes on the stream
      // (stale, rewritten by middleware, or attacker-controlled).
      app.use((req, _res, next) => {
        req.headers['content-length'] = '999';
        next();
      });
      app.post('/upload', proxyFor()('/upload') as any);

      await request(app).post('/upload').set('Content-Type', 'text/plain').send('abc').expect(200);

      const got = received[0] as Received;
      expect(got.body).toBe('abc');
      expect(got.headers['content-length']).not.toBe('999');
      if (got.headers['content-length'] !== undefined) {
        expect(got.headers['content-length']).toBe(String(Buffer.byteLength(got.body)));
      } else {
        expect(got.headers['transfer-encoding']).toBe('chunked');
      }
    });
  });
});
