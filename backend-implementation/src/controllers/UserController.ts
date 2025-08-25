/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER CONTROLLER
 * ============================================================================
 *
 * Handles user management operations including CRUD, role management,
 * and administrative functions with proper authorization checks.
 *
 * Created by: Backend Recovery Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import type { Request, Response } from "express";
import { Op } from "sequelize";
import { User, UserModel, UserRole, UserStatus } from "@/models/User";
import { logger } from "@/utils/logger";
import { withTransaction } from "@/config/database";

/**
 * User query interface for filtering
 */
interface UserQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

/**
 * User Controller Class
 */
export class UserController {
  /**
   * Get all users with filtering and pagination
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;

      // Check permission
      if (!currentUser.canAccess("users", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view users",
        });
        return;
      }

      // Parse query parameters
      const {
        page = 1,
        limit = 25,
        role,
        status,
        search,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = req.query as any;

      const offset = (Number(page) - 1) * Number(limit);

      // Build where clause
      const whereClause: any = {
        deleted_at: null,
      };

      if (role && Object.values(UserRole).includes(role)) {
        whereClause.role = role;
      }

      if (status && Object.values(UserStatus).includes(status)) {
        whereClause.status = status;
      }

      if (search) {
        const searchPattern = `%${search}%`;
        whereClause[Op.or] = [
          { first_name: { [Op.iLike]: searchPattern } },
          { last_name: { [Op.iLike]: searchPattern } },
          { email: { [Op.iLike]: searchPattern } },
        ];
      }

      // Execute query
      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        limit: Number(limit),
        offset,
        order: [[sortBy, sortOrder]],
        attributes: { exclude: ["password_hash", "mfa_secret"] },
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / Number(limit));
      const hasNext = Number(page) < totalPages;
      const hasPrev = Number(page) > 1;

      res.status(200).json({
        success: true,
        data: {
          users: users.map((user) => user.toSafeJSON()),
          pagination: {
            currentPage: Number(page),
            totalPages,
            totalItems: count,
            itemsPerPage: Number(limit),
            hasNext,
            hasPrev,
          },
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Get users failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { id } = req.params;

      // Check permission (users can view their own profile)
      if (id !== currentUser.id && !currentUser.canAccess("users", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view user",
        });
        return;
      }

      const user = await User.findByPk(id, {
        attributes: { exclude: ["password_hash", "mfa_secret"] },
      });

      if (!user || user.deleted_at) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: user.toSafeJSON(),
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Get user by ID failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Create new user
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;

      // Check permission
      if (!currentUser.canAccess("users", "create")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to create users",
        });
        return;
      }

      // Validate request
      

      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        role,
        status = UserStatus.ACTIVE,
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: "User already exists with this email",
        });
        return;
      }

      // Role validation - non-super admins can't create super admins
      if (
        role === UserRole.SUPER_ADMIN &&
        currentUser.role !== UserRole.SUPER_ADMIN
      ) {
        res.status(403).json({
          success: false,
          message: "Cannot create super admin user",
        });
        return;
      }

      // Create user
      const user = await withTransaction(async (transaction) => {
        return await User.createWithPassword({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          phone,
          role,
          created_by: currentUser.id,
        });
      });

      // Set status if different from default
      if (status !== UserStatus.ACTIVE) {
        user.status = status;
        await user.save();
      }

      logger.info("User created successfully", {
        createdUserId: user.id,
        email: user.email,
        role: user.role,
        createdBy: currentUser.id,
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: {
          user: user.toSafeJSON(),
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Create user failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update user
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { id } = req.params;

      // Check permission (users can update their own profile with limited fields)
      const canUpdateAny = currentUser.canAccess("users", "update");
      const isOwnProfile = id === currentUser.id;

      if (!canUpdateAny && !isOwnProfile) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to update user",
        });
        return;
      }

      // Validate request
      

      const user = await User.findByPk(id);
      if (!user || user.deleted_at) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      const { firstName, lastName, phone, role, status } = req.body;

      // Update basic profile fields (allowed for own profile)
      if (firstName !== undefined) user.first_name = firstName;
      if (lastName !== undefined) user.last_name = lastName;
      if (phone !== undefined) user.phone = phone;

      // Role and status changes require admin permissions
      if (canUpdateAny && !isOwnProfile) {
        if (role !== undefined) {
          // Role validation - non-super admins can't assign super admin role
          if (
            role === UserRole.SUPER_ADMIN &&
            currentUser.role !== UserRole.SUPER_ADMIN
          ) {
            res.status(403).json({
              success: false,
              message: "Cannot assign super admin role",
            });
            return;
          }

          // Prevent removing super admin role (must be done by another super admin)
          if (
            user.role === UserRole.SUPER_ADMIN &&
            role !== UserRole.SUPER_ADMIN &&
            currentUser.role !== UserRole.SUPER_ADMIN
          ) {
            res.status(403).json({
              success: false,
              message: "Cannot remove super admin role",
            });
            return;
          }

          user.role = role;
        }

        if (status !== undefined) {
          user.status = status;
        }
      }

      user.updated_by = currentUser.id;
      await user.save();

      logger.info("User updated successfully", {
        updatedUserId: user.id,
        email: user.email,
        updatedBy: currentUser.id,
      });

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: {
          user: user.toSafeJSON(),
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Update user failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { id } = req.params;

      // Check permission
      if (!currentUser.canAccess("users", "delete")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to delete users",
        });
        return;
      }

      // Prevent self-deletion
      if (id === currentUser.id) {
        res.status(400).json({
          success: false,
          message: "Cannot delete your own account",
        });
        return;
      }

      const user = await User.findByPk(id);
      if (!user || user.deleted_at) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Prevent deleting super admins (unless current user is also super admin)
      if (
        user.role === UserRole.SUPER_ADMIN &&
        currentUser.role !== UserRole.SUPER_ADMIN
      ) {
        res.status(403).json({
          success: false,
          message: "Cannot delete super admin user",
        });
        return;
      }

      // Soft delete
      user.deleted_by = currentUser.id;
      await user.destroy(); // This triggers soft delete due to paranoid: true

      logger.info("User deleted successfully", {
        deletedUserId: user.id,
        email: user.email,
        deletedBy: currentUser.id,
      });

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Delete user failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { role } = req.params;

      // Check permission
      if (!currentUser.canAccess("users", "read")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to view users",
        });
        return;
      }

      // Validate role
      if (!Object.values(UserRole).includes(role as UserRole)) {
        res.status(400).json({
          success: false,
          message: "Invalid role specified",
        });
        return;
      }

      const users = await User.findByRole(role as UserRole);

      res.status(200).json({
        success: true,
        data: {
          users: users.map((user) => user.toSafeJSON()),
          role,
          count: users.length,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Get users by role failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Reset user password (admin function)
   */
  static async resetUserPassword(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { id } = req.params;

      // Check permission
      if (!currentUser.canAccess("users", "update")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to reset passwords",
        });
        return;
      }

      // Validate request
      

      const { newPassword } = req.body;

      const user = await User.findByPk(id);
      if (!user || user.deleted_at) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Prevent resetting super admin password (unless current user is also super admin)
      if (
        user.role === UserRole.SUPER_ADMIN &&
        currentUser.role !== UserRole.SUPER_ADMIN
      ) {
        res.status(403).json({
          success: false,
          message: "Cannot reset super admin password",
        });
        return;
      }

      // Reset password
      await user.setPassword(newPassword);
      user.updated_by = currentUser.id;
      await user.save();

      logger.info("User password reset", {
        userId: user.id,
        email: user.email,
        resetBy: currentUser.id,
      });

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Reset user password failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Lock/unlock user account
   */
  static async toggleUserLock(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = (req as any).user as UserModel;
      const { id } = req.params;
      const { action } = req.body; // 'lock' or 'unlock'

      // Check permission
      if (!currentUser.canAccess("users", "update")) {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to lock/unlock users",
        });
        return;
      }

      // Prevent self-lock
      if (id === currentUser.id) {
        res.status(400).json({
          success: false,
          message: "Cannot lock your own account",
        });
        return;
      }

      const user = await User.findByPk(id);
      if (!user || user.deleted_at) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Prevent locking super admins (unless current user is also super admin)
      if (
        user.role === UserRole.SUPER_ADMIN &&
        currentUser.role !== UserRole.SUPER_ADMIN
      ) {
        res.status(403).json({
          success: false,
          message: "Cannot lock super admin user",
        });
        return;
      }

      if (action === "lock") {
        await user.lockAccount();
        logger.info("User account locked", {
          userId: user.id,
          email: user.email,
          lockedBy: currentUser.id,
        });
      } else if (action === "unlock") {
        await user.unlockAccount();
        logger.info("User account unlocked", {
          userId: user.id,
          email: user.email,
          unlockedBy: currentUser.id,
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid action. Use "lock" or "unlock"',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `User account ${action}ed successfully`,
        data: {
          user: user.toSafeJSON(),
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error?.message : 'Unknown error';
      logger.error("Toggle user lock failed:", { error: errorMessage });
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default UserController;
