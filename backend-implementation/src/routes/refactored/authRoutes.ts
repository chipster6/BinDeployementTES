/**
 * ============================================================================
 * REFACTORED AUTHENTICATION ROUTES
 * ============================================================================
 *
 * Clean Architecture route definitions for authentication endpoints.
 * Demonstrates separation of concerns with focused controllers.
 *
 * Features:
 * - Modular route organization
 * - Clear separation of authentication concerns
 * - Proper middleware application
 * - RESTful endpoint design
 *
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-24
 * Version: 2.0.0
 */

import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { AuthController, MfaController, ProfileController } from "@/controllers/refactored/AuthController";

const router = Router();

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * Public authentication endpoints
 */
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refreshToken);

/**
 * Authenticated user endpoints
 */
router.post("/logout", requireAuth, AuthController.logout);
router.post("/logout-all", requireAuth, AuthController.logoutAll);
router.put("/password", requireAuth, AuthController.changePassword);

// ============================================================================
// MULTI-FACTOR AUTHENTICATION ROUTES
// ============================================================================

/**
 * MFA management endpoints
 */
router.post("/mfa/setup", requireAuth, MfaController.setupMFA);
router.post("/mfa/verify", requireAuth, MfaController.verifyMFASetup);
router.delete("/mfa", requireAuth, MfaController.disableMFA);

// ============================================================================
// USER PROFILE ROUTES
// ============================================================================

/**
 * Profile management endpoints
 */
router.get("/profile", requireAuth, ProfileController.getProfile);
router.put("/profile", requireAuth, ProfileController.updateProfile);

/**
 * Session management endpoints
 */
router.get("/sessions", requireAuth, ProfileController.getSessions);
router.delete("/sessions/:sessionId", requireAuth, ProfileController.revokeSession);

export default router;