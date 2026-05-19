# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-05-20

### Added
- `beforeRequest` hook — mutate the proxy payload (URL, headers, data, timeout) or return a `ShortCircuitResponse` to skip the upstream call entirely
- `onResponse` stats callback — fires exactly once per request on every terminal path (upstream success, short-circuit, error) with `ProxyStats` containing URL, method, status, duration, optional response size, and source
- Granular `error.code` values: `UPSTREAM_TIMEOUT`, `UPSTREAM_UNREACHABLE`, `UPSTREAM_AUTH`, `NETWORK_ERROR`, `REQUEST_ERROR`, `UNKNOWN_ERROR`
- New exported types: `ProxyErrorCode`, `ShortCircuitResponse`, `ProxyStats`, `BeforeRequestHook`, `OnResponseCallback`
- Trivy vulnerability scanning in CI pipeline
- Dependabot configuration for automated dependency updates
- Cookbook recipes for `beforeRequest`, `onResponse`, and granular error codes

### Changed
- `error.code` on timeout errors is now `UPSTREAM_TIMEOUT` (previously `NETWORK_ERROR`)
- `error.code` on connection-refused / DNS-failure errors is now `UPSTREAM_UNREACHABLE`
- `error.code` on 401/403 upstream responses is now `UPSTREAM_AUTH`
- HTTP status codes are unchanged — network errors still return **503**


- TypeScript support with comprehensive type definitions
- Advanced error handling with custom error handlers and hooks
- File upload support for multipart/form-data
- URL template support with dynamic parameter replacement
- Query parameter handling and encoding
- Activity logging integration
- Request/response transformation capabilities
- Comprehensive unit and integration tests
- ESLint and Prettier configuration
- Husky pre-commit hooks
- Extensive documentation and examples

### Features
- **Simple Setup**: Easy-to-use API with minimal configuration
- **Error Handling**: Three types of error categorization (Response, Network, Setup)
- **File Uploads**: Support for single and multiple file uploads
- **Custom Headers**: Dynamic header configuration based on request
- **Response Transformation**: Custom response handlers for data transformation
- **Activity Logging**: Automatic entity ID extraction for audit logs
- **Utility Functions**: Exported utility functions for advanced usage
- **TypeScript Ready**: Full TypeScript support with type definitions

### Technical Details
- Built with TypeScript 5.2+
- Uses Axios for HTTP requests
- Supports Express 4.18+
- Comprehensive test coverage with Jest
- Follows conventional commits for changelog generation

## [1.0.0] - 2024-01-15

### Added
- Initial release