# Documentation for `models/Customer.ts`

## Overview

The `Customer` model represents a customer of the waste management service. It extends the `Organization` model with service-specific information, such as service frequency, billing details, and pricing.

## Class: `Customer`

### Properties

-   **`id`**: The unique identifier for the customer.
-   **`customer_number`**: A unique, human-readable identifier for the customer.
-   **`organization_id`**: A foreign key referencing the `Organization` model.
-   **`status`**: The current status of the customer (e.g., `active`, `inactive`).
-   **`service_types`**: An array of strings representing the types of services the customer receives.
-   **`container_types`**: An array of strings representing the types of containers the customer uses.
-   **`service_frequency`**: The frequency of service (e.g., `weekly`, `monthly`).
-   **`preferred_day_of_week`**: The customer's preferred day for service.
-   **`billing_method`**: The customer's preferred billing method.
-   **`payment_terms`**: The payment terms for the customer.
-   **`service_start_date`**: The date when service begins for the customer.
-   **`base_rate`**: The base rate for the customer's service.
-   **`account_manager_id`**: The ID of the account manager assigned to the customer.

### Methods

#### `isActive(): boolean`

Returns `true` if the customer's status is active.

#### `canReceiveService(): boolean`

Returns `true` if the customer is active and their service dates are valid.

#### `getServiceConfig(): ServiceConfig`

Returns an object containing the customer's service configuration.

#### `setServiceConfig(config: ServiceConfig): void`

Sets the customer's service configuration from a `ServiceConfig` object.

#### `calculateNextServiceDate(): Date | null`

Calculates the customer's next service date based on their service frequency and start date.

#### `getTotalRate(): number`

Calculates the total service rate for the customer, including any fuel surcharges.

#### `hasActiveServices(): Promise<boolean>`

Checks if the customer has any active service events.

#### `getServiceHistory(): Promise<any[]>`

Retrieves the customer's service history.

#### `toSafeJSON(): object`

Returns a JSON representation of the customer, excluding sensitive fields.

### Static Methods

#### `findByStatus(status: CustomerStatus): Promise<CustomerModel[]>`

Finds all customers with a specific status.

#### `findDueForService(date?: Date): Promise<CustomerModel[]>`

Finds all customers who are due for service on or before a specific date.

#### `findByFrequency(frequency: ServiceFrequency): Promise<CustomerModel[]>`

Finds all customers with a specific service frequency.

#### `findByAccountManager(managerId: string): Promise<CustomerModel[]>`

Finds all customers assigned to a specific account manager.

#### `createWithConfig(customerData: object): Promise<CustomerModel>`

Creates a new customer with a service configuration.
