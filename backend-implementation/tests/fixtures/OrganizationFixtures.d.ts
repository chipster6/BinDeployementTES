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
export declare class OrganizationFixtures {
    private counter;
    getOrganizationData(overrides?: OrganizationTestData): any;
    createOrganization(organizationData?: OrganizationTestData, transaction?: Transaction): Promise<Organization>;
    createOrganizations(count: number, baseData?: OrganizationTestData, transaction?: Transaction): Promise<Organization[]>;
    createWasteManagementCompany(transaction?: Transaction): Promise<Organization>;
    createRecyclingCompany(transaction?: Transaction): Promise<Organization>;
    createInactiveOrganization(transaction?: Transaction): Promise<Organization>;
    createOrganizationWithPreferences(preferences: any, transaction?: Transaction): Promise<Organization>;
    getBusinessTypeTestData(): Array<{
        businessType: string;
        expectedFeatures: string[];
    }>;
    getValidationTestCases(): Array<{
        data: OrganizationTestData;
        shouldFail: boolean;
        expectedError?: string;
    }>;
    createGeographicTestData(transaction?: Transaction): Promise<Organization[]>;
    cleanup(transaction?: Transaction): Promise<void>;
    resetCounter(): void;
}
export default OrganizationFixtures;
//# sourceMappingURL=OrganizationFixtures.d.ts.map