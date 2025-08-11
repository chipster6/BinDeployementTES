# Documentation for `jobService.ts`

## Overview

The `JobService` is responsible for managing the application's background job queue.

## Class: `JobService`

### Methods

#### `initialize(): Promise<void>`

Asynchronously initializes the job queue if it is enabled in the application configuration.

#### `close(): Promise<void>`

Asynchronously closes the job queue if it is enabled and has been initialized.
