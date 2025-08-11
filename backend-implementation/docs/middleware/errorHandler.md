# Documentation for `middleware/errorHandler.ts`

## Overview

This file provides a global error handling middleware for the Express application. It defines a set of custom error classes, handles various types of errors (Joi, Sequelize, JWT, etc.), and sends consistent, formatted error responses.

## Key Features

-   **Custom Error Classes**: Defines a base `AppError` class and several subclasses for specific error types (e.g., `AuthenticationError`, `ValidationError`).
-   **Error Handling**: Catches and handles errors from various libraries, converting them into `AppError` instances.
-   **Consistent Responses**: Sends error responses in a consistent format, including a status, error code, and message.
-   **Development vs. Production**: Provides detailed error information (including stack traces) in development and generic messages in production.
-   **404 Handler**: Includes a `notFoundHandler` for handling requests to undefined routes.
-   **Async Handler**: Provides an `asyncHandler` wrapper to simplify error handling in asynchronous route handlers.

## Middleware

### `errorHandler(err: any, req: Request, res: Response, next: NextFunction)`

The main error handling middleware. It should be registered as the last middleware in the Express application.

### `notFoundHandler(req: Request, res: Response, next: NextFunction)`

A middleware for handling 404 Not Found errors.

## Custom Error Classes

-   **`AppError`**: The base class for all application-specific errors.
-   **`AuthenticationError`**: For authentication-related errors (401).
-   **`AuthorizationError`**: For authorization-related errors (403).
-   **`ValidationError`**: For request validation errors (400).
-   **`NotFoundError`**: For resource not found errors (404).
-   **`RateLimitError`**: For rate limiting errors (429).
-   **`ExternalServiceError`**: For errors related to external services (503).
-   **`DatabaseOperationError`**: For database-related errors (500).

## Helper Functions

### `asyncHandler(fn: Function)`

A wrapper for asynchronous route handlers that catches errors and passes them to the `errorHandler`.

### `validateRequest(schema: any, property: 'body' | 'query' | 'params' = 'body')`

A middleware for validating request data using a Joi schema.
