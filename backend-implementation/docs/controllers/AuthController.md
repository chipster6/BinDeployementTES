# Documentation for `AuthController.ts`

## Overview

The `AuthController` is responsible for handling all authentication-related requests. This includes user registration, login, logout, token refreshing, password changes, and multi-factor authentication (MFA).

## Class: `AuthController`

### Static Methods

#### `register(req: Request, res: Response, next: NextFunction): Promise<void>`

Handles user registration. It validates the request, checks if the user already exists, hashes the password, and creates a new user.

#### `login(req: Request, res: Response, next: NextFunction): Promise<void>`

Handles user login. It validates the request, finds the user, verifies the password and MFA token (if applicable), and creates a new session. It returns JWT access and refresh tokens.

#### `refreshToken(req: Request, res: Response, next: NextFunction): Promise<void>`

Refreshes the JWT access token using a valid refresh token.

#### `logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>`

Logs out the user by deleting their current session.

#### `logoutAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>`

Logs out the user from all devices by deleting all of their sessions.

#### `changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>`

Allows an authenticated user to change their password.

#### `setupMFA(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>`

Initiates the setup process for multi-factor authentication.

#### `verifyMFASetup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>`

Verifies the MFA token and enables MFA for the user.

#### `getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>`

Retrieves the profile of the currently authenticated user.

#### `getSessions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>`

Retrieves all active sessions for the currently authenticated user.

#### `revokeSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>`

Revokes a specific session for the currently authenticated user.

## Middleware

This file also exports several middleware functions for validation and rate limiting:

-   `authRateLimit`: A rate limiter for general authentication endpoints.
-   `failedLoginRateLimit`: A stricter rate limiter for failed login attempts.
-   `validateRegistration`: A middleware that validates the request body for user registration.
-   `validateLogin`: A middleware that validates the request body for user login.
-   `validatePasswordChange`: A middleware that validates the request body for password changes.
