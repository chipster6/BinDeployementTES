# Documentation for `routes/users.ts`

## Overview

This file defines the API routes for user management. It includes endpoints for creating, reading, updating, and deleting users, as well as administrative functions like resetting passwords and managing user roles.

## Endpoints

### `GET /api/v1/users`

Retrieves a paginated and filterable list of all users.

-   **Access**: Admin/Super Admin

### `POST /api/v1/users`

Creates a new user.

-   **Access**: Admin/Super Admin

### `GET /api/v1/users/role/:role`

Retrieves all users with a specific role.

-   **Access**: Admin/Super Admin

### `GET /api/v1/users/:id`

Retrieves a single user by their ID.

-   **Access**: Admin/Super Admin, or the user themselves

### `PUT /api/v1/users/:id`

Updates the information for a specific user.

-   **Access**: Admin/Super Admin, or the user themselves (with limited fields)

### `DELETE /api/v1/users/:id`

Soft deletes a user.

-   **Access**: Admin/Super Admin

### `POST /api/v1/users/:id/password/reset`

Resets the password for a specific user.

-   **Access**: Admin/Super Admin

### `POST /api/v1/users/:id/lock`

Locks or unlocks a user's account.

-   **Access**: Admin/Super Admin

## Validation

This file also includes validation middleware for the user management endpoints, ensuring that the request data is in the correct format.
