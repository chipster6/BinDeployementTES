# Documentation for `models/Driver.ts`

## Overview

The `Driver` model represents a driver in the system. It extends the `User` model with driver-specific information, such as license details, employment status, and emergency contact information.

## Class: `Driver`

### Properties

-   **`id`**: The unique identifier for the driver.
-   **`userId`**: A foreign key referencing the `User` model.
-   **`driverNumber`**: A unique, human-readable identifier for the driver.
-   **`licenseNumberEncrypted`**: The driver's encrypted license number.
-   **`licenseClass`**: The driver's license class (e.g., `CDL-A`).
-   **`licenseExpiryDate`**: The expiration date of the driver's license.
-   **`cdlEndorsements`**: Any Commercial Driver's License endorsements the driver has.
-   **`hireDate`**: The date the driver was hired.
-   **`employmentStatus`**: The driver's current employment status (e.g., `active`, `inactive`).
-   **`emergencyContactEncrypted`**: The driver's encrypted emergency contact information.

### Methods

#### `isActive(): boolean`

Returns `true` if the driver's employment status is active.

#### `isLicenseExpired(): boolean`

Returns `true` if the driver's license has expired.

#### `isLicenseExpiringSoon(daysWarning: number = 30): boolean`

Returns `true` if the driver's license is expiring within the specified number of days.

#### `getYearsOfEmployment(): number | null`

Returns the number of years the driver has been employed.

### Static Methods

#### `findByDriverNumber(driverNumber: string): Promise<Driver | null>`

Finds a driver by their driver number.

#### `findByUserId(userId: string): Promise<Driver | null>`

Finds a driver by their user ID.

#### `findActive(): Promise<Driver[]>`

Finds all active drivers.

#### `findWithExpiringLicenses(daysWarning: number = 30): Promise<Driver[]>`

Finds all drivers with licenses expiring within the specified number of days.

#### `generateDriverNumber(): Promise<string>`

Generates a new, unique driver number.
