import { describe, it, expect } from "vitest";
import { CreateBin } from "../../../backend-implementation/src/application/bin/use-cases/CreateBin";

class FakeBinRepo {
  async create(dto:any){ return { id:"BIN1", status:"ACTIVE", ...dto }; }
}
describe("CreateBin use-case", () => {
  it("creates with ACTIVE status", async () => {
    const uc = new CreateBin(new FakeBinRepo() as any);
    const subject = { id:"U1", roles:["admin"] };
    const out = await uc.execute({ serialNumber:"SN1", type:"ROLL_OFF", capacity:10, customerId:"C1", latitude:0, longitude:0 }, subject as any);
    expect(out.id).toBe("BIN1");
    expect(out.status).toBe("ACTIVE");
  });
});
