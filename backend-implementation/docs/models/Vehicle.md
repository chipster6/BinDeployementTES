# Documentation for `models/Vehicle.ts`

## Overview

The `Vehicle` model represents a vehicle in the company's fleet. It includes information about the vehicle's specifications, capacity, maintenance schedule, and integration with GPS and other telematics systems.

## Class: `Vehicle`

### Properties

-   **`id`**: The unique identifier for the vehicle.
-   **`vehicleNumber`**: A unique, human-readable identifier for the vehicle.
-   **`make`**: The manufacturer of the vehicle.
-   **`model`**: The model of the vehicle.
-   **`year`**: The manufacturing year of the vehicle.
-   **`vin`**: The Vehicle Identification Number.
-   **`licensePlate`**: The license plate number.
-   **`vehicleType`**: The type of vehicle (e.g., `truck`, `van`).
-   **`capacityCubicYards`**: The vehicle's capacity in cubic yards.
-   **`capacityWeightLbs`**: The vehicle's capacity in pounds.
-   **`fuelType`**: The type of fuel the vehicle uses.
-   **`status`**: The current status of the vehicle (e.g., `active`, `maintenance`).
-   **`gpsDeviceId`**: The ID of the GPS device installed in the vehicle.
-   **`samsaraVehicleId`**: The ID of the vehicle in the Samsara system.
-   **`lastMaintenanceDate`**: The date of the vehicle's last maintenance.
-   **`nextMaintenanceDate`**: The date of the vehicle's next scheduled maintenance.

### Methods

#### `isActive(): boolean`

Returns `true` if the vehicle's status is active.

#### `needsMaintenance(): boolean`

Returns `true` if the vehicle is due for maintenance within the next 7 days.

#### `isMaintenanceOverdue(): boolean`

Returns `true` if the vehicle's next maintenance date is in the past.

### Static Methods

#### `findByVehicleNumber(vehicleNumber: string): Promise<Vehicle | null>`

Finds a vehicle by its vehicle number.

#### `findActiveByType(vehicleType: VehicleType): Promise<Vehicle[]>`

Finds all active vehicles of a specific type.

#### `findNeedingMaintenance(): Promise<Vehicle[]>`

Finds all vehicles that are due for maintenance within the next 7 days.

#### `findOverdueMaintenance(): Promise<Vehicle[]>`

Finds all vehicles whose maintenance is overdue.

#### `generateVehicleNumber(vehicleType: VehicleType): Promise<string>`

Generates a new, unique vehicle number.
