# Documentation for `middleware/rateLimit.ts`

## Overview

This file provides rate-limiting middleware for the application. It uses the `express-rate-limit` library with a Redis-backed store to prevent abuse and ensure fair usage.

## Key Features

-   **Redis-backed**: Uses Redis to store rate-limiting data, allowing it to work across multiple server instances.
-   **Configuration-driven**: Loads its configuration from `config/rateLimit.config.ts`.
-   **IP and User-based**: Uses the user's ID for rate limiting if they are authenticated, otherwise falls back to their IP address.
-   **Security Logging**: Logs rate-limiting events for security monitoring.

## Middleware

### `generalRateLimiter`

A rate limiter for general API endpoints.

### `authRateLimiter`

A stricter rate limiter for authentication-related endpoints.
