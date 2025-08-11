# Documentation for `utils/logger.ts`

## Overview

This file provides a centralized logging utility for the application using the `winston` library. It sets up structured logging with multiple transports (console, file) and different log formats for development and production environments.

## Key Features

-   **Structured Logging**: Logs messages in a structured JSON format in production, making them easy to parse and analyze.
-   **Multiple Transports**: Logs to the console and to daily rotating log files.
-   **Log Levels**: Supports standard log levels (`error`, `warn`, `info`, `http`, `debug`).
-   **Specialized Loggers**: Provides separate loggers for different concerns:
    -   `auditLogger`: For compliance and audit trails.
    -   `securityLogger`: For security-related events.
    -   `performanceLogger`: For monitoring slow operations.
    -   `httpLogger`: For logging HTTP requests.
-   **Helper Functions**: Includes helper functions for logging events, errors, and performance metrics.
-   **`Timer` Class**: A utility class for measuring the duration of operations.

## Main Export: `logger`

The main export of this file is the configured `winston` logger instance, which can be imported and used throughout the application.

## Functions

### `logEvent(level: string, event: string, data: Record<string, any> = {}, userId?: string, ip?: string)`

Logs a structured event with additional context.

### `logSecurityEvent(event: string, data: Record<string, any> = {}, userId?: string, ip?: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium')`

Logs a security-related event.

### `logAuditEvent(action: string, resource: string, data: Record<string, any> = {}, userId?: string, ip?: string)`

Logs an audit event for compliance purposes.

### `logPerformance(operation: string, duration: number, data: Record<string, any> = {})`

Logs a performance metric.

### `logError(error: Error | string, context: Record<string, any> = {}, userId?: string, ip?: string)`

Logs an error with a stack trace.
