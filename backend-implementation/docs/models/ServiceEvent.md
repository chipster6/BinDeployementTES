# Documentation for `models/ServiceEvent.ts`

## Overview

The `ServiceEvent` model represents a specific service performed for a customer, such as a pickup, delivery, or maintenance. It tracks the event's status, schedule, and outcome, including details like photos, signatures, and weight of collected materials.

## Class: `ServiceEvent`

### Properties

-   **`id`**: The unique identifier for the service event.
-   **`customerId`**: The ID of the customer for whom the service is being performed.
-   **`routeId`**: The ID of the route this service event belongs to.
-   **`driverId`**: The ID of the driver assigned to this service event.
-   **`vehicleId`**: The ID of the vehicle used for this service event.
-   **`eventType`**: The type of service event (e.g., `pickup`, `delivery`).
-   **`eventStatus`**: The current status of the service event (e.g., `scheduled`, `completed`).
-   **`scheduledDate`**: The date the service event is scheduled for.
-   **`scheduledTime`**: The time the service event is scheduled for.
-   **`actualStartTime`**: The actual start time of the service event.
-   **`actualEndTime`**: The actual end time of the service event.
-   **`serviceLocation`**: A PostGIS `POINT` representing the location of the service.
-   **`photoUrls`**: An array of URLs to photos taken during the service event.
-   **`signatureUrl`**: A URL to a signature captured during the service event.
-   **`weightCollectedLbs`**: The weight of materials collected during the service event, in pounds.
-   **`volumeCollectedCubicYards`**: The volume of materials collected, in cubic yards.

### Methods

#### `isCompleted(): boolean`

Returns `true` if the service event is completed.

#### `isOverdue(): boolean`

Returns `true` if the service event is past its scheduled time and not yet completed.

#### `getActualDurationMinutes(): number | null`

Returns the duration of the service event in minutes.

### Static Methods

#### `findByCustomer(customerId: string): Promise<ServiceEvent[]>`

Finds all service events for a specific customer.

#### `findByRoute(routeId: string): Promise<ServiceEvent[]>`

Finds all service events for a specific route.

#### `findByDriver(driverId: string): Promise<ServiceEvent[]>`

Finds all service events assigned to a specific driver.

#### `findByDateRange(startDate: Date, endDate: Date): Promise<ServiceEvent[]>`

Finds all service events within a specific date range.

#### `findDueToday(): Promise<ServiceEvent[]>`

Finds all service events scheduled for the current day.

#### `findOverdue(): Promise<ServiceEvent[]>`

Finds all service events that are overdue.
