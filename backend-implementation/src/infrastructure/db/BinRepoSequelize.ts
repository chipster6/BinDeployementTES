/**
 * BinRepoSequelize - Infrastructure Adapter
 * 
 * Implements the BinRepo interface using Sequelize models.
 * Bridges clean architecture with existing Sequelize infrastructure.
 */

import { BinRepo, CreateBinDTO, BinFilters } from "../../application/bin/ports/BinRepo";
import { Bin, BinStatus, BinType, BinMaterial } from "../../domain/bin/entities/Bin";
import { Bin as SequelizeBin } from "../../models/Bin";
import { Op } from "sequelize";

export class BinRepoSequelize implements BinRepo {
  async create(dto: CreateBinDTO): Promise<Bin> {
    const sequelizeBin = await SequelizeBin.create({
      serialNumber: dto.serialNumber,
      type: dto.type,
      capacity: dto.capacity,
      status: dto.status || BinStatus.ACTIVE,
      material: dto.material,
      customerId: dto.customerId,
      organizationId: dto.organizationId,
      location: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude]
      },
      address: dto.address,
      fillLevel: 0,
      installationDate: new Date()
    });

    return this.toDomain(sequelizeBin);
  }

  async get(id: string): Promise<Bin | null> {
    if (!id) return null;
    
    const sequelizeBin = await SequelizeBin.findByPk(id);
    return sequelizeBin ? this.toDomain(sequelizeBin) : null;
  }

  async list(filters?: BinFilters): Promise<Bin[]> {
    const whereCondition: any = {};

    if (filters?.status) {
      whereCondition.status = filters.status;
    }
    if (filters?.type) {
      whereCondition.type = filters.type;
    }
    if (filters?.customerId) {
      whereCondition.customerId = filters.customerId;
    }
    if (filters?.organizationId) {
      whereCondition.organizationId = filters.organizationId;
    }
    if (filters?.fillLevelMin !== undefined || filters?.fillLevelMax !== undefined) {
      whereCondition.fillLevel = {};
      if (filters.fillLevelMin !== undefined) {
        whereCondition.fillLevel[Op.gte] = filters.fillLevelMin;
      }
      if (filters.fillLevelMax !== undefined) {
        whereCondition.fillLevel[Op.lte] = filters.fillLevelMax;
      }
    }

    const bins = await SequelizeBin.findAll({
      where: whereCondition,
      order: [['createdAt', 'DESC']]
    });

    return bins.map(bin => this.toDomain(bin));
  }

  async update(id: string, updates: Partial<CreateBinDTO>): Promise<Bin | null> {
    if (!id) return null;
    
    const [affectedCount] = await SequelizeBin.update(updates, {
      where: { id }
    });

    if (affectedCount === 0) {
      return null;
    }

    return this.get(id);
  }

  async delete(id: string): Promise<boolean> {
    if (!id) return false;
    
    const deletedCount = await SequelizeBin.destroy({
      where: { id }
    });
    return deletedCount > 0;
  }

  async updateFillLevel(id: string, fillLevel: number): Promise<void> {
    if (!id) return;
    
    await SequelizeBin.update(
      { 
        fillLevel,
        updatedAt: new Date()
      },
      { where: { id } }
    );
  }

  /**
   * Convert Sequelize model to domain entity
   */
  private toDomain(sequelizeBin: any): Bin {
    if (!sequelizeBin) {
      throw new Error('Cannot convert null/undefined Sequelize model to domain entity');
    }
    
    const location = sequelizeBin.location;
    
    return {
      id: sequelizeBin.id,
      serialNumber: sequelizeBin.serialNumber,
      type: sequelizeBin.type as BinType,
      capacity: sequelizeBin.capacity,
      status: sequelizeBin.status as BinStatus,
      material: sequelizeBin.material as BinMaterial,
      customerId: sequelizeBin.customerId,
      organizationId: sequelizeBin.organizationId,
      location: {
        latitude: location?.coordinates?.[1] || 0,
        longitude: location?.coordinates?.[0] || 0,
        address: sequelizeBin.address
      },
      fillLevel: sequelizeBin.fillLevel,
      lastEmptied: sequelizeBin.lastEmptied,
      nextScheduledService: sequelizeBin.nextScheduledService,
      installationDate: sequelizeBin.installationDate,
      createdAt: sequelizeBin.createdAt,
      updatedAt: sequelizeBin.updatedAt
    };
  }
}
