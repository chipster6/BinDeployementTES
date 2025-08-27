import { BinRepo, CreateBinDTO } from "../../application/bin/ports/BinRepo";
import { Bin } from "../../domain/bin/entities/Bin";

// TODO: wire to your Sequelize models
export class BinRepoSequelize implements BinRepo {
  async create(dto: CreateBinDTO): Promise<Bin> {
    return {
      id: "BIN-" + Math.random().toString(36).slice(2),
      serialNumber: dto.serialNumber,
      type: dto.type,
      capacity: dto.capacity,
      customerId: dto.customerId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      status: dto.status ?? "ACTIVE",
    };
  }
  async get(_id: string): Promise<Bin | null> { /* impl */ return null; }
}
