# Documentation for `utils/healthCheck.ts`

## Overview

This file provides a comprehensive health check utility for the application. It includes functions for checking the status of the database, Redis, external services, and system resources.

## Key Features

-   **Comprehensive Checks**: Performs health checks for the database, Redis, memory usage, disk usage, and external services.
-   **Detailed Reports**: Generates a detailed health check report with the status of each component, response times, and other relevant details.
-   **Configurable**: The health checks can be enabled or disabled through the application configuration.
-   **Kubernetes-ready**: Includes `readinessCheck` and `livenessCheck` handlers for use in containerized environments.

## Functions

### `healthCheck(req: Request, res: Response)`

The main health check endpoint handler. It performs all enabled health checks and returns a detailed report.

### `readinessCheck(req: Request, res: Response)`

A simple readiness check for Kubernetes, indicating that the application is ready to accept traffic.

### `livenessCheck(req: Request, res: Response)`

A simple liveness check for Kubernetes, indicating that the application is running.

### `getMetrics(req: Request, res: Response)`

An endpoint for retrieving detailed system and process metrics.
