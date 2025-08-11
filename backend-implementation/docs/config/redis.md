# Documentation for `config/redis.ts`

## Overview

This file configures the connection to the Redis server. It sets up multiple Redis clients for different purposes (main, session, queue) and provides a `CacheService` and `SessionService` for interacting with Redis.

## Key Features

-   **Multiple Clients**: Creates separate Redis clients for the main application, user sessions, and the background job queue, allowing them to use different Redis databases.
-   **Connection Management**: Handles Redis connection events and provides a health check function.
-   **`CacheService`**: A static class that provides a convenient interface for common caching operations (get, set, delete, etc.).
-   **`SessionService`**: A static class for managing user session data in Redis.
-   **`RateLimitService`**: A static class for performing rate limiting checks.

## Main Exports

-   **`redisClient`**: The main `ioredis` client instance.
-   **`sessionRedisClient`**: The `ioredis` client instance for user sessions.
-   **`queueRedisClient`**: The `ioredis` client instance for the background job queue.
-   **`CacheService`**: A class with static methods for caching.
-   **`SessionService`**: A class with static methods for session management.
-   **`RateLimitService`**: A class with static methods for rate limiting.

## Functions

### `checkRedisHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, any> }>`

Checks the health of the Redis connection by pinging the server and performing a test set/get operation.

### `initializeRedis(): Promise<void>`

Initializes all Redis connections.

### `closeRedisConnections(): Promise<void>`

Closes all Redis connections gracefully.
