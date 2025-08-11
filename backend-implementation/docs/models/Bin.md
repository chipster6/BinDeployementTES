# Documentation for `models/Bin.ts`

## Overview

The `Bin` model represents a waste container or bin. It includes information about the bin's type, size, location, and status. It also has fields for IoT features like GPS tracking and fill-level sensors.

## Class: `Bin`

### Properties

-   **`id`**: The unique identifier for the bin.
-   **`binNumber`**: A unique, human-readable identifier for the bin.
-   **`customerId`**: The ID of the customer the bin is assigned to.
-   **`binType`**: The type of bin (e.g., `dumpster`, `roll_off`).
-   **`size`**: The size of the bin (e.g., '20yd', '40yd').
-   **`capacityCubicYards`**: The capacity of the bin in cubic yards.
-   **`material`**: The material the bin is made of (e.g., `steel`, `plastic`).
-   **`status`**: The current status of the bin (e.g., `active`, `maintenance`).
-   **`location`**: A PostGIS `POINT` representing the geographic location of the bin.
-   **`installationDate`**: The date the bin was installed.
-   **`lastServiceDate`**: The date the bin was last serviced.
-   **`nextServiceDate`**: The date the bin is scheduled for its next service.
-   **`gpsEnabled`**: A boolean indicating if the bin has GPS tracking.
-   **`sensorEnabled`**: A boolean indicating if the bin has a fill-level sensor.
-   **`fillLevelPercent`**: The current fill level of the bin, as a percentage.

### Methods

#### `isActive(): boolean`

Returns `true` if the bin's status is active.

#### `isSmartBin(): boolean`

Returns `true` if the bin has GPS or sensor capabilities.

#### `needsService(threshold: number = 80): boolean`

Returns `true` if the bin's fill level is above the specified threshold.

#### `isOverdueForService(): boolean`

Returns `true` if the bin's next service date is in the past.

### Static Methods

#### `findByBinNumber(binNumber: string): Promise<Bin | null>`

Finds a bin by its bin number.

#### `findByCustomer(customerId: string): Promise<Bin[]>`

Finds all bins for a specific customer.

#### `findRequiringService(fillThreshold: number = 80): Promise<Bin[]>`

Finds all active bins that require service based on their fill level.

#### `findOverdue(): Promise<Bin[]>`

Finds all active bins that are overdue for service.

#### `findSmartBins(): Promise<Bin[]>`

Finds all active bins that have GPS or sensor capabilities.

#### `generateBinNumber(binType: BinType, customerId?: string): Promise<string>`

Generates a new, unique bin number.
