# Documentation for `lifecycleService.ts`

## Overview

The `LifecycleService` is responsible for managing the startup and graceful shutdown of the Waste Management API server. It orchestrates the initialization of the server, and ensures that all connections are closed properly when the application terminates.

## Class: `LifecycleService`

### Constructor

`constructor(server: Server, io: SocketIOServer, databaseService: DatabaseService, jobService: JobService)`

-   **`server`**: An instance of Node.js's `http.Server`.
-   **`io`**: An instance of `socket.io.Server`.
-   **`databaseService`**: An instance of the `DatabaseService`.
-   **`jobService`**: An instance of the `JobService`.

### Methods

#### `start(port: number): Promise<void>`

Starts the application server.

-   **`port`**: The port number to listen on.

#### `startServer(port: number): void`

Starts the HTTP server and listens on the specified port.

-   **`port`**: The port number to listen on.

#### `setupShutdownHandlers(): void`

Sets up listeners for process signals (`SIGTERM`, `SIGINT`) and uncaught exceptions/rejections to trigger a graceful shutdown.

#### `shutdown(): Promise<void>`

Performs a graceful shutdown of the application, closing the Socket.IO server, HTTP server, database connections, and job queue.
