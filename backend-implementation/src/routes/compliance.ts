/**
 * ============================================================================
 * SOC 2 COMPLIANCE & HSM MANAGEMENT API ROUTES
 * ============================================================================
 *
 * RESTful API endpoints for SOC 2 Type II compliance framework management
 * and Hardware Security Module (HSM) operations.
 *
 * Endpoints:
 * - GET /api/compliance/soc2/status - SOC 2 compliance status and readiness
 * - POST /api/compliance/soc2/initialize - Initialize compliance framework
 * - GET /api/compliance/soc2/controls - List all SOC 2 controls
 * - POST /api/compliance/soc2/controls/test - Execute control testing
 * - GET /api/compliance/soc2/report - Generate compliance readiness report
 * - GET /api/hsm/status - HSM cluster health and status
 * - POST /api/hsm/keys - Generate new HSM key
 * - POST /api/hsm/keys/:keyId/rotate - Rotate HSM key
 * - POST /api/hsm/encrypt - Encrypt data with HSM
 * - POST /api/hsm/decrypt - Decrypt data with HSM
 *
 * Security: Admin-only access with comprehensive audit logging
 * Compliance: SOC 2 Type II evidence collection
 *
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-22
 * Version: 1.0.0
 */

import express from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticateToken, adminOnly } from "@/middleware/auth";
import { validateRequest } from "@/middleware/validation";
import { rateLimiter } from "@/middleware/rateLimit";
import { ResponseHelper } from "@/utils/ResponseHelper";
import { logger, logAuditEvent, logSecurityEvent } from "@/utils/logger";
import SOC2ComplianceService from "@/services/compliance/SOC2ComplianceService";
import HSMKeyManagementService from "@/services/security/HSMKeyManagementService";
import Joi from "joi";

const router = express.Router();

// Initialize services
const soc2Service = new SOC2ComplianceService();
const hsmService = new HSMKeyManagementService();

// Rate limiting for compliance endpoints
const complianceRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: "Too many compliance requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for HSM endpoints (more restrictive)
const hsmRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: "Too many HSM requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false
});

// Validation schemas
const keyGenerationSchema = Joi.object({
  keyLabel: Joi.string().min(3).max(100).required()
    .pattern(/^[a-zA-Z0-9\-_]+$/)
    .description('Key label (alphanumeric, hyphens, underscores only)'),
  keyType: Joi.string().valid('AES-256', 'RSA-2048', 'RSA-3072', 'RSA-4096', 'ECC-P256', 'ECC-P384', 'ECC-P521').required(),
  usage: Joi.string().valid('encrypt_decrypt', 'sign_verify', 'jwt_signing', 'database_encryption', 'api_encryption', 'session_encryption', 'mfa_encryption').required(),
  rotationSchedule: Joi.string().valid('monthly', 'quarterly', 'semi_annual', 'annual', 'on_demand').default('quarterly')
});

const encryptionSchema = Joi.object({
  data: Joi.string().min(1).max(10000).required().description('Data to encrypt (max 10KB)'),
  keyId: Joi.string().uuid().required().description('HSM key ID for encryption'),
  additionalContext: Joi.object().optional().description('Additional encryption context')
});

const decryptionSchema = Joi.object({
  ciphertext: Joi.string().min(1).required().description('Encrypted data to decrypt'),
  keyId: Joi.string().uuid().required().description('HSM key ID for decryption'),
  keyVersion: Joi.number().integer().min(1).optional().description('Specific key version'),
  additionalContext: Joi.object().optional().description('Additional decryption context')
});

const controlTestSchema = Joi.object({
  controlId: Joi.string().optional().description('Specific control ID to test (optional - tests all if not provided)')
});

/**
 * Middleware for SOC 2 compliance audit logging
 */
const auditComplianceAccess = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    logAuditEvent({
      userId: user?.id,
      action: `soc2_${action}`,
      resourceType: 'compliance_framework',
      resourceId: req.params?.controlId || 'all',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      additionalData: {
        endpoint: req.path,
        method: req.method,
        query: req.query,
        timestamp: new Date().toISOString()
      }
    });
    
    next();
  };
};

/**
 * Middleware for HSM operation audit logging
 */
const auditHSMAccess = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    logSecurityEvent(`hsm_${operation}`, {
      userId: user?.id,
      keyId: req.params?.keyId || req.body.keyId,
      operation,
      endpoint: req.path,
      timestamp: new Date().toISOString()
    }, user?.id, req.ip, 'medium');
    
    next();
  };
};

// ============================================================================
// SOC 2 COMPLIANCE ENDPOINTS
// ============================================================================

/**
 * GET /api/compliance/soc2/status
 * Get SOC 2 compliance framework status
 */
router.get('/soc2/status',
  authenticateToken,
  adminOnly,
  complianceRateLimit,
  auditComplianceAccess('status_check'),
  async (req: Request, res: Response) => {
    try {
      const result = await soc2Service.generateSOC2ReadinessReport();
      
      if (result.isSuccess) {
        logger.info('SOC 2 status retrieved', {
          userId: (req as any).user?.id,
          readiness: result.data!.overallReadiness
        });
        
        ResponseHelper.success(res, result.data!, 'SOC 2 compliance status retrieved successfully');
      } else {
        ResponseHelper.error(res, result.error!, result.statusCode);
      }
    } catch (error: unknown) {
      logger.error('SOC 2 status retrieval failed', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error?.message : 'Unknown error'
      });
      
      ResponseHelper.error(res, req, { message: 'Failed to retrieve compliance status', statusCode: 500 });
    }
  }
);

/**
 * POST /api/compliance/soc2/initialize
 * Initialize SOC 2 compliance framework
 */
router.post('/soc2/initialize',
  authenticateToken,
  adminOnly,
  complianceRateLimit,
  auditComplianceAccess('framework_initialize'),
  async (req: Request, res: Response) => {
    try {
      const result = await soc2Service.initializeComplianceFramework();
      
      if (result.isSuccess) {
        logger.info('SOC 2 framework initialized', {
          userId: (req as any).user?.id,
          controlsCreated: result.data!.controlsCreated,
          policiesGenerated: result.data!.policiesGenerated
        });
        
        ResponseHelper.success(res, result.data!, 'SOC 2 compliance framework initialized successfully', 201);
      } else {
        ResponseHelper.error(res, result.error!, result.statusCode);
      }
    } catch (error: unknown) {
      logger.error('SOC 2 framework initialization failed', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error?.message : 'Unknown error'
      });
      
      ResponseHelper.error(res, req, { message: 'Failed to initialize compliance framework', statusCode: 500 });
    }
  }
);

/**
 * POST /api/compliance/soc2/controls/test
 * Execute SOC 2 control testing
 */
router.post('/soc2/controls/test',
  authenticateToken,
  adminOnly,
  complianceRateLimit,
  validateRequest(controlTestSchema, 'body'),
  auditComplianceAccess('control_testing'),
  async (req: Request, res: Response) => {
    try {
      const { controlId } = req.body;
      const result = await soc2Service.executeControlTesting(controlId);
      
      if (result.isSuccess) {
        logger.info('SOC 2 control testing completed', {
          userId: (req as any).user?.id,
          controlId,
          testsExecuted: result.data!.testsExecuted,
          passedTests: result.data!.passedTests,
          failedTests: result.data!.failedTests
        });
        
        ResponseHelper.success(res, result.data!, 'Control testing completed successfully');
      } else {
        ResponseHelper.error(res, result.error!, result.statusCode);
      }
    } catch (error: unknown) {
      logger.error('SOC 2 control testing failed', {
        userId: (req as any).user?.id,
        controlId: req.body.controlId,
        error: error instanceof Error ? error?.message : 'Unknown error'
      });
      
      ResponseHelper.error(res, req, { message: 'Control testing failed', statusCode: 500 });
    }
  }
);

/**
 * GET /api/compliance/soc2/report
 * Generate comprehensive SOC 2 compliance readiness report
 */
router.get('/soc2/report',
  authenticateToken,
  adminOnly,
  complianceRateLimit,
  auditComplianceAccess('report_generation'),
  async (req: Request, res: Response) => {
    try {
      const result = await soc2Service.generateSOC2ReadinessReport();
      
      if (result.isSuccess) {
        logger.info('SOC 2 readiness report generated', {
          userId: (req as any).user?.id,
          overallReadiness: result.data!.overallReadiness,
          controlsEffective: result.data!.controlsEffective,
          controlsTotal: result.data!.controlsTotal
        });
        
        // Set appropriate headers for report download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="soc2-readiness-report-${new Date().toISOString().split('T')[0]}.json"`);
        
        ResponseHelper.success(res, result.data!, 'SOC 2 readiness report generated successfully');
      } else {
        ResponseHelper.error(res, result.error!, result.statusCode);
      }
    } catch (error: unknown) {
      logger.error('SOC 2 report generation failed', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error?.message : 'Unknown error'
      });
      
      ResponseHelper.error(res, req, { message: 'Failed to generate compliance report', statusCode: 500 });
    }
  }
);

// ============================================================================
// HSM KEY MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/hsm/status
 * Get HSM cluster health and status
 */
router.get('/hsm/status',
  authenticateToken,
  adminOnly,
  hsmRateLimit,
  auditHSMAccess('status_check'),
  async (req: Request, res: Response) => {
    try {
      const result = await hsmService.getHSMHealthStatus();
      
      if (result.isSuccess) {
        logger.info('HSM status retrieved', {
          userId: (req as any).user?.id,
          overallHealth: result.data!.overallHealth,
          activeKeys: result.data!.activeKeys
        });
        
        ResponseHelper.success(res, result.data!, 'HSM status retrieved successfully');
      } else {
        ResponseHelper.error(res, result.error!, result.statusCode);
      }
    } catch (error: unknown) {
      logger.error('HSM status retrieval failed', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error?.message : 'Unknown error'
      });
      
      ResponseHelper.error(res, req, { message: 'Failed to retrieve HSM status', statusCode: 500 });
    }
  }
);

/**
 * POST /api/hsm/initialize
 * Initialize HSM infrastructure
 */
router.post('/hsm/initialize',
  authenticateToken,
  adminOnly,
  hsmRateLimit,
  auditHSMAccess('infrastructure_initialize'),
  async (req: Request, res: Response) => {
    try {
      const result = await hsmService.initializeHSMInfrastructure();
      
      if (result.isSuccess) {
        logger.info('HSM infrastructure initialized', {
          userId: (req as any).user?.id,
          clustersCreated: result.data!.clustersCreated,
          keysGenerated: result.data!.keysGenerated
        });
        
        ResponseHelper.success(res, result.data!, 'HSM infrastructure initialized successfully', 201);
      } else {
        ResponseHelper.error(res, result.error!, result.statusCode);
      }
    } catch (error: unknown) {
      logger.error('HSM infrastructure initialization failed', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error?.message : 'Unknown error'
      });
      
      ResponseHelper.error(res, req, { message: 'Failed to initialize HSM infrastructure', statusCode: 500 });
    }
  }
);

/**
 * POST /api/hsm/keys
 * Generate new HSM-backed cryptographic key
 */
router.post('/hsm/keys',
  authenticateToken,
  adminOnly,
  hsmRateLimit,
  validateRequest(keyGenerationSchema, 'body'),
  auditHSMAccess('key_generation'),
  async (req: Request, res: Response) => {
    try {
      const { keyLabel, keyType, usage, rotationSchedule } = req.body;
      
      const result = await hsmService.generateHSMKey(keyLabel, keyType, usage, rotationSchedule);
      
      if (result.isSuccess) {
        logger.info('HSM key generated', {
          userId: (req as any).user?.id,
          keyId: result.data!.keyId,
          keyLabel,
          keyType,
          usage
        });
        
        // Remove sensitive information from response
        const sanitizedResponse = {
          keyId: result.data!.keyId,
          keyLabel: result.data!.keyLabel,
          keyType: result.data!.keyType,
          usage: result.data!.usage,
          createdAt: result.data!.createdAt,
          nextRotation: result.data!.nextRotation,
          complianceLevel: result.data!.complianceLevel
        };
        
        ResponseHelper.success(res, sanitizedResponse, 'HSM key generated successfully', 201);
      } else {
        ResponseHelper.error(res, result.error!, result.statusCode);
      }
    } catch (error: unknown) {
      logger.error('HSM key generation failed', {
        userId: (req as any).user?.id,
        keyLabel: req.body.keyLabel,
        error: error instanceof Error ? error?.message : 'Unknown error'
      });
      
      ResponseHelper.error(res, req, { message: 'Key generation failed', statusCode: 500 });
    }
  }
);

/**
 * POST /api/hsm/keys/:keyId/rotate
 * Rotate HSM key
 */
router.post('/hsm/keys/:keyId/rotate',
  authenticateToken,
  adminOnly,
  hsmRateLimit,
  auditHSMAccess('key_rotation'),
  async (req: Request, res: Response) => {
    try {
      const { keyId } = req.params;
      
      // Validate keyId format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(keyId)) {
        return ResponseHelper.error(res, req, { message: 'Invalid key ID format', statusCode: 400 });
      }
      
      const result = await hsmService.rotateHSMKey(keyId);
      
      if (result.isSuccess) {
        logger.info('HSM key rotated', {
          userId: (req as any).user?.id,
          oldKeyId: keyId,
          newKeyId: result.data!.newKeyId,
          newVersion: result.data!.newKeyVersion
        });
        
        ResponseHelper.success(res, result.data!, 'HSM key rotated successfully');
      } else {
        ResponseHelper.error(res, result.error!, result.statusCode);
      }
    } catch (error: unknown) {
      logger.error('HSM key rotation failed', {
        userId: (req as any).user?.id,
        keyId: req.params.keyId,
        error: error instanceof Error ? error?.message : 'Unknown error'
      });
      
      ResponseHelper.error(res, req, { message: 'Key rotation failed', statusCode: 500 });
    }
  }
);

/**
 * POST /api/hsm/encrypt
 * Encrypt data using HSM-backed key
 */
router.post('/hsm/encrypt',
  authenticateToken,
  adminOnly,
  hsmRateLimit,
  validateRequest(encryptionSchema, 'body'),
  auditHSMAccess('encrypt'),
  async (req: Request, res: Response) => {
    try {
      const { data, keyId, additionalContext } = req.body;
      
      const result = await hsmService.encryptWithHSM(data, keyId, additionalContext);
      
      if (result.isSuccess) {
        logger.info('HSM encryption completed', {
          userId: (req as any).user?.id,
          keyId,
          keyVersion: result.data!.keyVersion,
          algorithm: result.data!.algorithm
        });
        
        ResponseHelper.success(res, result.data!, 'Data encrypted successfully');
      } else {
        ResponseHelper.error(res, result.error!, result.statusCode);
      }
    } catch (error: unknown) {
      logger.error('HSM encryption failed', {
        userId: (req as any).user?.id,
        keyId: req.body.keyId,
        error: error instanceof Error ? error?.message : 'Unknown error'
      });
      
      ResponseHelper.error(res, req, { message: 'Encryption failed', statusCode: 500 });
    }
  }
);

/**
 * POST /api/hsm/decrypt
 * Decrypt data using HSM-backed key
 */
router.post('/hsm/decrypt',
  authenticateToken,
  adminOnly,
  hsmRateLimit,
  validateRequest(decryptionSchema, 'body'),
  auditHSMAccess('decrypt'),
  async (req: Request, res: Response) => {
    try {
      const { ciphertext, keyId, keyVersion, additionalContext } = req.body;
      
      const result = await hsmService.decryptWithHSM(ciphertext, keyId, keyVersion, additionalContext);
      
      if (result.isSuccess) {
        logger.info('HSM decryption completed', {
          userId: (req as any).user?.id,
          keyId,
          keyVersion
        });
        
        ResponseHelper.success(res, result.data!, 'Data decrypted successfully');
      } else {
        ResponseHelper.error(res, result.error!, result.statusCode);
      }
    } catch (error: unknown) {
      logger.error('HSM decryption failed', {
        userId: (req as any).user?.id,
        keyId: req.body.keyId,
        error: error instanceof Error ? error?.message : 'Unknown error'
      });
      
      ResponseHelper.error(res, req, { message: 'Decryption failed', statusCode: 500 });
    }
  }
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Global error handler for compliance routes
 */
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Compliance API error', {
    error: error instanceof Error ? error?.message : String(error),
    stack: error instanceof Error ? error?.stack : undefined,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id
  });
  
  if (error.name === 'ValidationError') {
    return ResponseHelper.error(res, req, { message: error instanceof Error ? error?.message : String(error), statusCode: 400 });
  }
  
  ResponseHelper.error(res, req, { message: 'Internal server error', statusCode: 500 });
});

export default router;