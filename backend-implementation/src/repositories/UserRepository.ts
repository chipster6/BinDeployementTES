/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER REPOSITORY
 * ============================================================================
 *
 * User-specific repository extending BaseRepository.
 * Provides specialized data access methods for User entity operations.
 *
 * Features:
 * - User-specific queries and filters
 * - Role and organization filtering
 * - Active user management
 * - Email and authentication lookups
 * - User statistics and analytics
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-11
 * Version: 1.0.0
 */

import { Op, WhereOptions, IncludeOptions } from "sequelize";
import { User, UserStatus } from "@/models/User";
import { Organization } from "@/models/Organization";
import { UserProfile } from "@/models/user/UserProfile";
import { UserSecurity } from "@/models/user/UserSecurity";
import { BaseRepository, RepositoryFilter, PaginationResult } from "./BaseRepository";
import { logger } from "@/utils/logger";

/**
 * User search criteria
 */
export interface UserSearchCriteria extends RepositoryFilter {
  organizationId?: string;
  role?: string;
  status?: UserStatus;
  isActive?: boolean;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  search?: string;
}

/**
 * User statistics interface
 */
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
  byOrganization: Record<string, number>;
  emailVerified: number;
  mfaEnabled: number;
  recentLogins: number;
  newThisMonth: number;
}

/**
 * User repository class
 */
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  /**
   * Find user by email with profile and security data
   */
  public async findByEmailWithDetails(
    email: string,
    includeProfile: boolean = true,
    includeSecurity: boolean = true
  ): Promise<User | null> {
    const cacheKey = this.generateCacheKey("findByEmailWithDetails", {
      email,
      includeProfile,
      includeSecurity,
    });

    // Check cache first
    const cached = await this.getFromCache<User>(cacheKey);
    if (cached) return cached;

    const include: IncludeOptions[] = [
      {
        model: Organization,
        as: "organization",
        attributes: ["id", "name", "type"],
      },
    ];

    if (includeProfile) {
      include.push({
        model: UserProfile,
        as: "profile",
      });
    }

    if (includeSecurity) {
      include.push({
        model: UserSecurity,
        as: "security",
      });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      include,
    });

    if (user) {
      await this.setCache(cacheKey, user);
    }

    return user;
  }

  /**
   * Find active users by organization
   */
  public async findActiveByOrganization(
    organizationId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<User[]> {
    return this.findAll({
      where: {
        organizationId,
        status: UserStatus.ACTIVE,
        isActive: true,
      },
      include: [
        {
          model: UserProfile,
          as: "profile",
          attributes: ["firstName", "lastName", "title"],
        },
      ],
      order: [["lastName", "ASC"], ["firstName", "ASC"]],
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * Find users by role
   */
  public async findByRole(
    role: string,
    organizationId?: string
  ): Promise<User[]> {
    const whereClause: WhereOptions = { role };
    
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: UserProfile,
          as: "profile",
          attributes: ["firstName", "lastName", "title"],
        },
        {
          model: Organization,
          as: "organization",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  }

  /**
   * Search users with advanced criteria
   */
  public async searchUsers(
    criteria: UserSearchCriteria,
    pagination?: { page: number; limit: number }
  ): Promise<PaginationResult<User> | User[]> {
    const whereClause = this.buildUserSearchWhereClause(criteria);

    const options = {
      where: whereClause,
      include: [
        {
          model: UserProfile,
          as: "profile",
          attributes: ["firstName", "lastName", "title", "avatar"],
        },
        {
          model: Organization,
          as: "organization",
          attributes: ["id", "name", "type"],
        },
      ],
      order: criteria.order || [["updatedAt", "DESC"]],
      attributes: criteria.attributes,
    };

    if (pagination) {
      return this.findAndCountAll(options, pagination);
    } else {
      return this.findAll(options);
    }
  }

  /**
   * Find users requiring password change
   */
  public async findUsersRequiringPasswordChange(): Promise<User[]> {
    return User.findAll({
      include: [
        {
          model: UserSecurity,
          as: "security",
          where: {
            [Op.or]: [
              { requiresPasswordChange: true },
              { passwordExpiresAt: { [Op.lt]: new Date() } },
            ],
          },
        },
        {
          model: UserProfile,
          as: "profile",
          attributes: ["firstName", "lastName"],
        },
      ],
    });
  }

  /**
   * Find users with MFA enabled
   */
  public async findUsersWithMfa(organizationId?: string): Promise<User[]> {
    const whereClause: WhereOptions = {};
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    return User.findAll({
      where: whereClause,
      include: [
        {
          model: UserSecurity,
          as: "security",
          where: { mfaEnabled: true },
          attributes: ["mfaMethod", "mfaLastVerifiedAt"],
        },
        {
          model: UserProfile,
          as: "profile",
          attributes: ["firstName", "lastName"],
        },
      ],
    });
  }

  /**
   * Find recently active users
   */
  public async findRecentlyActive(
    days: number = 30,
    organizationId?: string
  ): Promise<User[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const whereClause: WhereOptions = {};
    
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    return User.findAll({
      where: whereClause,
      include: [
        {
          model: UserSecurity,
          as: "security",
          where: {
            lastLoginAt: { [Op.gte]: cutoffDate },
          },
          attributes: ["lastLoginAt", "lastLoginIp"],
        },
        {
          model: UserProfile,
          as: "profile",
          attributes: ["firstName", "lastName"],
        },
      ],
      order: [["security", "lastLoginAt", "DESC"]],
    });
  }

  /**
   * Get user statistics
   */
  public async getUserStatistics(organizationId?: string): Promise<UserStats> {
    const whereClause = organizationId ? { organizationId } : {};
    
    const [
      totalUsers,
      activeUsers,
      usersByRole,
      usersByOrganization,
      emailVerifiedUsers,
      mfaEnabledUsers,
      recentLogins,
      newUsersThisMonth,
    ] = await Promise.all([
      this.count(whereClause),
      this.count({ ...whereClause, status: UserStatus.ACTIVE, isActive: true }),
      User.findAll({
        where: whereClause,
        attributes: [
          "role",
          [User.sequelize?.fn("COUNT", "*"), "count"],
        ],
        group: ["role"],
        raw: true,
      }),
      organizationId ? Promise.resolve([]) : User.findAll({
        attributes: [
          "organizationId",
          [User.sequelize?.fn("COUNT", "*"), "count"],
        ],
        group: ["organizationId"],
        include: [
          {
            model: Organization,
            as: "organization",
            attributes: ["name"],
          },
        ],
      }),
      this.count({ ...whereClause, emailVerified: true }),
      User.count({
        where: whereClause,
        include: [
          {
            model: UserSecurity,
            as: "security",
            where: { mfaEnabled: true },
          },
        ],
      }),
      User.count({
        where: whereClause,
        include: [
          {
            model: UserSecurity,
            as: "security",
            where: {
              lastLoginAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
        ],
      }),
      this.count({
        ...whereClause,
        createdAt: { [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
    ]);

    // Process role statistics
    const byRole: Record<string, number> = {};
    usersByRole.forEach((item: any) => {
      byRole[item.role] = parseInt(item.count);
    });

    // Process organization statistics (only if not filtering by organization)
    const byOrganization: Record<string, number> = {};
    if (!organizationId) {
      usersByOrganization.forEach((item: any) => {
        const orgName = item.organization?.name || "Unknown";
        byOrganization[orgName] = parseInt((item as any).dataValues?.count || 0);
      });
    }

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole,
      byOrganization,
      emailVerified: emailVerifiedUsers,
      mfaEnabled: mfaEnabledUsers,
      recentLogins,
      newThisMonth: newUsersThisMonth,
    };
  }

  /**
   * Batch update user status
   */
  public async batchUpdateStatus(
    userIds: string[],
    status: UserStatus
  ): Promise<number> {
    return this.updateWhere(
      { id: { [Op.in]: userIds } },
      { status }
    );
  }

  /**
   * Find duplicate users by email
   */
  public async findDuplicateEmails(): Promise<Array<{ email: string; count: number; userIds: string[] }>> {
    const duplicates = await User.findAll({
      attributes: [
        "email",
        [User.sequelize?.fn("COUNT", "*"), "count"],
        [User.sequelize?.fn("ARRAY_AGG", User.sequelize?.col("id")), "userIds"],
      ],
      group: ["email"],
      having: User.sequelize?.where(
        User.sequelize?.fn("COUNT", "*"),
        Op.gt,
        1
      ),
      raw: true,
    });

    return duplicates.map((item: any) => ({
      email: item.email,
      count: parseInt(item.count),
      userIds: item.userIds,
    }));
  }

  /**
   * Get user activity summary
   */
  public async getUserActivitySummary(
    userId: string
  ): Promise<Record<string, any> | null> {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: UserProfile,
          as: "profile",
        },
        {
          model: UserSecurity,
          as: "security",
        },
      ],
    });

    if (!user) return null;

    const security = user.security;
    const profile = user.profile;

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        isActive: user.isActive,
      },
      profile: profile ? {
        name: profile.getFullName(),
        title: profile.title,
        department: profile.department,
        lastUpdated: profile.updatedAt,
      } : null,
      security: security ? {
        lastLogin: security.lastLoginAt,
        previousLogin: security.previousLoginAt,
        failedAttempts: security.failedLoginAttempts,
        isLocked: security.isAccountLocked(),
        mfaEnabled: security.mfaEnabled,
        passwordAge: security.passwordChangedAt ? 
          Math.floor((Date.now() - security.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24)) : null,
      } : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Private helper methods
   */

  private buildUserSearchWhereClause(criteria: UserSearchCriteria): WhereOptions {
    const whereClause: WhereOptions = {};

    if (criteria.organizationId) {
      whereClause.organizationId = criteria.organizationId;
    }

    if (criteria.role) {
      whereClause.role = criteria.role;
    }

    if (criteria.status) {
      whereClause.status = criteria.status;
    }

    if (criteria.isActive !== undefined) {
      whereClause.isActive = criteria.isActive;
    }

    if (criteria.emailVerified !== undefined) {
      whereClause.emailVerified = criteria.emailVerified;
    }

    if (criteria.createdAfter || criteria.createdBefore) {
      whereClause.createdAt = {};
      if (criteria.createdAfter) {
        whereClause.createdAt[Op.gte] = criteria.createdAfter;
      }
      if (criteria.createdBefore) {
        whereClause.createdAt[Op.lte] = criteria.createdBefore;
      }
    }

    if (criteria.search) {
      const searchPattern = `%${criteria.search}%`;
      whereClause[Op.or] = [
        { email: { [Op.iLike]: searchPattern } },
        { "$profile.firstName$": { [Op.iLike]: searchPattern } },
        { "$profile.lastName$": { [Op.iLike]: searchPattern } },
        { "$profile.title$": { [Op.iLike]: searchPattern } },
      ];
    }

    return whereClause;
  }
}

export default UserRepository;