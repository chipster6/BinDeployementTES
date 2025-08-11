# Documentation for `databaseService.ts`

## Overview

The `DatabaseService` is responsible for managing connections to the application's databases, including PostgreSQL and Redis.

## Class: `DatabaseService`

### Methods

#### `connect(): Promise<void>`

Asynchronously connects to the PostgreSQL and Redis databases. It authenticates the database connection and pings the Redis server to ensure connectivity.

#### `disconnect(): Promise<void>`

Asynchronously disconnects from the PostgreSQL and Redis databases.
