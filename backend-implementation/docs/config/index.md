# Documentation for `config/index.ts`

## Overview

This file is the central configuration hub for the entire backend application. It uses the `joi` library to validate environment variables and exports a type-safe `config` object that can be used throughout the application.

## Key Features

-   **Environment Variable Validation**: Ensures that all required environment variables are present and have the correct types.
-   **Default Values**: Provides sensible default values for non-critical configuration options.
-   **Type Safety**: Exports a `Config` type that allows for type-safe access to configuration values in a TypeScript environment.
-   **Centralized Configuration**: Consolidates all application configuration into a single, easy-to-manage object.

## Structure

1.  **`envSchema`**: A `joi` schema that defines the expected environment variables, their types, and default values.
2.  **Validation**: The script validates `process.env` against the `envSchema`. If validation fails, the application will throw an error and exit.
3.  **`config` object**: A nested object that organizes the validated environment variables into logical groups (e.g., `database`, `redis`, `jwt`, `security`).
4.  **Conditional Validation**: The script includes additional checks to ensure that required configurations for external services are present if those features are enabled.
5.  **`Config` type**: A TypeScript type alias for the `config` object, providing type safety.

## Usage

To use the configuration in other parts of the application, import the `config` object:

```typescript
import { config } from '@/config';

const port = config.server.port;
const dbHost = config.database.host;
```
