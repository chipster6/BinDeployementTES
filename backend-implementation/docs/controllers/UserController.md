# Documentation for `UserController.ts`

## Overview

The `UserController` is responsible for managing all user-related operations, excluding authentication. This includes creating, reading, updating, and deleting users, as well as administrative functions like resetting passwords and locking accounts.

## Class: `UserController`

### Static Methods

#### `getUsers(req: Request, res: Response): Promise<void>`

Retrieves a paginated and filterable list of all users.

-   **Access**: Admin

#### `getUserById(req: Request, res: Response): Promise<void>`

Retrieves a single user by their ID.

-   **Access**: Admin, or the user themselves

#### `createUser(req: Request, res: Response): Promise<void>`

Creates a new user.

-   **Access**: Admin

#### `updateUser(req: Request, res: Response): Promise<void>`

Updates the information for a specific user.

-   **Access**: Admin, or the user themselves (with limited fields)

#### `deleteUser(req: Request, res: Response): Promise<void>`

Soft deletes a user.

-   **Access**: Admin only

#### `getUsersByRole(req: Request, res: Response): Promise<void>`

Retrieves all users with a specific role.

-   **Access**: Admin

#### `resetUserPassword(req: Request, res: Response): Promise<void>`

Resets the password for a specific user.

-   **Access**: Admin

#### `toggleUserLock(req: Request, res: Response): Promise<void>`

Locks or unlocks a user's account.

-   **Access**: Admin
