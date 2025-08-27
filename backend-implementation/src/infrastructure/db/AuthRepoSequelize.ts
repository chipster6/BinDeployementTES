import { AuthRepo } from "../../application/auth/ports/AuthRepo";
import { User as DomainUser } from "../../domain/auth/entities/User";
import { User as SequelizeUser, UserStatus } from "../../models/User";
import { AuthenticationService } from "../../services/auth/AuthenticationService";
import { generateToken } from "../../middleware/auth";
import bcrypt from "bcrypt";
import { logger } from "../../utils/logger";

/**
 * AuthRepoSequelize - Integration bridge between clean architecture and existing services
 * 
 * Adapts existing Sequelize models and authentication services to work with 
 * the new clean architecture pattern while preserving all existing functionality.
 */
export class AuthRepoSequelize implements AuthRepo {
  private authService: AuthenticationService;

  constructor() {
    this.authService = new AuthenticationService();
  }

  async findByEmail(email: string): Promise<DomainUser | null> {
    try {
      const user = await SequelizeUser.findOne({
        where: { 
          email: email.toLowerCase(),
          status: UserStatus.ACTIVE 
        }
      });

      if (!user) {
        return null;
      }

      // Convert Sequelize model to domain entity
      return {
        id: user.id,
        email: user.email,
        roles: user.roles || [],
        tenantId: user.organizationId
      };
    } catch (error) {
      logger.error('Failed to find user by email', { email, error });
      throw error;
    }
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await SequelizeUser.findByPk(userId);
      if (!user || !user.passwordHash) {
        return false;
      }

      return bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      logger.error('Failed to verify password', { userId, error });
      return false;
    }
  }

  async mintAccessToken(user: DomainUser): Promise<string> {
    try {
      // Use existing token generation with proper payload structure
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        roles: user.roles,
        organizationId: user.tenantId,
        iat: Math.floor(Date.now() / 1000)
      };

      return generateToken(tokenPayload);
    } catch (error) {
      logger.error('Failed to mint access token', { userId: user.id, error });
      throw error;
    }
  }
}
