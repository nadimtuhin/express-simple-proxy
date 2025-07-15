#!/usr/bin/env node

/**
 * NPM Package Installation Test
 * 
 * This script tests the published npm package to ensure:
 * 1. Package installs correctly
 * 2. All exports are available
 * 3. Basic functionality works
 * 4. TypeScript definitions are present
 * 5. Examples can be imported and run
 * 
 * Run this script after publishing to npm to verify the package works correctly.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

console.log('🧪 NPM Package Installation Test');
console.log('================================\n');

// Test configuration
const PACKAGE_NAME = 'express-simple-proxy';
const TEST_DIR = path.join(os.tmpdir(), `test-${PACKAGE_NAME}-${Date.now()}`);
const TIMEOUT = 60000; // 60 seconds

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(name, passed, error = null) {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: name, error: error.toString() });
      console.log(`   Error: ${error.message || error}`);
    }
  }
}

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      cwd: options.cwd || TEST_DIR,
      encoding: 'utf8',
      timeout: options.timeout || TIMEOUT,
      stdio: options.stdio || 'pipe'
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error, output: error.stdout || error.message };
  }
}

async function createTestEnvironment() {
  console.log('📁 Setting up test environment...');
  
  try {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    
    // Initialize npm project
    const packageJson = {
      name: 'test-express-simple-proxy',
      version: '1.0.0',
      private: true,
      description: 'Test project for express-simple-proxy',
      main: 'index.js',
      scripts: {
        test: 'node test.js'
      },
      dependencies: {},
      devDependencies: {
        '@types/node': '^20.0.0',
        '@types/express': '^4.17.0',
        'express': '^4.18.0',
        'typescript': '^5.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(TEST_DIR, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    logTest('Test environment created', true);
    return true;
  } catch (error) {
    logTest('Test environment creation', false, error);
    return false;
  }
}

async function installDependencies() {
  console.log('\n📦 Installing dependencies...');
  
  // Install dev dependencies first
  const devInstall = runCommand('npm install', { timeout: 120000 });
  logTest('Install dev dependencies', devInstall.success, devInstall.error);
  
  if (!devInstall.success) return false;
  
  // Install the package from npm
  const packageInstall = runCommand(`npm install ${PACKAGE_NAME}`, { timeout: 120000 });
  logTest(`Install ${PACKAGE_NAME} from npm`, packageInstall.success, packageInstall.error);
  
  return packageInstall.success;
}

async function testBasicImports() {
  console.log('\n📥 Testing basic imports...');
  
  // Test CommonJS import
  const cjsTest = `
const { createProxyController } = require('${PACKAGE_NAME}');
console.log('CommonJS import successful');
console.log('createProxyController type:', typeof createProxyController);
`;
  
  fs.writeFileSync(path.join(TEST_DIR, 'test-cjs.js'), cjsTest);
  const cjsResult = runCommand('node test-cjs.js');
  logTest('CommonJS import', cjsResult.success, cjsResult.error);
  
  // Test ES Module import
  const esmTest = `
import { createProxyController } from '${PACKAGE_NAME}';
console.log('ES Module import successful');
console.log('createProxyController type:', typeof createProxyController);
`;
  
  fs.writeFileSync(path.join(TEST_DIR, 'test-esm.mjs'), esmTest);
  const esmResult = runCommand('node test-esm.mjs');
  logTest('ES Module import', esmResult.success, esmResult.error);
  
  return cjsResult.success && esmResult.success;
}

async function testTypeScriptDefinitions() {
  console.log('\n📝 Testing TypeScript definitions...');
  
  const tsTest = `
import { 
  createProxyController,
  ProxyConfig,
  ProxyError,
  RequestWithLocals,
  ResponseHandler 
} from '${PACKAGE_NAME}';

const config: ProxyConfig = {
  baseURL: 'https://api.example.com',
  headers: (req: RequestWithLocals) => ({
    'Authorization': req.headers.authorization || ''
  })
};

const proxy = createProxyController(config);
console.log('TypeScript definitions working correctly');
console.log('Proxy controller created:', typeof proxy);
`;
  
  fs.writeFileSync(path.join(TEST_DIR, 'test-types.ts'), tsTest);
  
  // Compile TypeScript
  const compileResult = runCommand('npx tsc test-types.ts --moduleResolution node --esModuleInterop');
  logTest('TypeScript compilation', compileResult.success, compileResult.error);
  
  if (!compileResult.success) return false;
  
  // Run compiled JavaScript
  const runResult = runCommand('node test-types.js');
  logTest('TypeScript definitions runtime', runResult.success, runResult.error);
  
  return runResult.success;
}

async function testBasicFunctionality() {
  console.log('\n⚙️ Testing basic functionality...');
  
  const functionalTest = `
const express = require('express');
const { createProxyController } = require('${PACKAGE_NAME}');

// Test proxy controller creation
try {
  const proxy = createProxyController({
    baseURL: 'https://jsonplaceholder.typicode.com',
    headers: () => ({ 'User-Agent': 'test-agent' })
  });
  
  console.log('✅ Proxy controller created successfully');
  
  // Test proxy middleware creation
  const middleware = proxy('/posts');
  console.log('✅ Proxy middleware created:', typeof middleware);
  
  // Test omitted path middleware
  const omittedMiddleware = proxy();
  console.log('✅ Omitted path middleware created:', typeof omittedMiddleware);
  
  // Test Express app integration
  const app = express();
  app.get('/test', middleware);
  console.log('✅ Express integration successful');
  
  console.log('All functionality tests passed!');
} catch (error) {
  console.error('❌ Functionality test failed:', error.message);
  process.exit(1);
}
`;
  
  fs.writeFileSync(path.join(TEST_DIR, 'test-functionality.js'), functionalTest);
  const result = runCommand('node test-functionality.js');
  logTest('Basic functionality', result.success, result.error);
  
  return result.success;
}

async function testUtilityFunctions() {
  console.log('\n🛠️ Testing utility functions...');
  
  const utilTest = `
const { 
  urlJoin,
  replaceUrlTemplate,
  buildQueryString,
  createFormDataPayload,
  generateCurlCommand,
  asyncWrapper
} = require('${PACKAGE_NAME}');

try {
  // Test urlJoin
  const url = urlJoin('https://api.example.com', 'users', '?page=1');
  console.log('✅ urlJoin:', url);
  
  // Test replaceUrlTemplate
  const templated = replaceUrlTemplate('/users/:id', { id: 123 });
  console.log('✅ replaceUrlTemplate:', templated);
  
  // Test buildQueryString
  const qs = buildQueryString({ page: '1', limit: '10' });
  console.log('✅ buildQueryString:', qs);
  
  // Test asyncWrapper
  const wrapped = asyncWrapper(async (req, res, next) => {
    console.log('Async function wrapped');
  });
  console.log('✅ asyncWrapper:', typeof wrapped);
  
  console.log('All utility functions working correctly!');
} catch (error) {
  console.error('❌ Utility test failed:', error.message);
  process.exit(1);
}
`;
  
  fs.writeFileSync(path.join(TEST_DIR, 'test-utils.js'), utilTest);
  const result = runCommand('node test-utils.js');
  logTest('Utility functions', result.success, result.error);
  
  return result.success;
}

async function testErrorHandling() {
  console.log('\n⚠️ Testing error handling...');
  
  const errorTest = `
const { createProxyController } = require('${PACKAGE_NAME}');

try {
  // Test invalid configuration
  try {
    createProxyController({
      baseURL: '', // Invalid empty baseURL
      headers: () => ({})
    });
    console.error('❌ Should have thrown error for invalid baseURL');
    process.exit(1);
  } catch (error) {
    console.log('✅ Correctly threw error for invalid baseURL:', error.message);
  }
  
  // Test invalid headers function
  try {
    createProxyController({
      baseURL: 'https://api.example.com',
      headers: 'not a function' // Invalid headers
    });
    console.error('❌ Should have thrown error for invalid headers');
    process.exit(1);
  } catch (error) {
    console.log('✅ Correctly threw error for invalid headers:', error.message);
  }
  
  console.log('Error handling tests passed!');
} catch (error) {
  console.error('❌ Error handling test failed:', error.message);
  process.exit(1);
}
`;
  
  fs.writeFileSync(path.join(TEST_DIR, 'test-errors.js'), errorTest);
  const result = runCommand('node test-errors.js');
  logTest('Error handling', result.success, result.error);
  
  return result.success;
}

async function testFileStructure() {
  console.log('\n📂 Testing package file structure...');
  
  const packagePath = path.join(TEST_DIR, 'node_modules', PACKAGE_NAME);
  
  try {
    // Check main files exist
    const mainFile = path.join(packagePath, 'lib', 'index.js');
    const typesFile = path.join(packagePath, 'lib', 'index.d.ts');
    const readmeFile = path.join(packagePath, 'README.md');
    const licenseFile = path.join(packagePath, 'LICENSE');
    
    logTest('Main JS file exists', fs.existsSync(mainFile));
    logTest('TypeScript definitions exist', fs.existsSync(typesFile));
    logTest('README.md exists', fs.existsSync(readmeFile));
    logTest('LICENSE file exists', fs.existsSync(licenseFile));
    
    // Check package.json
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      logTest('Package.json valid', packageJson.name === PACKAGE_NAME);
      logTest('Main entry point correct', packageJson.main === 'lib/index.js');
      logTest('Types entry point correct', packageJson.types === 'lib/index.d.ts');
    } else {
      logTest('Package.json exists', false);
    }
    
    return true;
  } catch (error) {
    logTest('File structure check', false, error);
    return false;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test environment...');
  
  try {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    logTest('Cleanup completed', true);
  } catch (error) {
    logTest('Cleanup', false, error);
  }
}

async function runAllTests() {
  console.log(`Starting tests in: ${TEST_DIR}\n`);
  
  const startTime = Date.now();
  
  try {
    // Run all tests in sequence
    const envCreated = await createTestEnvironment();
    if (!envCreated) throw new Error('Failed to create test environment');
    
    const depsInstalled = await installDependencies();
    if (!depsInstalled) throw new Error('Failed to install dependencies');
    
    await testFileStructure();
    await testBasicImports();
    await testTypeScriptDefinitions();
    await testBasicFunctionality();
    await testUtilityFunctions();
    await testErrorHandling();
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    testResults.failed++;
    testResults.errors.push({ test: 'Test Suite', error: error.toString() });
  } finally {
    await cleanup();
  }
  
  // Print final results
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️ Duration: ${duration}s`);
  
  if (testResults.failed > 0) {
    console.log('\n🐛 Errors:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
    
    console.log('\n❌ NPM package test FAILED');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests PASSED! Package is ready for use.');
    console.log('\n📦 Installation command for users:');
    console.log(`   npm install ${PACKAGE_NAME}`);
    console.log('\n🚀 Basic usage:');
    console.log(`   const { createProxyController } = require('${PACKAGE_NAME}');`);
    process.exit(0);
  }
}

// Run the test suite
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };