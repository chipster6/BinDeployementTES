# Documentation for `routes/index.ts`

## Overview

This file serves as the main router for the entire API. It imports all the individual route modules (e.g., `auth.ts`, `users.ts`) and combines them into a single Express router.

## Key Features

-   **Centralized Routing**: Provides a single point of entry for all API routes.
-   **Modular**: Imports and mounts individual route modules, keeping the routing logic organized.
-   **Versioning**: All routes are mounted under the `/api/v1` path.
-   **404 Handling**: Includes a catch-all 404 handler for any undefined API routes.

## Usage

This main router is imported by the `RouteService` and mounted on the Express application.
