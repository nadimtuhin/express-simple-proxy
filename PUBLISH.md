# Publishing Guide

This guide outlines the process for publishing `express-simple-proxy` to npm and verifying the published package.

## Pre-Publish Checklist

### ✅ Code Quality
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Test coverage meets requirements (`npm run test:coverage`)

### ✅ Documentation
- [ ] README.md is up to date
- [ ] CHANGELOG.md includes version changes
- [ ] FAQ.md covers common questions
- [ ] Examples are working and documented

### ✅ Package Configuration
- [ ] `package.json` version is correct
- [ ] `package.json` files array includes only necessary files
- [ ] Built files exist in `lib/` directory
- [ ] TypeScript definitions are generated

### ✅ Local Testing
- [ ] Local package test passes (`npm run test:local-package`)

## Publishing Process

### Step 1: Verify Local Package

```bash
# Run comprehensive local tests
npm run test:local-package
```

This tests:
- Built files exist
- Package.json configuration
- Import/export functionality
- TypeScript definitions
- Documentation files

### Step 2: Login to npm

```bash
npm login
```

Enter your npm credentials:
- Username
- Password
- Email
- OTP (if 2FA enabled)

Verify login:
```bash
npm whoami
```

### Step 3: Final Pre-Publish Check

```bash
# Run all quality checks
npm run check

# Optional: Test what will be published
npm publish --dry-run
```

### Step 4: Publish

```bash
# Publish to npm (public access)
npm publish --access public
```

The `prepublishOnly` script will automatically run:
- Clean build directory
- Rebuild the package
- Run tests

### Step 5: Verify Publication

Check the package on npm:
- Visit: https://www.npmjs.com/package/express-simple-proxy
- Verify version, description, and files

## Post-Publish Testing

### Automated Testing

Run the comprehensive npm package test:

```bash
npm run test:npm-package
```

This test:
1. Creates a temporary test environment
2. Installs the package from npm
3. Tests all imports and functionality
4. Verifies TypeScript definitions
5. Tests real-world usage scenarios

### Manual Testing

Create a new project and test the package:

```bash
mkdir test-express-simple-proxy
cd test-express-simple-proxy
npm init -y
npm install express-simple-proxy express
```

Create a test file:

```javascript
// test.js
const express = require('express');
const { createProxyController } = require('express-simple-proxy');

const app = express();

const proxy = createProxyController({
  baseURL: 'https://jsonplaceholder.typicode.com',
  headers: () => ({ 'User-Agent': 'test-app' })
});

app.get('/posts', proxy('/posts'));
app.get('/users', proxy('/users'));

app.listen(3000, () => {
  console.log('Test server running on port 3000');
  console.log('Try: curl http://localhost:3000/posts');
});
```

Run and test:
```bash
node test.js
curl http://localhost:3000/posts
```

## Version Management

### Patch Release (Bug fixes)
```bash
npm run release:patch
```

### Minor Release (New features)
```bash
npm run release:minor
```

### Major Release (Breaking changes)
```bash
npm run release:major
```

These commands:
1. Increment version in package.json
2. Generate changelog
3. Create git tag
4. Push to repository

## Troubleshooting

### Common Issues

**Authentication Error**
```
npm error need auth
```
Solution: Run `npm login` and enter credentials

**Package Name Taken**
```
npm error 403 Forbidden
```
Solution: Package name already exists, choose a different name

**Build Errors**
```
npm error TypeScript compilation failed
```
Solution: Fix TypeScript errors and rebuild

**Test Failures**
```
npm error Tests failed
```
Solution: Fix failing tests before publishing

### Post-Publish Issues

**Package Not Found**
- Wait 5-10 minutes for npm registry propagation
- Check package name spelling
- Verify public access was set

**Import Errors**
- Check main and types entries in package.json
- Verify built files exist in published package
- Test with both CommonJS and ES modules

**TypeScript Errors**
- Verify .d.ts files are included
- Check TypeScript version compatibility
- Test with different module resolution settings

## Rollback Process

If a published version has critical issues:

### Option 1: Deprecate Version
```bash
npm deprecate express-simple-proxy@1.0.0 "Critical bug, use 1.0.1 instead"
```

### Option 2: Unpublish (within 24 hours)
```bash
npm unpublish express-simple-proxy@1.0.0
```

**Note**: Unpublishing is only allowed within 24 hours and not recommended for packages with dependents.

### Option 3: Publish Fixed Version
1. Fix the issues
2. Increment version
3. Publish new version
4. Deprecate old version

## CI/CD Integration

The project includes GitHub Actions workflow (`.github/workflows/ci.yml`) that:
- Runs tests on multiple Node.js versions
- Performs quality checks
- Builds the package
- Can be extended for automatic publishing

To enable automatic publishing:
1. Add `NPM_TOKEN` to GitHub secrets
2. Update workflow to publish on releases
3. Create releases through GitHub interface

## Security Considerations

### Before Publishing
- [ ] No sensitive information in code
- [ ] No hardcoded secrets or tokens
- [ ] Dependencies are up to date
- [ ] No known vulnerabilities (`npm audit`)

### After Publishing
- Monitor for security reports
- Keep dependencies updated
- Respond to vulnerability reports promptly

## Best Practices

1. **Semantic Versioning**: Follow semver for version numbers
2. **Changelog**: Keep detailed changelog for each release
3. **Testing**: Comprehensive tests before each release
4. **Documentation**: Keep docs updated with each version
5. **Backward Compatibility**: Avoid breaking changes in minor/patch releases

## Support

After publishing:
- Monitor GitHub issues
- Respond to questions in npm comments
- Update documentation based on user feedback
- Consider creating tutorials or blog posts

---

**Remember**: Once published to npm, versions cannot be changed. Always test thoroughly before publishing!