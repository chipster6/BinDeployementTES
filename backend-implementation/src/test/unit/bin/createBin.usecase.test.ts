/**
 * CreateBin Use Case Tests
 * 
 * Unit tests for the CreateBin use case with proper TypeScript compliance
 * and mock repository implementation.
 */
import { CreateBin } from '../../../application/bin/use-cases/CreateBin';
import { BinRepo, CreateBinDTO } from '../../../application/bin/ports/BinRepo';
import { Bin, BinType, BinStatus, BinMaterial } from '../../../domain/bin/entities/Bin';
import { BadRequest } from '../../../shared/errors';

// Mock repository for testing
class FakeBinRepo implements BinRepo {
  async create(dto: CreateBinDTO): Promise<Bin> { 
    return { 
      id: 'BIN1', 
      status: BinStatus.ACTIVE,
      location: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address
      },
      ...dto
    } as Bin; 
  }

  async get(id: string): Promise<Bin | null> { return null; }
  async list(): Promise<Bin[]> { return []; }
  async update(id: string, updates: Partial<CreateBinDTO>): Promise<Bin | null> { return null; }
  async delete(id: string): Promise<boolean> { return false; }
  async updateFillLevel(id: string, fillLevel: number): Promise<void> { }
}

describe('CreateBin Use Case', () => {
  let binRepo: FakeBinRepo;
  let createBinUseCase: CreateBin;

  beforeEach(() => {
    binRepo = new FakeBinRepo();
    createBinUseCase = new CreateBin(binRepo);
  });

  it('should create ACTIVE bin with valid input', async () => {
    const subject = { id: 'U1', roles: ['admin'], organizationId: 'ORG1' };
    const input: CreateBinDTO = {
      serialNumber: 'SN1', 
      type: BinType.ROLL_OFF, 
      capacity: 10, 
      material: BinMaterial.GENERAL,
      customerId: 'C1', 
      latitude: 40.7128, 
      longitude: -74.0060 
    };

    const result = await createBinUseCase.execute(input, subject);
    
    expect(result.id).toBe('BIN1');
    expect(result.status).toBe(BinStatus.ACTIVE);
    expect(result.serialNumber).toBe('SN1');
    expect(result.customerId).toBe('C1');
    expect(result.location.latitude).toBe(40.7128);
    expect(result.location.longitude).toBe(-74.0060);
  });

  it('should throw BadRequest for invalid capacity', async () => {
    const subject = { id: 'U1', roles: ['admin'], organizationId: 'ORG1' };
    const input: CreateBinDTO = {
      serialNumber: 'SN1', 
      type: BinType.ROLL_OFF, 
      capacity: 0, // Invalid capacity
      material: BinMaterial.GENERAL,
      customerId: 'C1', 
      latitude: 40.7128, 
      longitude: -74.0060 
    };

    await expect(createBinUseCase.execute(input, subject))
      .rejects.toThrow(BadRequest);
    await expect(createBinUseCase.execute(input, subject))
      .rejects.toThrow('Capacity must be positive');
  });

  it('should throw BadRequest for empty serial number', async () => {
    const subject = { id: 'U1', roles: ['admin'], organizationId: 'ORG1' };
    const input: CreateBinDTO = {
      serialNumber: '', // Empty serial number
      type: BinType.ROLL_OFF, 
      capacity: 10,
      material: BinMaterial.GENERAL,
      customerId: 'C1', 
      latitude: 40.7128, 
      longitude: -74.0060 
    };

    await expect(createBinUseCase.execute(input, subject))
      .rejects.toThrow(BadRequest);
    await expect(createBinUseCase.execute(input, subject))
      .rejects.toThrow('Serial number is required');
  });

  it('should throw BadRequest for empty customer ID', async () => {
    const subject = { id: 'U1', roles: ['admin'], organizationId: 'ORG1' };
    const input: CreateBinDTO = {
      serialNumber: 'SN1',
      type: BinType.ROLL_OFF, 
      capacity: 10,
      material: BinMaterial.GENERAL,
      customerId: '', // Empty customer ID
      latitude: 40.7128, 
      longitude: -74.0060 
    };

    await expect(createBinUseCase.execute(input, subject))
      .rejects.toThrow(BadRequest);
    await expect(createBinUseCase.execute(input, subject))
      .rejects.toThrow('Customer ID is required');
  });
});