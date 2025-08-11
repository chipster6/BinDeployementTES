# Documentation for `config/database.ts`

## Overview

This file configures the connection to the PostgreSQL database using the Sequelize ORM. It sets up the connection pool, logging, and other performance and reliability features.

## Key Features

-   **Sequelize Instance**: Creates and configures a new `Sequelize` instance with options loaded from the central `config` object.
-   **Connection Pooling**: Configures the connection pool for efficient database access.
-   **SSL Support**: Enables SSL for secure database connections.
-   **Logging**: Configures SQL query logging.
-   **Retry Logic**: Implements a retry mechanism for database connections.
-   **Health Check**: Provides a `checkDatabaseHealth` function to verify the database connection.
-   **Helper Functions**: Includes utility functions for transactions, raw queries, and bulk operations.

## Main Export: `sequelize`

The main export of this file is the configured `sequelize` instance, which can be imported and used throughout the application to interact with the database.

## Functions

### `checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, any> }>`

Checks the health of the database connection by authenticating and running a simple query.

### `initializeDatabase(): Promise<void>`

Initializes the database connection with retry logic.

### `syncDatabase(force: boolean = false): Promise<void>`

Synchronizes the database models. This is intended for development environments only.

### `closeDatabaseConnection(): Promise<void>`

Closes the database connection gracefully.

### `withTransaction<T>(callback: (transaction: any) => Promise<T>): Promise<T>`

A helper function for executing a block of code within a database transaction.

### `rawQuery(sql: string, replacements?: Record<string, any>): Promise<any[]>`

A helper function for executing raw SQL queries.

### `bulkCreate(model: any, data: any[], options: any = {}): Promise<any[]>`

A helper function for performing bulk create operations.
