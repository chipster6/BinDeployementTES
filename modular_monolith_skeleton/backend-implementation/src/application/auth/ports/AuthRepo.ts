import { User } from "../../../domain/auth/entities/User";
export interface AuthRepo {
  findByEmail(email: string): Promise<User | null>;
  verifyPassword(userId: string, password: string): Promise<boolean>;
  mintAccessToken(user: User): Promise<string>; // use real signer later
}
