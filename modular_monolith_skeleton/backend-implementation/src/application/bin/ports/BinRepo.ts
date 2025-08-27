import { Bin } from "../../../domain/bin/entities/Bin";
export type CreateBinDTO = Omit<Bin,"id"|"status"> & { status?: Bin["status"] };
export interface BinRepo {
  create(dto: CreateBinDTO): Promise<Bin>;
  get(id: string): Promise<Bin | null>;
}
