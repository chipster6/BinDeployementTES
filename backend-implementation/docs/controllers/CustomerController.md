# Documentation for `CustomerController.ts`

## Overview

The `CustomerController` is responsible for managing all customer-related operations. This includes creating, reading, updating, and deleting customers, as well as handling service configurations and billing information.

## Class: `CustomerController`

### Static Methods

#### `getCustomers(req: Request, res: Response): Promise<void>`

Retrieves a paginated and filterable list of all customers.

-   **Access**: Admin, Dispatcher, Office Staff

#### `getCustomerById(req: Request, res: Response): Promise<void>`

Retrieves a single customer by their ID.

-   **Access**: Admin, Dispatcher, Office Staff

#### `createCustomer(req: Request, res: Response): Promise<void>`

Creates a new customer.

-   **Access**: Admin, Office Staff

#### `updateCustomer(req: Request, res: Response): Promise<void>`

Updates the information for a specific customer.

-   **Access**: Admin, Office Staff

#### `deleteCustomer(req: Request, res: Response): Promise<void>`

Soft deletes a customer.

-   **Access**: Admin only

#### `getCustomersByStatus(req: Request, res: Response): Promise<void>`

Retrieves all customers with a specific status.

-   **Access**: Admin, Dispatcher, Office Staff

#### `getCustomersDueForService(req: Request, res: Response): Promise<void>`

Retrieves all customers who are due for service on a specific date.

-   **Access**: Admin, Dispatcher, Office Staff

#### `getCustomersByFrequency(req: Request, res: Response): Promise<void>`

Retrieves all customers with a specific service frequency.

-   **Access**: Admin, Dispatcher, Office Staff

#### `getCustomersByAccountManager(req: Request, res: Response): Promise<void>`

Retrieves all customers assigned to a specific account manager.

-   **Access**: Admin, Dispatcher, Office Staff

#### `updateServiceConfig(req: Request, res: Response): Promise<void>`

Updates the service configuration for a specific customer.

-   **Access**: Admin, Office Staff
