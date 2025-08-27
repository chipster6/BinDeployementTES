import { BinRepo, CreateBinDTO } from "../ports/BinRepo";
import { Bin, BinStatus } from "../../../domain/bin/entities/Bin";
import { BadRequest } from "../../../shared/errors";
import { enforce, Subject } from "../../../shared/authz/policy";

export class CreateBin {
  constructor(private repo: BinRepo) {}

  async execute(input: CreateBinDTO, subject: Subject): Promise<Bin> {
    // Authorization check
    enforce(subject, "bin:create", { customerId: input.customerId });

    // Business validation
    if (input.capacity <= 0) {
      throw new BadRequest("Capacity must be positive");
    }

    if (!input.serialNumber || input.serialNumber.trim().length === 0) {
      throw new BadRequest("Serial number is required");
    }

    if (!input.customerId || input.customerId.trim().length === 0) {
      throw new BadRequest("Customer ID is required");
    }

    // Set default status if not provided
    const binData: CreateBinDTO = {
      ...input,
      status: input.status || BinStatus.ACTIVE
    };

    try {
      const created = await this.repo.create(binData);
      return created;
    } catch (error) {
      throw new BadRequest(`Failed to create bin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
