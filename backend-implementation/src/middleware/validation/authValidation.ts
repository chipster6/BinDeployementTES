/**
 * ============================================================================
 * AUTHENTICATION VALIDATION MIDDLEWARE
 * ============================================================================
 * 
 * Extracted validation rules for authentication endpoints.
 * Centralized validation logic for reusability and maintainability.
 * 
 * Features:
 * - Registration validation rules
 * - Login validation rules  
 * - Password change validation rules
 * - MFA validation rules
 * - Standardized error handling
 * 
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-24
 */

import { body, ValidationChain } from "express-validator";
import { UserRole } from "@/models/User";

/**
 * Registration validation middleware
 */
export const validateRegistration: ValidationChain[] = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email address required")
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),

  body("password")
    .isLength({ min: 12 })
    .withMessage("Password must be at least 12 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password confirmation does not match");
    }
    return true;
  }),

  body("firstName")
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage("First name is required and must not exceed 100 characters"),

  body("lastName")
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage("Last name is required and must not exceed 100 characters"),

  body("phone")
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Invalid phone number format"),

  body("role")
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage("Invalid user role"),

  body("gdprConsentGiven")
    .isBoolean()
    .withMessage("GDPR consent status must be specified"),
];

/**
 * Login validation middleware
 */
export const validateLogin: ValidationChain[] = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email address required"),

  body("password")
    .isLength({ min: 1 })
    .withMessage("Password is required"),

  body("mfaToken")
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("MFA token must be 6 digits"),

  body("rememberMe")
    .optional()
    .isBoolean()
    .withMessage("Remember me must be boolean"),
];

/**
 * Password change validation middleware
 */
export const validatePasswordChange: ValidationChain[] = [
  body("currentPassword")
    .isLength({ min: 1 })
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 12 })
    .withMessage("New password must be at least 12 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match");
    }
    return true;
  }),
];

/**
 * MFA token validation middleware
 */
export const validateMfaToken: ValidationChain[] = [
  body("token")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("Valid 6-digit MFA token required"),
];

/**
 * Session ID validation middleware
 */
export const validateSessionId: ValidationChain[] = [
  body("sessionId")
    .optional()
    .isUUID()
    .withMessage("Valid session ID required"),
];