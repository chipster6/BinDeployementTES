import { AuthRepo } from "../ports/AuthRepo";
import { BadRequest } from "../../../shared/errors";

export class Login {
  constructor(private repo: AuthRepo) {}
  async execute(input: { email: string; password: string }) {
    const user = await this.repo.findByEmail(input.email);
    if (!user) throw new BadRequest("Invalid credentials");
    const ok = await this.repo.verifyPassword(user.id, input.password);
    if (!ok) throw new BadRequest("Invalid credentials");
    const token = await this.repo.mintAccessToken(user);
    return { token, user: { id: user.id, email: user.email, roles: user.roles } };
  }
}
