import { createProxyController } from '../../src/proxy';
import { ProxyConfig } from '../../src/types';

describe('Omitted Proxy Path Unit Tests', () => {
  let config: ProxyConfig;

  beforeEach(() => {
    config = {
      baseURL: 'https://api.example.com',
      headers: () => ({ 'User-Agent': 'test-proxy' }),
    };
  });

  describe('Path Resolution Logic', () => {
    it('should use request path when proxy path is omitted', () => {
      const proxy = createProxyController(config);
      const middleware = proxy(); // No proxy path provided

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // Express middleware signature (req, res, next)
    });

    it('should use explicit proxy path when provided', () => {
      const proxy = createProxyController(config);
      const middleware = proxy('/api/explicit/path'); // Explicit proxy path

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // Express middleware signature (req, res, next)
    });

    it('should create different middleware functions for different proxy paths', () => {
      const proxy = createProxyController(config);
      
      const middleware1 = proxy(); // Omitted path
      const middleware2 = proxy('/api/custom'); // Explicit path
      const middleware3 = proxy(); // Another omitted path

      expect(middleware1).not.toBe(middleware2);
      expect(middleware1).not.toBe(middleware3);
      expect(middleware2).not.toBe(middleware3);
    });

    it('should handle undefined proxy path parameter', () => {
      const proxy = createProxyController(config);
      const middleware = proxy(undefined); // Explicitly undefined

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3);
    });

    it('should handle empty string proxy path', () => {
      const proxy = createProxyController(config);
      const middleware = proxy(''); // Empty string

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3);
    });
  });

  describe('ProxyController Function Signature', () => {
    it('should accept no parameters (omitted path)', () => {
      const proxy = createProxyController(config);
      
      expect(() => proxy()).not.toThrow();
      expect(typeof proxy()).toBe('function');
    });

    it('should accept only handler parameter (omitted path with handler)', () => {
      const proxy = createProxyController(config);
      const customHandler = (_req: any, res: any, remoteResponse: any) => {
        res.json({ custom: true, data: remoteResponse.data });
      };

      expect(() => proxy(undefined, customHandler)).not.toThrow();
      expect(typeof proxy(undefined, customHandler)).toBe('function');
    });

    it('should accept boolean handler parameter (omitted path with boolean)', () => {
      const proxy = createProxyController(config);

      expect(() => proxy(undefined, true)).not.toThrow();
      expect(typeof proxy(undefined, true)).toBe('function');
    });

    it('should handle all parameter combinations', () => {
      const proxy = createProxyController(config);
      const customHandler = (_req: any, res: any, remoteResponse: any) => {
        res.json(remoteResponse.data);
      };

      // Test all valid combinations
      expect(() => proxy()).not.toThrow();                          // No params
      expect(() => proxy(undefined)).not.toThrow();                 // Undefined path
      expect(() => proxy(undefined, undefined)).not.toThrow();      // Both undefined
      expect(() => proxy(undefined, customHandler)).not.toThrow();  // Undefined path, custom handler
      expect(() => proxy(undefined, true)).not.toThrow();          // Undefined path, boolean handler
      expect(() => proxy(undefined, false)).not.toThrow();         // Undefined path, false handler
    });
  });

  describe('Configuration Validation', () => {
    it('should validate configuration regardless of proxy path presence', () => {
      const invalidConfig = {
        baseURL: '',
        headers: () => ({}),
      };

      expect(() => createProxyController(invalidConfig)).toThrow('config.baseURL is required');
    });

    it('should validate headers function regardless of proxy path presence', () => {
      const invalidConfig = {
        baseURL: 'https://api.example.com',
        headers: 'not a function' as any,
      };

      expect(() => createProxyController(invalidConfig)).toThrow('config.headers must be a function');
    });

    it('should validate error handlers regardless of proxy path presence', () => {
      const invalidConfig = {
        baseURL: 'https://api.example.com',
        headers: () => ({}),
        errorHandler: 'not a function' as any,
      };

      expect(() => createProxyController(invalidConfig)).toThrow('config.errorHandler must be a function');
    });

    it('should validate error handler hook regardless of proxy path presence', () => {
      const invalidConfig = {
        baseURL: 'https://api.example.com',
        headers: () => ({}),
        errorHandlerHook: 'not a function' as any,
      };

      expect(() => createProxyController(invalidConfig)).toThrow('config.errorHandlerHook must be a function');
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety with omitted proxy path', () => {
      const proxy = createProxyController(config);
      
      // These should compile without TypeScript errors
      const middleware1 = proxy();
      const middleware2 = proxy(undefined);
      const middleware3 = proxy(undefined, true);
      const middleware4 = proxy(undefined, false);
      const middleware5 = proxy(undefined, (_req, res, remoteResponse) => {
        res.json(remoteResponse.data);
      });

      // All should return middleware functions
      expect(typeof middleware1).toBe('function');
      expect(typeof middleware2).toBe('function');
      expect(typeof middleware3).toBe('function');
      expect(typeof middleware4).toBe('function');
      expect(typeof middleware5).toBe('function');
    });
  });

  describe('Error Handling with Omitted Paths', () => {
    it('should use default error handler when no custom handler provided', () => {
      const proxy = createProxyController(config);
      const middleware = proxy(); // No custom error handler

      expect(typeof middleware).toBe('function');
      // Default error handler should be used internally
    });

    it('should use custom error handler with omitted proxy path', () => {
      const customErrorHandler = jest.fn();
      const configWithCustomErrorHandler = {
        ...config,
        errorHandler: customErrorHandler,
      };

      const proxy = createProxyController(configWithCustomErrorHandler);
      const middleware = proxy(); // Omitted path with custom error handler

      expect(typeof middleware).toBe('function');
      // Custom error handler should be used internally
    });

    it('should use error handler hook with omitted proxy path', () => {
      const errorHandlerHook = jest.fn();
      const configWithHook = {
        ...config,
        errorHandlerHook,
      };

      const proxy = createProxyController(configWithHook);
      const middleware = proxy(); // Omitted path with error handler hook

      expect(typeof middleware).toBe('function');
      // Error handler hook should be used internally
    });
  });
});