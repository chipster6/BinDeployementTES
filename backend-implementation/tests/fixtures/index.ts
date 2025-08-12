/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - TEST FIXTURES INDEX
 * ============================================================================
 *
 * Central fixture management for all test data. Provides factory functions,
 * mock data generators, and test data cleanup utilities.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { Transaction } from 'sequelize';
import { database } from '@/config/database';
import { UserFixtures } from './UserFixtures';
import { OrganizationFixtures } from './OrganizationFixtures';
import { CustomerFixtures } from './CustomerFixtures';
import { BinFixtures } from './BinFixtures';
import { VehicleFixtures } from './VehicleFixtures';
import { DriverFixtures } from './DriverFixtures';
import { RouteFixtures } from './RouteFixtures';
import { ServiceEventFixtures } from './ServiceEventFixtures';
import { AuditLogFixtures } from './AuditLogFixtures';
import { UserSessionFixtures } from './UserSessionFixtures';

/**
 * Master test fixtures class
 */
export class TestFixtures {
  private static instance: TestFixtures;

  // Fixture instances
  public users: UserFixtures;
  public organizations: OrganizationFixtures;
  public customers: CustomerFixtures;
  public bins: BinFixtures;
  public vehicles: VehicleFixtures;
  public drivers: DriverFixtures;
  public routes: RouteFixtures;
  public serviceEvents: ServiceEventFixtures;
  public auditLogs: AuditLogFixtures;
  public userSessions: UserSessionFixtures;

  private constructor() {
    this.users = new UserFixtures();
    this.organizations = new OrganizationFixtures();
    this.customers = new CustomerFixtures();
    this.bins = new BinFixtures();
    this.vehicles = new VehicleFixtures();
    this.drivers = new DriverFixtures();
    this.routes = new RouteFixtures();
    this.serviceEvents = new ServiceEventFixtures();
    this.auditLogs = new AuditLogFixtures();
    this.userSessions = new UserSessionFixtures();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TestFixtures {
    if (!TestFixtures.instance) {
      TestFixtures.instance = new TestFixtures();
    }
    return TestFixtures.instance;
  }

  /**
   * Create a full test dataset with relationships
   */
  public async createFullTestDataset(transaction?: Transaction): Promise<{
    organizations: any[];
    users: any[];
    customers: any[];
    bins: any[];
    vehicles: any[];
    drivers: any[];
    routes: any[];
    serviceEvents: any[];
  }> {
    const tx = transaction || await database.transaction();
    let shouldCommit = !transaction;

    try {
      // Create organizations first
      const organizations = await Promise.all([
        this.organizations.createOrganization(
          this.organizations.getOrganizationData({ name: 'Test Waste Co' }),
          tx
        ),
        this.organizations.createOrganization(
          this.organizations.getOrganizationData({ name: 'Clean City Services' }),
          tx
        ),
      ]);

      // Create users for each organization
      const users = await Promise.all([
        // Admins
        this.users.createUser(
          this.users.getUserData({
            email: 'admin@testwaste.com',
            role: 'admin',
            organizationId: organizations[0].id,
          }),
          tx
        ),
        this.users.createUser(
          this.users.getUserData({
            email: 'admin@cleancity.com',
            role: 'admin',
            organizationId: organizations[1].id,
          }),
          tx
        ),
        // Dispatchers
        this.users.createUser(
          this.users.getUserData({
            email: 'dispatcher@testwaste.com',
            role: 'dispatcher',
            organizationId: organizations[0].id,
          }),
          tx
        ),
        // Drivers
        this.users.createUser(
          this.users.getUserData({
            email: 'driver1@testwaste.com',
            role: 'driver',
            organizationId: organizations[0].id,
          }),
          tx
        ),
        this.users.createUser(
          this.users.getUserData({
            email: 'driver2@testwaste.com',
            role: 'driver',
            organizationId: organizations[0].id,
          }),
          tx
        ),
        // Customers
        this.users.createUser(
          this.users.getUserData({
            email: 'customer1@example.com',
            role: 'customer',
            organizationId: organizations[0].id,
          }),
          tx
        ),
        this.users.createUser(
          this.users.getUserData({
            email: 'customer2@example.com',
            role: 'customer',
            organizationId: organizations[0].id,
          }),
          tx
        ),
      ]);

      // Create customers
      const customers = await Promise.all([
        this.customers.createCustomer(
          this.customers.getCustomerData({
            organizationId: organizations[0].id,
            primaryContactId: users[5].id,
          }),
          tx
        ),
        this.customers.createCustomer(
          this.customers.getCustomerData({
            organizationId: organizations[0].id,
            primaryContactId: users[6].id,
          }),
          tx
        ),
      ]);

      // Create bins
      const bins = await Promise.all([
        this.bins.createBin(
          this.bins.getBinData({
            customerId: customers[0].id,
            organizationId: organizations[0].id,
          }),
          tx
        ),
        this.bins.createBin(
          this.bins.getBinData({
            customerId: customers[0].id,
            organizationId: organizations[0].id,
          }),
          tx
        ),
        this.bins.createBin(
          this.bins.getBinData({
            customerId: customers[1].id,
            organizationId: organizations[0].id,
          }),
          tx
        ),
      ]);

      // Create vehicles
      const vehicles = await Promise.all([
        this.vehicles.createVehicle(
          this.vehicles.getVehicleData({
            organizationId: organizations[0].id,
          }),
          tx
        ),
        this.vehicles.createVehicle(
          this.vehicles.getVehicleData({
            organizationId: organizations[0].id,
          }),
          tx
        ),
      ]);

      // Create drivers
      const drivers = await Promise.all([
        this.drivers.createDriver(
          this.drivers.getDriverData({
            userId: users[3].id,
            organizationId: organizations[0].id,
          }),
          tx
        ),
        this.drivers.createDriver(
          this.drivers.getDriverData({
            userId: users[4].id,
            organizationId: organizations[0].id,
          }),
          tx
        ),
      ]);

      // Create routes
      const routes = await Promise.all([
        this.routes.createRoute(
          this.routes.getRouteData({
            driverId: drivers[0].id,
            vehicleId: vehicles[0].id,
            organizationId: organizations[0].id,
          }),
          tx
        ),
        this.routes.createRoute(
          this.routes.getRouteData({
            driverId: drivers[1].id,
            vehicleId: vehicles[1].id,
            organizationId: organizations[0].id,
          }),
          tx
        ),
      ]);

      // Create service events
      const serviceEvents = await Promise.all([
        this.serviceEvents.createServiceEvent(
          this.serviceEvents.getServiceEventData({
            binId: bins[0].id,
            routeId: routes[0].id,
            customerId: customers[0].id,
          }),
          tx
        ),
        this.serviceEvents.createServiceEvent(
          this.serviceEvents.getServiceEventData({
            binId: bins[1].id,
            routeId: routes[0].id,
            customerId: customers[0].id,
          }),
          tx
        ),
        this.serviceEvents.createServiceEvent(
          this.serviceEvents.getServiceEventData({
            binId: bins[2].id,
            routeId: routes[1].id,
            customerId: customers[1].id,
          }),
          tx
        ),
      ]);

      if (shouldCommit) {
        await tx.commit();
      }

      return {
        organizations,
        users,
        customers,
        bins,
        vehicles,
        drivers,
        routes,
        serviceEvents,
      };
    } catch (error) {
      if (shouldCommit) {
        await tx.rollback();
      }
      throw error;
    }
  }

  /**
   * Clean up all test data
   */
  public async cleanupAll(transaction?: Transaction): Promise<void> {
    const tx = transaction || await database.transaction();
    let shouldCommit = !transaction;

    try {
      // Clean up in reverse dependency order
      await this.serviceEvents.cleanup(tx);
      await this.routes.cleanup(tx);
      await this.drivers.cleanup(tx);
      await this.vehicles.cleanup(tx);
      await this.bins.cleanup(tx);
      await this.customers.cleanup(tx);
      await this.userSessions.cleanup(tx);
      await this.auditLogs.cleanup(tx);
      await this.users.cleanup(tx);
      await this.organizations.cleanup(tx);

      if (shouldCommit) {
        await tx.commit();
      }
    } catch (error) {
      if (shouldCommit) {
        await tx.rollback();
      }
      throw error;
    }
  }

  /**
   * Create test data for specific scenario
   */
  public async createScenario(
    scenarioName: string,
    transaction?: Transaction
  ): Promise<any> {
    switch (scenarioName) {
      case 'basic_route_optimization':
        return this.createRouteOptimizationScenario(transaction);
      case 'customer_management':
        return this.createCustomerManagementScenario(transaction);
      case 'driver_performance':
        return this.createDriverPerformanceScenario(transaction);
      case 'bin_tracking':
        return this.createBinTrackingScenario(transaction);
      default:
        return this.createFullTestDataset(transaction);
    }
  }

  /**
   * Create route optimization test scenario
   */
  private async createRouteOptimizationScenario(
    transaction?: Transaction
  ): Promise<any> {
    const tx = transaction || await database.transaction();
    let shouldCommit = !transaction;

    try {
      const organization = await this.organizations.createOrganization(
        this.organizations.getOrganizationData({ name: 'Route Test Co' }),
        tx
      );

      const driver = await this.users.createUser(
        this.users.getUserData({
          email: 'route-driver@test.com',
          role: 'driver',
          organizationId: organization.id,
        }),
        tx
      );

      const vehicle = await this.vehicles.createVehicle(
        this.vehicles.getVehicleData({ organizationId: organization.id }),
        tx
      );

      const driverRecord = await this.drivers.createDriver(
        this.drivers.getDriverData({
          userId: driver.id,
          organizationId: organization.id,
        }),
        tx
      );

      // Create multiple customers with bins for route optimization
      const customers = await Promise.all(
        Array.from({ length: 5 }, (_, i) => 
          this.customers.createCustomer(
            this.customers.getCustomerData({
              organizationId: organization.id,
              address: `${100 + i * 10} Test Street, City, ST 12345`,
            }),
            tx
          )
        )
      );

      const bins = await Promise.all(
        customers.map(customer =>
          this.bins.createBin(
            this.bins.getBinData({
              customerId: customer.id,
              organizationId: organization.id,
            }),
            tx
          )
        )
      );

      const route = await this.routes.createRoute(
        this.routes.getRouteData({
          driverId: driverRecord.id,
          vehicleId: vehicle.id,
          organizationId: organization.id,
          binIds: bins.map(bin => bin.id),
        }),
        tx
      );

      if (shouldCommit) {
        await tx.commit();
      }

      return {
        organization,
        driver,
        vehicle,
        driverRecord,
        customers,
        bins,
        route,
      };
    } catch (error) {
      if (shouldCommit) {
        await tx.rollback();
      }
      throw error;
    }
  }

  /**
   * Create customer management test scenario
   */
  private async createCustomerManagementScenario(
    transaction?: Transaction
  ): Promise<any> {
    // Implementation for customer management scenario
    return this.createFullTestDataset(transaction);
  }

  /**
   * Create driver performance test scenario
   */
  private async createDriverPerformanceScenario(
    transaction?: Transaction
  ): Promise<any> {
    // Implementation for driver performance scenario
    return this.createFullTestDataset(transaction);
  }

  /**
   * Create bin tracking test scenario
   */
  private async createBinTrackingScenario(
    transaction?: Transaction
  ): Promise<any> {
    // Implementation for bin tracking scenario
    return this.createFullTestDataset(transaction);
  }
}

// Export singleton instance
export const testFixtures = TestFixtures.getInstance();
export default testFixtures;