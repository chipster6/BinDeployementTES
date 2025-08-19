"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testFixtures = exports.TestFixtures = void 0;
const database_1 = require("@/config/database");
const UserFixtures_1 = require("./UserFixtures");
const OrganizationFixtures_1 = require("./OrganizationFixtures");
const CustomerFixtures_1 = require("./CustomerFixtures");
const BinFixtures_1 = require("./BinFixtures");
const VehicleFixtures_1 = require("./VehicleFixtures");
const DriverFixtures_1 = require("./DriverFixtures");
const RouteFixtures_1 = require("./RouteFixtures");
const ServiceEventFixtures_1 = require("./ServiceEventFixtures");
const AuditLogFixtures_1 = require("./AuditLogFixtures");
const UserSessionFixtures_1 = require("./UserSessionFixtures");
class TestFixtures {
    constructor() {
        this.users = new UserFixtures_1.UserFixtures();
        this.organizations = new OrganizationFixtures_1.OrganizationFixtures();
        this.customers = new CustomerFixtures_1.CustomerFixtures();
        this.bins = new BinFixtures_1.BinFixtures();
        this.vehicles = new VehicleFixtures_1.VehicleFixtures();
        this.drivers = new DriverFixtures_1.DriverFixtures();
        this.routes = new RouteFixtures_1.RouteFixtures();
        this.serviceEvents = new ServiceEventFixtures_1.ServiceEventFixtures();
        this.auditLogs = new AuditLogFixtures_1.AuditLogFixtures();
        this.userSessions = new UserSessionFixtures_1.UserSessionFixtures();
    }
    static getInstance() {
        if (!TestFixtures.instance) {
            TestFixtures.instance = new TestFixtures();
        }
        return TestFixtures.instance;
    }
    async createFullTestDataset(transaction) {
        const tx = transaction || await database_1.database.transaction();
        let shouldCommit = !transaction;
        try {
            const organizations = await Promise.all([
                this.organizations.createOrganization(this.organizations.getOrganizationData({ name: 'Test Waste Co' }), tx),
                this.organizations.createOrganization(this.organizations.getOrganizationData({ name: 'Clean City Services' }), tx),
            ]);
            const users = await Promise.all([
                this.users.createUser(this.users.getUserData({
                    email: 'admin@testwaste.com',
                    role: 'admin',
                    organizationId: organizations[0].id,
                }), tx),
                this.users.createUser(this.users.getUserData({
                    email: 'admin@cleancity.com',
                    role: 'admin',
                    organizationId: organizations[1].id,
                }), tx),
                this.users.createUser(this.users.getUserData({
                    email: 'dispatcher@testwaste.com',
                    role: 'dispatcher',
                    organizationId: organizations[0].id,
                }), tx),
                this.users.createUser(this.users.getUserData({
                    email: 'driver1@testwaste.com',
                    role: 'driver',
                    organizationId: organizations[0].id,
                }), tx),
                this.users.createUser(this.users.getUserData({
                    email: 'driver2@testwaste.com',
                    role: 'driver',
                    organizationId: organizations[0].id,
                }), tx),
                this.users.createUser(this.users.getUserData({
                    email: 'customer1@example.com',
                    role: 'customer',
                    organizationId: organizations[0].id,
                }), tx),
                this.users.createUser(this.users.getUserData({
                    email: 'customer2@example.com',
                    role: 'customer',
                    organizationId: organizations[0].id,
                }), tx),
            ]);
            const customers = await Promise.all([
                this.customers.createCustomer(this.customers.getCustomerData({
                    organizationId: organizations[0].id,
                    primaryContactId: users[5].id,
                }), tx),
                this.customers.createCustomer(this.customers.getCustomerData({
                    organizationId: organizations[0].id,
                    primaryContactId: users[6].id,
                }), tx),
            ]);
            const bins = await Promise.all([
                this.bins.createBin(this.bins.getBinData({
                    customerId: customers[0].id,
                    organizationId: organizations[0].id,
                }), tx),
                this.bins.createBin(this.bins.getBinData({
                    customerId: customers[0].id,
                    organizationId: organizations[0].id,
                }), tx),
                this.bins.createBin(this.bins.getBinData({
                    customerId: customers[1].id,
                    organizationId: organizations[0].id,
                }), tx),
            ]);
            const vehicles = await Promise.all([
                this.vehicles.createVehicle(this.vehicles.getVehicleData({
                    organizationId: organizations[0].id,
                }), tx),
                this.vehicles.createVehicle(this.vehicles.getVehicleData({
                    organizationId: organizations[0].id,
                }), tx),
            ]);
            const drivers = await Promise.all([
                this.drivers.createDriver(this.drivers.getDriverData({
                    userId: users[3].id,
                    organizationId: organizations[0].id,
                }), tx),
                this.drivers.createDriver(this.drivers.getDriverData({
                    userId: users[4].id,
                    organizationId: organizations[0].id,
                }), tx),
            ]);
            const routes = await Promise.all([
                this.routes.createRoute(this.routes.getRouteData({
                    driverId: drivers[0].id,
                    vehicleId: vehicles[0].id,
                    organizationId: organizations[0].id,
                }), tx),
                this.routes.createRoute(this.routes.getRouteData({
                    driverId: drivers[1].id,
                    vehicleId: vehicles[1].id,
                    organizationId: organizations[0].id,
                }), tx),
            ]);
            const serviceEvents = await Promise.all([
                this.serviceEvents.createServiceEvent(this.serviceEvents.getServiceEventData({
                    binId: bins[0].id,
                    routeId: routes[0].id,
                    customerId: customers[0].id,
                }), tx),
                this.serviceEvents.createServiceEvent(this.serviceEvents.getServiceEventData({
                    binId: bins[1].id,
                    routeId: routes[0].id,
                    customerId: customers[0].id,
                }), tx),
                this.serviceEvents.createServiceEvent(this.serviceEvents.getServiceEventData({
                    binId: bins[2].id,
                    routeId: routes[1].id,
                    customerId: customers[1].id,
                }), tx),
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
        }
        catch (error) {
            if (shouldCommit) {
                await tx.rollback();
            }
            throw error;
        }
    }
    async cleanupAll(transaction) {
        const tx = transaction || await database_1.database.transaction();
        let shouldCommit = !transaction;
        try {
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
        }
        catch (error) {
            if (shouldCommit) {
                await tx.rollback();
            }
            throw error;
        }
    }
    async createScenario(scenarioName, transaction) {
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
    async createRouteOptimizationScenario(transaction) {
        const tx = transaction || await database_1.database.transaction();
        let shouldCommit = !transaction;
        try {
            const organization = await this.organizations.createOrganization(this.organizations.getOrganizationData({ name: 'Route Test Co' }), tx);
            const driver = await this.users.createUser(this.users.getUserData({
                email: 'route-driver@test.com',
                role: 'driver',
                organizationId: organization.id,
            }), tx);
            const vehicle = await this.vehicles.createVehicle(this.vehicles.getVehicleData({ organizationId: organization.id }), tx);
            const driverRecord = await this.drivers.createDriver(this.drivers.getDriverData({
                userId: driver.id,
                organizationId: organization.id,
            }), tx);
            const customers = await Promise.all(Array.from({ length: 5 }, (_, i) => this.customers.createCustomer(this.customers.getCustomerData({
                organizationId: organization.id,
                address: `${100 + i * 10} Test Street, City, ST 12345`,
            }), tx)));
            const bins = await Promise.all(customers.map(customer => this.bins.createBin(this.bins.getBinData({
                customerId: customer.id,
                organizationId: organization.id,
            }), tx)));
            const route = await this.routes.createRoute(this.routes.getRouteData({
                driverId: driverRecord.id,
                vehicleId: vehicle.id,
                organizationId: organization.id,
                binIds: bins.map(bin => bin.id),
            }), tx);
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
        }
        catch (error) {
            if (shouldCommit) {
                await tx.rollback();
            }
            throw error;
        }
    }
    async createCustomerManagementScenario(transaction) {
        return this.createFullTestDataset(transaction);
    }
    async createDriverPerformanceScenario(transaction) {
        return this.createFullTestDataset(transaction);
    }
    async createBinTrackingScenario(transaction) {
        return this.createFullTestDataset(transaction);
    }
}
exports.TestFixtures = TestFixtures;
exports.testFixtures = TestFixtures.getInstance();
exports.default = exports.testFixtures;
//# sourceMappingURL=index.js.map