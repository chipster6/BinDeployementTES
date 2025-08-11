# Documentation for `routes/customers.ts`

## Overview

This file defines the API routes for customer management. It includes endpoints for creating, reading, updating, and deleting customers, as well as routes for managing service configurations, billing, and analytics.

## Endpoints

### `GET /api/v1/customers`

Retrieves a paginated and filterable list of all customers.

-   **Access**: Admin, Office Staff, Dispatcher

### `POST /api/v1/customers`

Creates a new customer.

-   **Access**: Admin, Office Staff

### `GET /api/v1/customers/status/:status`

Retrieves all customers with a specific status.

-   **Access**: Admin, Office Staff, Dispatcher

### `GET /api/v1/customers/frequency/:frequency`

Retrieves all customers with a specific service frequency.

-   **Access**: Admin, Office Staff, Dispatcher

### `GET /api/v1/customers/manager/:managerId`

Retrieves all customers assigned to a specific account manager.

-   **Access**: Admin, Office Staff, Account Manager

### `GET /api/v1/customers/due-for-service`

Retrieves all customers who are due for service.

-   **Access**: Admin, Dispatcher, Driver

### `GET /api/v1/customers/:id`

Retrieves a single customer by their ID.

-   **Access**: Admin, Office Staff, Account Manager, Customer

### `PUT /api/v1/customers/:id`

Updates the information for a specific customer.

-   **Access**: Admin, Office Staff, Account Manager

### `DELETE /api/v1/customers/:id`

Soft deletes a customer.

-   **Access**: Admin

### `PUT /api/v1/customers/:id/service-config`

Updates the service configuration for a specific customer.

-   **Access**: Admin, Office Staff, Account Manager

## Validation

This file also includes validation middleware for the customer management endpoints, ensuring that the request data is in the correct format.
