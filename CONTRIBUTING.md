# Contributing to Express Simple Proxy

Thank you for considering contributing to Express Simple Proxy! This guide will help you get started with contributing to the project.

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [nadimtuhin@gmail.com](mailto:nadimtuhin@gmail.com).

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots if applicable**
- **Include your environment details** (OS, Node.js version, package version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes** following the coding guidelines
4. **Add tests** for your changes
5. **Ensure all tests pass**: `npm test`
6. **Ensure linting passes**: `npm run lint`
7. **Ensure TypeScript compilation passes**: `npm run build`
8. **Update documentation** as needed
9. **Create a pull request**

## Development Setup

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher

### Setting up the development environment

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/yourusername/express-simple-proxy.git
   cd express-simple-proxy
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests to ensure everything works:
   ```bash
   npm test
   ```

4. Start development:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run build` - Build the TypeScript code
- `npm run dev` - Run TypeScript compiler in watch mode
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint and fix issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Coding Guidelines

### TypeScript

- Use TypeScript for all source code
- Provide proper type annotations
- Avoid using `any` type when possible
- Use interfaces for object shapes
- Export types that might be useful to consumers

### Code Style

- Follow the existing code style
- Use Prettier for code formatting
- Follow ESLint rules
- Write clear, descriptive variable and function names
- Add JSDoc comments for public APIs

### Testing

- Write tests for all new functionality
- Maintain or improve test coverage
- Use Jest for testing
- Write both unit and integration tests
- Mock external dependencies appropriately

### Commits

- Follow conventional commit format
- Write clear, descriptive commit messages
- Keep commits focused and atomic
- Reference issues in commit messages when applicable

Example commit message:
```
feat: add support for custom response headers

- Add responseHeaders configuration option
- Update types to include new option
- Add tests for response header functionality

Closes #123
```

## Project Structure

```
express-simple-proxy/
├── src/                 # Source code
│   ├── index.ts        # Main exports
│   ├── types.ts        # Type definitions
│   ├── proxy.ts        # Core proxy functionality
│   └── utils.ts        # Utility functions
├── test/               # Test files
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── examples/           # Usage examples
├── lib/                # Compiled JavaScript (generated)
└── docs/               # Documentation
```

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a pull request with changes
4. After merge, create a GitHub release
5. Package is automatically published to npm

## Questions?

If you have questions about contributing, please:

1. Check the existing issues and discussions
2. Create a new issue with the "question" label
3. Reach out via email: [nadimtuhin@gmail.com](mailto:nadimtuhin@gmail.com)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.