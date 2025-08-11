# Documentation for `routes/bins.ts`

## Overview

This file defines the API routes for bin management. It includes endpoints for creating, reading, updating, and deleting bins, as well as routes for managing IoT features like fill-level monitoring and GPS tracking.

## Endpoints

### `GET /api/v1/bins`

Retrieves a paginated and filterable list of all bins.

-   **Access**: Admin, Office Staff, Dispatcher, Driver

### `POST /api/v1/bins`

Creates a new bin.

-   **Access**: Admin, Office Staff

### `GET /api/v1/bins/analytics/overview`

Retrieves analytics and statistics about the bins.

-   **Access**: Admin, Office Staff, Dispatcher

### `GET /api/v1/bins/customer/:customerId`

Retrieves all bins for a specific customer.

-   **Access**: Admin, Office Staff, Customer (if they own the bins)

### `GET /api/v1/bins/:id`

Retrieves a single bin by its ID.

-   **Access**: Admin, Office Staff, Dispatcher, Driver, Customer (if they own the bin)

### `PUT /api/v1/bins/:id`

Updates the information for a specific bin.

-   **Access**: Admin, Office Staff

### `DELETE /api/v1/bins/:id`

Soft deletes a bin.

-   **Access**: Admin

### `PUT /api/v1/bins/:id/fill-level`

Updates the fill level of a bin. This endpoint is typically called by IoT sensors.

-   **Access**: Admin, Office Staff, System

## Validation

This file also includes validation middleware for the bin management endpoints, ensuring that the request data is in the correct format.
