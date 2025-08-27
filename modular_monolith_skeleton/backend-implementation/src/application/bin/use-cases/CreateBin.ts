import { BinRepo, CreateBinDTO } from "../ports/BinRepo";
import { DomainError } from "../../../shared/errors";
import { enforce, Subject } from "../../../shared/authz/policy";

export class CreateBin {
  constructor(private repo: BinRepo) {}
  async execute(input: CreateBinDTO, subject: Subject) {
    enforce(subject, "bin:create", { customerId: input.customerId });
    if (input.capacity <= 0) throw new DomainError("Capacity must be positive");
    const created = await this.repo.create({ ...input, status: "ACTIVE" });
    return created;
  }
}
