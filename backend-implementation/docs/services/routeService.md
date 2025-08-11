# Documentation for `routeService.ts`

## Overview

The `RouteService` is responsible for automatically discovering and registering all API routes for the application. It scans the `src/routes` directory for route files and mounts them on the Express application.

## Class: `RouteService`

### Constructor

`constructor(app: Application)`

-   **`app`**: An instance of the Express application.

### Methods

#### `initialize(): Promise<void>`

Asynchronously discovers and registers all route modules.

-   It scans the `src/routes` directory for files ending in `.routes.ts` or `.routes.js`.
-   For each route file found, it dynamically imports the module and mounts it on a path derived from the filename (e.g., `auth.routes.ts` is mounted at `/api/v1/auth`).
-   It also registers a 404 handler for any undefined API routes.
