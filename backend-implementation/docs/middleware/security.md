# Documentation for `middleware/security.ts`

## Overview

This file provides a comprehensive set of security middleware for the application. It includes functions for request sanitization, threat detection, and protection against common web vulnerabilities.

## Key Features

-   **Threat Detection**: Scans incoming requests for patterns of common attacks like SQL injection, XSS, path traversal, and command injection.
-   **Request Sanitization**: Sanitizes request bodies and query parameters to remove malicious content.
-   **Security Headers**: Sets various security-related HTTP headers to protect against attacks like clickjacking and cross-site scripting.
-   **IP and User Agent Validation**: Checks for suspicious IP addresses and user agents.
-   **Rate Limiting**: Includes a basic IP-based rate limiter.
-   **HTTPS Redirect**: Enforces HTTPS connections in production.
-   **API Key Validation**: Provides middleware for validating API keys.
-   **Request Timeout**: Implements a request timeout to prevent slow loris attacks.

## Middleware

### `securityMiddleware(req: ExtendedRequest, res: Response, next: NextFunction)`

The main security middleware. It should be registered early in the middleware chain to protect all subsequent routes. It performs a series of security checks and sanitization steps on each request.

### `cspMiddleware(req: Request, res: Response, next: NextFunction)`

A middleware for setting the `Content-Security-Policy` header.

### `httpsRedirect(req: Request, res: Response, next: NextFunction)`

A middleware that redirects HTTP requests to HTTPS in a production environment.

### `validateApiKey(req: Request, res: Response, next: NextFunction)`

A middleware for validating the format of an API key provided in the `X-API-Key` header.

### `requestTimeout(timeoutMs: number = 30000)`

A higher-order function that returns a middleware for timing out requests that take too long to process.
