# Documentation for `models/Route.ts`

## Overview

The `Route` model represents a waste collection route. It includes information about the route's schedule, assigned driver and vehicle, and geographic data. It also has fields for AI-powered route optimization.

## Class: `Route`

### Properties

-   **`id`**: The unique identifier for the route.
-   **`routeNumber`**: A unique, human-readable identifier for the route.
-   **`routeName`**: The name of the route.
-   **`description`**: A description of the route.
-   **`territory`**: The geographic territory the route covers.
-   **`estimatedDurationMinutes`**: The estimated duration of the route in minutes.
-   **`estimatedDistanceMiles`**: The estimated distance of the route in miles.
-   **`serviceDay`**: The day of the week the route is serviced.
-   **`routeType`**: The type of route (e.g., `residential`, `commercial`).
-   **`status`**: The current status of the route (e.g., `active`, `inactive`).
-   **`driverId`**: The ID of the driver assigned to the route.
-   **`vehicleId`**: The ID of the vehicle assigned to the route.
-   **`routeGeometry`**: A PostGIS `LINESTRING` representing the route's path.
-   **`aiOptimized`**: A boolean indicating if the route has been optimized by the AI service.
-   **`optimizationScore`**: A score from 0-100 indicating the efficiency of the optimized route.
-   **`lastOptimizedAt`**: The timestamp of the last AI optimization.

### Methods

#### `isActive(): boolean`

Returns `true` if the route's status is active.

#### `isFullyAssigned(): boolean`

Returns `true` if the route has both a driver and a vehicle assigned.

#### `needsOptimization(daysSinceLastOptimization: number = 30): boolean`

Returns `true` if the route has not been optimized within the specified number of days.

### Static Methods

#### `findByRouteNumber(routeNumber: string): Promise<Route | null>`

Finds a route by its route number.

#### `findActive(): Promise<Route[]>`

Finds all active routes.

#### `findByServiceDay(serviceDay: ServiceDay): Promise<Route[]>`

Finds all active routes for a specific day of the week.

#### `findByDriver(driverId: string): Promise<Route[]>`

Finds all active routes assigned to a specific driver.

#### `findUnassigned(): Promise<Route[]>`

Finds all active routes that do not have a driver or vehicle assigned.

#### `findNeedingOptimization(daysSinceLastOptimization: number = 30): Promise<Route[]>`

Finds all active routes that need to be optimized.

#### `generateRouteNumber(territory?: string): Promise<string>`

Generates a new, unique route number.
