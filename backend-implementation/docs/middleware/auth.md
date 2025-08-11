# Documentation for `middleware/auth.ts`

## Overview

This file provides authentication and authorization middleware for the application. It uses JSON Web Tokens (JWT) for authentication and supports role-based and permission-based access control.

## Key Features

-   **JWT Authentication**: Verifies JWTs from the `Authorization` header or cookies.
-   **Role-Based Authorization**: Restricts access to endpoints based on user roles.
-   **Permission-Based Authorization**: Restricts access based on fine-grained permissions.
-   **Ownership Validation**: Ensures that users can only access their own resources.
-   **Optional Authentication**: Allows for endpoints that can be accessed by both authenticated and anonymous users.

## Middleware

### `authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void>`

The main authentication middleware. It extracts and verifies the JWT, finds the user in the database, and attaches the user object to the request.

### `optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void>`

An optional authentication middleware that does not fail if no token is provided. If a valid token is present, it attaches the user object to the request.

### `requireRole(...allowedRoles: UserRole[])`

A higher-order function that returns a middleware for role-based authorization.

-   **`...allowedRoles`**: A list of `UserRole` enums that are allowed to access the endpoint.

### `requireOwnership(resourceIdParam: string = 'id')`

A higher-order function that returns a middleware for ownership-based authorization.

-   **`resourceIdParam`**: The name of the request parameter that contains the resource ID.

### `requirePermission(resource: string, action: string)`

A higher-order function that returns a middleware for permission-based authorization.

-   **`resource`**: The name of the resource (e.g., 'users', 'customers').
-   **`action`**: The action being performed (e.g., 'read', 'create').

### Shorthand Middleware

-   **`adminOnly`**: Requires the user to have the `SUPER_ADMIN` or `ADMIN` role.
-   **`staffOnly`**: Requires the user to have the `SUPER_ADMIN`, `ADMIN`, `DISPATCHER`, or `OFFICE_STAFF` role.
-   **`driverOnly`**: Requires the user to have the `DRIVER` role.
-   **`customerOnly`**: Requires the user to have the `CUSTOMER` or `CUSTOMER_STAFF` role.
