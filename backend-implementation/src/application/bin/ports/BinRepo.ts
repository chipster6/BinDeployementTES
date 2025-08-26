import { Bin, BinStatus, BinType, BinMaterial } from "../../../domain/bin/entities/Bin";

export interface CreateBinDTO {
  serialNumber: string;
  type: BinType;
  capacity: number;
  material: BinMaterial;
  customerId: string;
  latitude: number;
  longitude: number;
  address?: string;
  organizationId?: string;
  status?: BinStatus;
}

export interface BinFilters {
  status?: BinStatus;
  type?: BinType;
  customerId?: string;
  organizationId?: string;
  fillLevelMin?: number;
  fillLevelMax?: number;
}

export interface BinRepo {
  create(dto: CreateBinDTO): Promise<Bin>;
  get(id: string): Promise<Bin | null>;
  list(filters?: BinFilters): Promise<Bin[]>;
  update(id: string, updates: Partial<CreateBinDTO>): Promise<Bin | null>;
  delete(id: string): Promise<boolean>;
  updateFillLevel(id: string, fillLevel: number): Promise<void>;
}
