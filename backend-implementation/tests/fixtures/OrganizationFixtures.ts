/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ORGANIZATION TEST FIXTURES
 * ============================================================================
 *
 * Test fixtures and factory functions for Organization model testing.
 * Provides realistic mock data and helper functions.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { Transaction } from 'sequelize';
import { Organization } from '@/models/Organization';

export interface OrganizationTestData {
  name?: string;
  businessType?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  taxId?: string;
  isActive?: boolean;
  preferences?: any;
  metadata?: any;
}

export class OrganizationFixtures {
  private counter = 1;

  /**
   * Generate organization test data with optional overrides
   */
  public getOrganizationData(overrides: OrganizationTestData = {}): any {
    const index = this.counter++;
    
    return {
      name: overrides.name || `Test Organization ${index}`,
      businessType: overrides.businessType || 'waste_management',
      contactEmail: overrides.contactEmail || `org${index}@example.com`,
      contactPhone: overrides.contactPhone || `+1555${String(index).padStart(3, '0')}0000`,
      address: overrides.address || `${100 + index} Business Ave`,
      city: overrides.city || 'Test City',
      state: overrides.state || 'TS',
      zipCode: overrides.zipCode || `12${String(index).padStart(3, '0')}`,
      taxId: overrides.taxId || `${String(index).padStart(2, '0')}-123456${index}`,
      isActive: overrides.isActive ?? true,
      preferences: overrides.preferences || {
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
      },
      metadata: overrides.metadata || {
        industry: 'waste_management',
        size: 'medium',
        founded: new Date('2020-01-01'),
        tags: ['test', 'organization'],
      },
    };
  }

  /**
   * Create an organization
   */
  public async createOrganization(
    organizationData: OrganizationTestData = {},
    transaction?: Transaction
  ): Promise<Organization> {
    const data = this.getOrganizationData(organizationData);

    const organization = await Organization.create({
      name: data.name,
      business_type: data.businessType,
      contact_email: data.contactEmail.toLowerCase(),
      contact_phone: data.contactPhone,
      address: data.address,
      city: data.city,
      state: data.state,
      zip_code: data.zipCode,
      tax_id: data.taxId,
      is_active: data.isActive,
      preferences: data.preferences,
      metadata: data.metadata,
    }, { transaction });

    return organization;
  }

  /**
   * Create multiple organizations
   */
  public async createOrganizations(
    count: number,
    baseData: OrganizationTestData = {},
    transaction?: Transaction
  ): Promise<Organization[]> {
    const organizations = [];
    for (let i = 0; i < count; i++) {
      const organization = await this.createOrganization(baseData, transaction);
      organizations.push(organization);
    }
    return organizations;
  }

  /**
   * Create a waste management company
   */
  public async createWasteManagementCompany(
    transaction?: Transaction
  ): Promise<Organization> {
    return this.createOrganization({
      name: 'Waste Management Pro',
      businessType: 'waste_management',
      contactEmail: 'admin@wastemanagementpro.com',
      preferences: {
        timezone: 'America/New_York',
        currency: 'USD',
        operationHours: {
          monday: { start: '06:00', end: '18:00' },
          tuesday: { start: '06:00', end: '18:00' },
          wednesday: { start: '06:00', end: '18:00' },
          thursday: { start: '06:00', end: '18:00' },
          friday: { start: '06:00', end: '18:00' },
          saturday: { start: '08:00', end: '14:00' },
          sunday: { start: null, end: null },
        },
      },
    }, transaction);
  }

  /**
   * Create a recycling company
   */
  public async createRecyclingCompany(
    transaction?: Transaction
  ): Promise<Organization> {
    return this.createOrganization({
      name: 'Green Recycling Solutions',
      businessType: 'recycling',
      contactEmail: 'info@greenrecycling.com',
      preferences: {
        timezone: 'America/Los_Angeles',
        currency: 'USD',
        specializations: ['metal', 'plastic', 'paper', 'electronics'],
      },
    }, transaction);
  }

  /**
   * Create an inactive organization
   */
  public async createInactiveOrganization(
    transaction?: Transaction
  ): Promise<Organization> {
    return this.createOrganization({
      name: 'Inactive Test Company',
      isActive: false,
    }, transaction);
  }

  /**
   * Create organization with custom preferences
   */
  public async createOrganizationWithPreferences(
    preferences: any,
    transaction?: Transaction
  ): Promise<Organization> {
    return this.createOrganization({
      name: 'Custom Preferences Org',
      preferences,
    }, transaction);
  }

  /**
   * Get test data for different business types
   */
  public getBusinessTypeTestData(): Array<{
    businessType: string;
    expectedFeatures: string[];
  }> {
    return [
      {
        businessType: 'waste_management',
        expectedFeatures: ['route_optimization', 'bin_tracking', 'driver_management'],
      },
      {
        businessType: 'recycling',
        expectedFeatures: ['material_sorting', 'pickup_scheduling', 'weight_tracking'],
      },
      {
        businessType: 'municipal',
        expectedFeatures: ['public_reporting', 'citizen_requests', 'budget_tracking'],
      },
      {
        businessType: 'commercial',
        expectedFeatures: ['bulk_collection', 'contract_management', 'billing_integration'],
      },
    ];
  }

  /**
   * Get validation test cases
   */
  public getValidationTestCases(): Array<{
    data: OrganizationTestData;
    shouldFail: boolean;
    expectedError?: string;
  }> {
    return [
      {
        data: { name: 'Valid Company', contactEmail: 'valid@test.com' },
        shouldFail: false,
      },
      {
        data: { name: '', contactEmail: 'valid@test.com' },
        shouldFail: true,
        expectedError: 'Name is required',
      },
      {
        data: { name: 'Valid Company', contactEmail: 'invalid-email' },
        shouldFail: true,
        expectedError: 'Invalid email format',
      },
      {
        data: { name: 'Valid Company', contactPhone: '123' },
        shouldFail: true,
        expectedError: 'Invalid phone format',
      },
      {
        data: { name: 'A'.repeat(256), contactEmail: 'valid@test.com' },
        shouldFail: true,
        expectedError: 'Name too long',
      },
    ];
  }

  /**
   * Create test data for geographic distribution
   */
  public async createGeographicTestData(
    transaction?: Transaction
  ): Promise<Organization[]> {
    const locations = [
      { city: 'New York', state: 'NY', zipCode: '10001' },
      { city: 'Los Angeles', state: 'CA', zipCode: '90001' },
      { city: 'Chicago', state: 'IL', zipCode: '60601' },
      { city: 'Houston', state: 'TX', zipCode: '77001' },
      { city: 'Phoenix', state: 'AZ', zipCode: '85001' },
    ];

    const organizations = [];
    for (const location of locations) {
      const org = await this.createOrganization({
        name: `${location.city} Waste Services`,
        city: location.city,
        state: location.state,
        zipCode: location.zipCode,
      }, transaction);
      organizations.push(org);
    }

    return organizations;
  }

  /**
   * Cleanup all test organizations
   */
  public async cleanup(transaction?: Transaction): Promise<void> {
    await Organization.destroy({
      where: {},
      force: true, // Hard delete for tests
      transaction,
    });
  }

  /**
   * Reset counter for consistent test data
   */
  public resetCounter(): void {
    this.counter = 1;
  }
}

export default OrganizationFixtures;