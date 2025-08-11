# Documentation for `socketManager.ts`

## Overview

The `SocketManager` is a singleton class responsible for managing all WebSocket connections for the application. It handles client authentication, connection lifecycle, room management, and message broadcasting for real-time features.

## Class: `SocketManager`

### Methods

#### `initialize(io: SocketIOServer): void`

Initializes the Socket.IO server, sets up middleware, and registers event handlers.

-   **`io`**: An instance of `socket.io.Server`.

#### `broadcastToRoom(room: string, event: string, data: any): void`

Broadcasts a message to all clients in a specific room.

-   **`room`**: The name of the room.
-   **`event`**: The name of the event.
-   **`data`**: The data to send.

#### `sendToUser(userId: string, event: string, data: any): void`

Sends a message to a specific user.

-   **`userId`**: The ID of the user.
-   **`event`**: The name of the event.
-   **`data`**: The data to send.

#### `sendToRole(role: string, event: string, data: any): void`

Sends a message to all users with a specific role.

-   **`role`**: The role of the users.
-   **`event`**: The name of the event.
-   **`data`**: The data to send.

#### `getConnectedClientsCount(): number`

Returns the total number of connected clients.

#### `getUserConnections(userId: string): string[]`

Returns an array of socket IDs for a given user.

-   **`userId`**: The ID of the user.

#### `disconnectUser(userId: string, reason?: string): void`

Disconnects all sockets for a given user.

-   **`userId`**: The ID of the user.
-   **`reason`**: An optional reason for the disconnection.

#### `getStats(): any`

Returns statistics about the current socket connections.
