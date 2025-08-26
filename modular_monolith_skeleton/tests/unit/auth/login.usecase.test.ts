import { describe, it, expect } from "vitest";
import { Login } from "../../../backend-implementation/src/application/auth/use-cases/Login";

class FakeAuthRepo {
  user = { id: "U1", email: "a@b.com", roles: ["admin"] };
  async findByEmail(email:string){ return email===this.user.email ? this.user : null; }
  async verifyPassword(){ return true; }
  async mintAccessToken(){ return "token"; }
}
describe("Login use-case", () => {
  it("mints token for valid creds", async () => {
    const uc = new Login(new FakeAuthRepo() as any);
    const out = await uc.execute({ email: "a@b.com", password: "password123" });
    expect(out.token).toBe("token");
  });
});
