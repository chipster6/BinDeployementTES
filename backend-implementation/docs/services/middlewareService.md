# Documentation for `middlewareService.ts`

## Overview

The `MiddlewareService` is responsible for configuring and initializing all Express middleware for the application. This includes security middleware, request parsing, logging, and rate limiting.

## Class: `MiddlewareService`

### Constructor

`constructor(app: Application)`

-   **`app`**: An instance of the Express application.

### Methods

#### `initialize(): void`

Initializes and registers all middleware with the Express application. This includes:

-   **Trust Proxy**: Sets `trust proxy` for accurate IP addresses behind load balancers.
-   **Helmet**: Applies security-related HTTP headers.
-   **CORS**: Configures Cross-Origin Resource Sharing.
-   **Compression**: Compresses response bodies.
-   **Body Parsing**: Parses incoming request bodies (`json` and `urlencoded`).
-   **Cookie Parsing**: Parses `Cookie` header and populates `req.cookies`.
-   **Request Logging**: Logs incoming requests using `morgan`.
-   **Rate Limiting**: Applies rate limiting to API endpoints.
-   **Custom Security**: Applies custom security middleware.
-   **Health Check**: Registers health check endpoints.
