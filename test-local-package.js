#!/usr/bin/env node

/**
 * Local Package Test
 * 
 * This script tests the local built package to ensure it works correctly
 * before publishing to npm. It simulates how users will interact with the package.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Local Package Test');
console.log('====================\n');

let testCount = 0;
let passedTests = 0;

function test(name, testFn) {
  testCount++;
  try {
    testFn();
    console.log(`✅ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

function testFileExists(name, filePath) {
  test(name, () => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
  });
}

console.log('📁 Testing built files...');

// Test that all required files exist
const libDir = path.join(__dirname, 'lib');
testFileExists('lib directory exists', libDir);
testFileExists('index.js exists', path.join(libDir, 'index.js'));
testFileExists('index.d.ts exists', path.join(libDir, 'index.d.ts'));
testFileExists('proxy.js exists', path.join(libDir, 'proxy.js'));
testFileExists('proxy.d.ts exists', path.join(libDir, 'proxy.d.ts'));
testFileExists('utils.js exists', path.join(libDir, 'utils.js'));
testFileExists('utils.d.ts exists', path.join(libDir, 'utils.d.ts'));
testFileExists('types.js exists', path.join(libDir, 'types.js'));
testFileExists('types.d.ts exists', path.join(libDir, 'types.d.ts'));

console.log('\n📦 Testing package.json configuration...');

test('package.json exists', () => {
  const packagePath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packagePath)) {
    throw new Error('package.json does not exist');
  }
});

test('package.json has correct main entry', () => {
  const packageJson = require('./package.json');
  if (packageJson.main !== 'lib/index.js') {
    throw new Error(`Expected main to be 'lib/index.js', got '${packageJson.main}'`);
  }
});

test('package.json has correct types entry', () => {
  const packageJson = require('./package.json');
  if (packageJson.types !== 'lib/index.d.ts') {
    throw new Error(`Expected types to be 'lib/index.d.ts', got '${packageJson.types}'`);
  }
});

test('package.json files array is correct', () => {
  const packageJson = require('./package.json');
  const expectedFiles = ['lib', 'README.md', 'CHANGELOG.md', 'LICENSE'];
  const hasAllFiles = expectedFiles.every(file => packageJson.files.includes(file));
  if (!hasAllFiles) {
    throw new Error(`Files array missing required files. Expected: ${expectedFiles.join(', ')}`);
  }
});

console.log('\n📥 Testing imports...');

test('CommonJS import works', () => {
  const { createProxyController, axiosProxyRequest, defaultErrorHandler } = require('./lib/index.js');
  
  if (typeof createProxyController !== 'function') {
    throw new Error('createProxyController is not a function');
  }
  if (typeof axiosProxyRequest !== 'function') {
    throw new Error('axiosProxyRequest is not a function');
  }
  if (typeof defaultErrorHandler !== 'function') {
    throw new Error('defaultErrorHandler is not a function');
  }
});

test('Utility functions import works', () => {
  const { 
    urlJoin, 
    replaceUrlTemplate, 
    buildQueryString, 
    createFormDataPayload, 
    generateCurlCommand, 
    asyncWrapper 
  } = require('./lib/index.js');
  
  if (typeof urlJoin !== 'function') {
    throw new Error('urlJoin is not a function');
  }
  if (typeof replaceUrlTemplate !== 'function') {
    throw new Error('replaceUrlTemplate is not a function');
  }
  if (typeof buildQueryString !== 'function') {
    throw new Error('buildQueryString is not a function');
  }
  if (typeof createFormDataPayload !== 'function') {
    throw new Error('createFormDataPayload is not a function');
  }
  if (typeof generateCurlCommand !== 'function') {
    throw new Error('generateCurlCommand is not a function');
  }
  if (typeof asyncWrapper !== 'function') {
    throw new Error('asyncWrapper is not a function');
  }
});

test('Constants import works', () => {
  const { DEFAULT_TIMEOUT, MAX_REQUEST_SIZE, DEFAULT_RETRY_COUNT } = require('./lib/index.js');
  
  if (typeof DEFAULT_TIMEOUT !== 'number') {
    throw new Error('DEFAULT_TIMEOUT is not a number');
  }
  if (typeof MAX_REQUEST_SIZE !== 'number') {
    throw new Error('MAX_REQUEST_SIZE is not a number');
  }
  if (typeof DEFAULT_RETRY_COUNT !== 'number') {
    throw new Error('DEFAULT_RETRY_COUNT is not a number');
  }
});

console.log('\n⚙️ Testing basic functionality...');

test('createProxyController works with valid config', () => {
  const { createProxyController } = require('./lib/index.js');
  
  const proxy = createProxyController({
    baseURL: 'https://api.example.com',
    headers: () => ({ 'User-Agent': 'test' })
  });
  
  if (typeof proxy !== 'function') {
    throw new Error('createProxyController should return a function');
  }
});

test('createProxyController throws on invalid config', () => {
  const { createProxyController } = require('./lib/index.js');
  
  let threwError = false;
  try {
    createProxyController({
      baseURL: '', // Invalid empty baseURL
      headers: () => ({})
    });
  } catch (error) {
    threwError = true;
  }
  
  if (!threwError) {
    throw new Error('Should throw error for invalid baseURL');
  }
});

test('proxy middleware creation works', () => {
  const { createProxyController } = require('./lib/index.js');
  
  const proxy = createProxyController({
    baseURL: 'https://api.example.com',
    headers: () => ({ 'User-Agent': 'test' })
  });
  
  // Test explicit path
  const middleware1 = proxy('/api/users');
  if (typeof middleware1 !== 'function') {
    throw new Error('proxy("/api/users") should return a function');
  }
  
  // Test omitted path
  const middleware2 = proxy();
  if (typeof middleware2 !== 'function') {
    throw new Error('proxy() should return a function');
  }
  
  // Test with handler
  const middleware3 = proxy('/api/users', (req, res, remoteResponse) => {
    res.json(remoteResponse.data);
  });
  if (typeof middleware3 !== 'function') {
    throw new Error('proxy with handler should return a function');
  }
});

test('utility functions work correctly', () => {
  const { 
    urlJoin, 
    replaceUrlTemplate, 
    buildQueryString 
  } = require('./lib/index.js');
  
  // Test urlJoin
  const url = urlJoin('https://api.example.com', 'users', '?page=1');
  if (!url.includes('https://api.example.com')) {
    throw new Error('urlJoin did not work correctly');
  }
  
  // Test replaceUrlTemplate
  const templated = replaceUrlTemplate('/users/:id', { id: 123 });
  if (templated !== '/users/123') {
    throw new Error(`replaceUrlTemplate failed. Expected '/users/123', got '${templated}'`);
  }
  
  // Test buildQueryString
  const qs = buildQueryString({ page: '1', limit: '10' });
  if (!qs.includes('page=1') || !qs.includes('limit=10')) {
    throw new Error('buildQueryString did not work correctly');
  }
});

console.log('\n📝 Testing TypeScript definitions...');

test('TypeScript definition files are valid JSON', () => {
  const indexDts = fs.readFileSync(path.join(__dirname, 'lib', 'index.d.ts'), 'utf8');
  const proxyDts = fs.readFileSync(path.join(__dirname, 'lib', 'proxy.d.ts'), 'utf8');
  const utilsDts = fs.readFileSync(path.join(__dirname, 'lib', 'utils.d.ts'), 'utf8');
  const typesDts = fs.readFileSync(path.join(__dirname, 'lib', 'types.d.ts'), 'utf8');
  
  // Basic validation - check for TypeScript syntax
  if (!indexDts.includes('export')) {
    throw new Error('index.d.ts does not contain exports');
  }
  if (!proxyDts.includes('export')) {
    throw new Error('proxy.d.ts does not contain exports');
  }
  if (!utilsDts.includes('export')) {
    throw new Error('utils.d.ts does not contain exports');
  }
  if (!typesDts.includes('export')) {
    throw new Error('types.d.ts does not contain exports');
  }
});

console.log('\n📋 Testing documentation files...');

testFileExists('README.md exists', path.join(__dirname, 'README.md'));
testFileExists('LICENSE exists', path.join(__dirname, 'LICENSE'));
testFileExists('CHANGELOG.md exists', path.join(__dirname, 'CHANGELOG.md'));
testFileExists('FAQ.md exists', path.join(__dirname, 'FAQ.md'));

test('README.md contains package name', () => {
  const readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
  if (!readme.includes('express-simple-proxy')) {
    throw new Error('README.md does not contain package name');
  }
});

console.log('\n📊 Test Results');
console.log('================');
console.log(`✅ Passed: ${passedTests}/${testCount}`);

if (passedTests === testCount) {
  console.log('\n🎉 All local tests PASSED!');
  console.log('\n📦 Package is ready for publishing to npm');
  console.log('\nNext steps:');
  console.log('1. npm login');
  console.log('2. npm publish --access public');
  console.log('3. Run post-publish test: node test-npm-package.js');
  process.exit(0);
} else {
  console.log(`\n❌ ${testCount - passedTests} tests FAILED`);
  console.log('\n🔧 Fix the issues above before publishing');
  process.exit(1);
}