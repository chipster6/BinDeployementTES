/**
 * Bin Domain Entity
 * 
 * Core business entity representing a waste bin in the system.
 * Contains only business data and validation rules.
 */

export interface Bin {
  id: string;
  serialNumber: string;
  type: BinType;
  capacity: number;
  status: BinStatus;
  material: BinMaterial;
  customerId: string;
  organizationId?: string;
  location: BinLocation;
  fillLevel?: number;
  lastEmptied?: Date;
  nextScheduledService?: Date;
  installationDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BinLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export enum BinType {
  ROLL_OFF = 'ROLL_OFF',
  FRONT_LOAD = 'FRONT_LOAD',
  REAR_LOAD = 'REAR_LOAD',
  SIDE_LOAD = 'SIDE_LOAD',
  COMPACTOR = 'COMPACTOR'
}

export enum BinStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  SCHEDULED = 'SCHEDULED',
  FULL = 'FULL',
  DAMAGED = 'DAMAGED',
  REMOVED = 'REMOVED'
}

export enum BinMaterial {
  GENERAL = 'GENERAL',
  RECYCLABLE = 'RECYCLABLE',
  ORGANIC = 'ORGANIC',
  HAZARDOUS = 'HAZARDOUS',
  CONSTRUCTION = 'CONSTRUCTION'
}
