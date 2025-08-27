import { AuthRepo } from "../../application/auth/ports/AuthRepo";
import { User } from "../../domain/auth/entities/User";

// TODO: wire to your Sequelize models
export class AuthRepoSequelize implements AuthRepo {
  async findByEmail(email: string): Promise<User | null> { /* impl */ return null; }
  async verifyPassword(_userId: string, _password: string): Promise<boolean> { /* impl */ return false; }
  async mintAccessToken(user: User): Promise<string> { /* impl */ return "mock.jwt.token"; }
}
