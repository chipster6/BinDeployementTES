# Documentation for `middleware/requestLogger.ts`

## Overview

This file provides a custom request logging middleware for the application. It logs detailed information about incoming requests and outgoing responses, including performance metrics.

## Key Features

-   **Unique Request ID**: Assigns a unique ID to each incoming request for easier tracing.
-   **Detailed Logging**: Logs request and response information, including method, URL, status code, duration, and user agent.
-   **Performance Monitoring**: Tracks the duration of each request and logs slow requests.
--  **Sensitive Data Redaction**: Sanitizes sensitive data (e.g., passwords, tokens) from the request body and headers before logging.
-   **Conditional Logging**: Skips logging for certain routes (e.g., health checks) to reduce noise.

## Middleware

### `requestLogger(req: ExtendedRequest, res: Response, next: NextFunction)`

The main request logging middleware. It should be registered early in the middleware chain to capture all requests.

### `requestContext(req: ExtendedRequest, res: Response, next: NextFunction)`

A middleware that adds a `context` object to each request, containing common request metadata.

### `responseTimeHeader(req: Request, res: Response, next: NextFunction)`

A middleware that adds an `X-Response-Time` header to each response, indicating the request duration.

## Helper Functions

### `setupMorganTokens(morgan: any)`

A function to set up custom tokens for the `morgan` logging library.
