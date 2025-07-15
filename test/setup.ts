import nock from 'nock';

// Setup nock for HTTP mocking
beforeEach(() => {
  nock.cleanAll();
});

afterEach(() => {
  nock.cleanAll();
});

// Global test timeout
jest.setTimeout(10000);

// Mock console.log and console.error during tests unless explicitly enabled
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  if (process.env.ENABLE_CONSOLE_LOGS !== 'true') {
    console.log = jest.fn();
    console.error = jest.fn();
  }
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});