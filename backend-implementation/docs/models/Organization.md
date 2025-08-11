# Documentation for `models/Organization.ts`

## Overview

The `Organization` model represents a company or organization within the system, such as a customer, vendor, or partner. It supports multi-tenancy, spatial data for service locations, and includes features for compliance and auditing.

## Class: `Organization`

### Properties

-   **`id`**: The unique identifier for the organization.
-   **`name`**: The name of the organization.
-   **`legalName`**: The legal name of the organization.
-   **`taxIdEncrypted`**: The encrypted tax ID of the organization.
-   **`type`**: The type of organization (e.g., `customer`, `vendor`).
-   **`status`**: The current status of the organization (e.g., `active`, `inactive`).
-   **`billingAddress...`**: A set of fields for the billing address.
-   **`serviceAddress...`**: A set of fields for the service address.
-   **`serviceLocation`**: A PostGIS `POINT` for the geographic location of the service address.
-   **`primaryContactId`**: The ID of the primary contact user for the organization.
-   **`gdprApplicable`**: A boolean indicating if GDPR applies to the organization.
-   **`dataRetentionPolicy`**: The data retention policy for the organization.
-   **`version`**: The version number of the record, for optimistic locking.

### Methods

#### `setTaxId(taxId: string): Promise<void>`

Encrypts and sets the `taxIdEncrypted` property.

#### `getTaxId(): Promise<string | null>`

Decrypts and returns the `taxIdEncrypted` property.

#### `get billingAddress(): string`

Returns a formatted string of the full billing address.

#### `get serviceAddress(): string`

Returns a formatted string of the full service address.

#### `isInEU(): boolean`

Checks if the organization is located in the European Union.

#### `setServiceLocationFromCoords(latitude: number, longitude: number): void`

Sets the `serviceLocation` property from latitude and longitude coordinates.

#### `getServiceLocationCoords(): { latitude: number; longitude: number } | null`

Returns the latitude and longitude of the `serviceLocation`.

#### `distanceTo(other: Organization): Promise<number | null>`

Calculates the distance in kilometers to another organization using PostGIS.

#### `getDataRetentionDate(): Date`

Calculates the data retention date based on the organization's policy.

#### `get isCustomer(): boolean`

Returns `true` if the organization is a customer.

#### `get isActive(): boolean`

Returns `true` if the organization's status is active.

#### `anonymize(): Promise<void>`

Anonymizes the organization's data for GDPR compliance.

#### `toJSON(): Partial<OrganizationAttributes>`

Returns a JSON representation of the organization, excluding sensitive fields.
