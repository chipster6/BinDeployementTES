# Documentation for `BinController.ts`

## Overview

The `BinController` is responsible for managing all operations related to waste bins. This includes creating, reading, updating, and deleting bins, as well as handling IoT-related features like fill-level monitoring.

## Class: `BinController`

### Static Methods

#### `getBins(req: AuthenticatedRequest, res: Response): Promise<void>`

Retrieves a paginated and filterable list of all bins.

-   **Access**: Admin, Dispatcher, Office Staff, Driver

#### `createBin(req: AuthenticatedRequest, res: Response): Promise<void>`

Creates a new bin.

-   **Access**: Admin, Office Staff

#### `getBinById(req: AuthenticatedRequest, res: Response): Promise<void>`

Retrieves a single bin by its ID.

-   **Access**: Admin, Office Staff, Dispatcher, Driver, Customer (if they own the bin)

#### `updateBin(req: AuthenticatedRequest, res: Response): Promise<void>`

Updates the information for a specific bin.

-   **Access**: Admin, Office Staff

#### `deleteBin(req: AuthenticatedRequest, res: Response): Promise<void>`

Soft deletes a bin.

-   **Access**: Admin only

#### `getBinsByCustomer(req: AuthenticatedRequest, res: Response): Promise<void>`

Retrieves all bins associated with a specific customer.

-   **Access**: Admin, Office Staff, Customer (if they are the customer)

#### `updateFillLevel(req: AuthenticatedRequest, res: Response): Promise<void>`

Updates the fill level of a bin. This endpoint is typically called by IoT sensors.

-   **Access**: Admin, Office Staff, System

#### `getBinAnalytics(req: AuthenticatedRequest, res: Response): Promise<void>`

Retrieves statistics and analytics about the bins, such as fill level distribution and service status.

-   **Access**: Admin, Office Staff, Dispatcher
