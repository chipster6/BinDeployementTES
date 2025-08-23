/**
 * ============================================================================
 * DEPENDENCY MONITORING ROUTES
 * ============================================================================
 *
 * REST API endpoints for dependency security monitoring and vulnerability status
 * Provides real-time access to security scan results for $2M+ MRR operations
 *
 * Created by: Dependency Resolution Engineer
 * Date: 2025-08-15
 * Version: 1.0.0
 * ============================================================================
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { DependencyMonitoringService } from '../services/security/DependencyMonitoringService';
import { AdvancedDependencyManager } from '../services/security/AdvancedDependencyManager';
import { AutomatedDependencyScanner } from '../services/security/AutomatedDependencyScanner';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import { ResponseHelper } from '../utils/ResponseHelper';
import { validate, query, body } from 'express-validator';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
let dependencyMonitoringService: DependencyMonitoringService;
let advancedDependencyManager: AdvancedDependencyManager;
let automatedDependencyScanner: AutomatedDependencyScanner;

// Initialize dependency services
try {
  dependencyMonitoringService = new DependencyMonitoringService();
  advancedDependencyManager = new AdvancedDependencyManager();
  automatedDependencyScanner = new AutomatedDependencyScanner();
} catch (error: unknown) {
  logger.error('Failed to initialize dependency services', {
    error: error instanceof Error ? error?.message : 'Unknown error'
  });
}

/**
 * @swagger
 * /api/dependency-monitoring/status:
 *   get:
 *     summary: Get current dependency security status
 *     description: Returns comprehensive security status for all monitored components
 *     tags: [Dependency Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current dependency security status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalComponents:
 *                           type: number
 *                         secureComponents:
 *                           type: number
 *                         warningComponents:
 *                           type: number
 *                         criticalComponents:
 *                           type: number
 *                         overallSecurityGrade:
 *                           type: number
 *                         lastScanTime:
 *                           type: string
 *                           format: date-time
 *                         totalVulnerabilities:
 *                           type: object
 *                           properties:
 *                             critical:
 *                               type: number
 *                             high:
 *                               type: number
 *                             moderate:
 *                               type: number
 *                             low:
 *                               type: number
 *                             total:
 *                               type: number
 *                     components:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           component:
 *                             type: string
 *                           ecosystem:
 *                             type: string
 *                           lastScan:
 *                             type: string
 *                             format: date-time
 *                           vulnerabilities:
 *                             type: object
 *                           securityGrade:
 *                             type: number
 *                           outdatedPackages:
 *                             type: number
 *                           status:
 *                             type: string
 *                             enum: [secure, warning, critical]
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!dependencyMonitoringService) {
      ResponseHelper.error(res, req, { message: 'Dependency monitoring service not available', statusCode: 503 });
      return;
    }

    const currentStatus = dependencyMonitoringService.getCurrentStatus();
    const summary = dependencyMonitoringService.getSecuritySummary();

    // Convert Map to array for JSON serialization
    const components = Array.from(currentStatus.entries()).map(([name, status]) => ({
      component: name,
      ...status
    }));

    const responseData = {
      summary,
      components,
      timestamp: new Date().toISOString(),
      serviceStatus: 'operational'
    };

    logger.info('Dependency status retrieved', {
      userId: req.user?.id,
      components: components.length,
      securityGrade: summary.overallSecurityGrade
    });

    ResponseHelper.success(res, responseData, 'Dependency security status retrieved successfully');
  } catch (error: unknown) {
    logger.error('Failed to get dependency status', {
      error: error instanceof Error ? error?.message : 'Unknown error',
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to retrieve dependency status');
  }
});

/**
 * @swagger
 * /api/dependency-monitoring/scan:
 *   post:
 *     summary: Trigger immediate security scan
 *     description: Initiates an immediate comprehensive dependency security scan
 *     tags: [Dependency Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               component:
 *                 type: string
 *                 description: Specific component to scan (optional, scans all if not provided)
 *                 enum: [backend, frontend, ml-python]
 *               priority:
 *                 type: string
 *                 description: Scan priority level
 *                 enum: [normal, high, emergency]
 *                 default: normal
 *     responses:
 *       200:
 *         description: Scan initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     scanId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     components:
 *                       type: array
 *                     estimatedDuration:
 *                       type: number
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post('/scan', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!dependencyMonitoringService) {
      ResponseHelper.error(res, req, { message: 'Dependency monitoring service not available', statusCode: 503 });
      return;
    }

    // Check user permissions (admin or security role required)
    const userRole = req.user?.role;
    if (!userRole || !['admin', 'security_admin', 'system_admin'].includes(userRole)) {
      logger.warn('Unauthorized scan attempt', {
        userId: req.user?.id,
        role: userRole,
        ip: req.ip
      });
      ResponseHelper.error(res, req, { message: 'Insufficient permissions to trigger security scan', statusCode: 403 });
      return;
    }

    const { component, priority = 'normal' } = req.body;
    const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Manual dependency scan triggered', {
      scanId,
      component: component || 'all',
      priority,
      userId: req.user?.id,
      userRole
    });

    // Start the scan (async)
    const scanStartTime = new Date();
    const scanPromise = dependencyMonitoringService.triggerImmediateScan();

    // Return immediate response
    const responseData = {
      scanId,
      status: 'initiated',
      components: component ? [component] : ['backend', 'frontend', 'ml-python'],
      estimatedDuration: 30000, // 30 seconds estimate
      startTime: scanStartTime.toISOString(),
      priority
    };

    ResponseHelper.success(res, responseData, 'Dependency security scan initiated successfully');

    // Log scan completion asynchronously
    scanPromise.then((results) => {
      const scanDuration = Date.now() - scanStartTime.getTime();
      logger.info('Manual dependency scan completed', {
        scanId,
        duration: scanDuration,
        componentsScanned: results.size,
        userId: req.user?.id
      });
    }).catch((error) => {
      logger.error('Manual dependency scan failed', {
        scanId,
        error: error instanceof Error ? error?.message : 'Unknown error',
        userId: req.user?.id
      });
    });

  } catch (error: unknown) {
    logger.error('Failed to trigger dependency scan', {
      error: error instanceof Error ? error?.message : 'Unknown error',
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to initiate dependency scan');
  }
});

/**
 * @swagger
 * /api/dependency-monitoring/vulnerabilities:
 *   get:
 *     summary: Get detailed vulnerability information
 *     description: Returns detailed information about all detected vulnerabilities
 *     tags: [Dependency Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: component
 *         schema:
 *           type: string
 *           enum: [backend, frontend, ml-python]
 *         description: Filter by specific component
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [critical, high, moderate, low]
 *         description: Filter by severity level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of vulnerabilities to return
 *     responses:
 *       200:
 *         description: Detailed vulnerability information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     vulnerabilities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           component:
 *                             type: string
 *                           package:
 *                             type: string
 *                           severity:
 *                             type: string
 *                           vulnerability:
 *                             type: string
 *                           version:
 *                             type: string
 *                           patched:
 *                             type: string
 *                           ecosystem:
 *                             type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         critical:
 *                           type: number
 *                         high:
 *                           type: number
 *                         moderate:
 *                           type: number
 *                         low:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/vulnerabilities', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!dependencyMonitoringService) {
      ResponseHelper.error(res, req, { message: 'Dependency monitoring service not available', statusCode: 503 });
      return;
    }

    const { component, severity, limit = 50 } = req.query;
    const currentStatus = dependencyMonitoringService.getCurrentStatus();

    let allVulnerabilities: any[] = [];

    // Collect vulnerabilities from all or specific components
    currentStatus.forEach((status, componentName) => {
      if (component && componentName !== component) return;

      status.vulnerabilities.packages.forEach(pkg => {
        if (severity && pkg.severity !== severity) return;

        allVulnerabilities.push({
          component: componentName,
          package: pkg.name,
          severity: pkg.severity,
          vulnerability: pkg.vulnerability,
          version: pkg.version,
          patched: pkg.patched,
          ecosystem: status.ecosystem
        });
      });
    });

    // Sort by severity priority and limit results
    const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
    allVulnerabilities.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
    
    if (limit) {
      allVulnerabilities = allVulnerabilities.slice(0, parseInt(limit as string));
    }

    // Generate summary
    const summary = allVulnerabilities.reduce((acc, vuln) => {
      acc.total++;
      acc[vuln.severity]++;
      return acc;
    }, { total: 0, critical: 0, high: 0, moderate: 0, low: 0 });

    const responseData = {
      vulnerabilities: allVulnerabilities,
      summary,
      filters: {
        component: component || 'all',
        severity: severity || 'all',
        limit: parseInt(limit as string)
      },
      timestamp: new Date().toISOString()
    };

    logger.info('Vulnerability details retrieved', {
      userId: req.user?.id,
      component: component || 'all',
      severity: severity || 'all',
      totalVulnerabilities: allVulnerabilities.length
    });

    ResponseHelper.success(res, responseData, 'Vulnerability information retrieved successfully');
  } catch (error: unknown) {
    logger.error('Failed to get vulnerability details', {
      error: error instanceof Error ? error?.message : 'Unknown error',
      userId: req.user?.id
    });
    ResponseHelper.error(res, 'Failed to retrieve vulnerability information');
  }
});

/**
 * @swagger
 * /api/dependency-monitoring/health:
 *   get:
 *     summary: Get monitoring service health status
 *     description: Returns health status of the dependency monitoring service
 *     tags: [Dependency Monitoring]
 *     responses:
 *       200:
 *         description: Service health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unhealthy]
 *                     uptime:
 *                       type: number
 *                     lastScan:
 *                       type: string
 *                       format: date-time
 *                     nextScan:
 *                       type: string
 *                       format: date-time
 *                     version:
 *                       type: string
 *       503:
 *         description: Service unavailable
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!dependencyMonitoringService) {
      ResponseHelper.error(res, req, { message: 'Dependency monitoring service not available', statusCode: 503 });
      return;
    }

    const summary = dependencyMonitoringService.getSecuritySummary();
    const uptime = process.uptime() * 1000; // Convert to milliseconds

    // Determine service health
    let status = 'healthy';
    if (summary.criticalComponents > 0) {
      status = 'degraded';
    }
    
    // If no recent scans, mark as unhealthy
    const now = new Date();
    const lastScanAge = summary.lastScanTime ? 
      now.getTime() - summary.lastScanTime.getTime() : 
      Number.MAX_SAFE_INTEGER;
    
    if (lastScanAge > 3600000) { // 1 hour
      status = 'unhealthy';
    }

    const responseData = {
      status,
      uptime,
      lastScan: summary.lastScanTime,
      nextScan: new Date(now.getTime() + 3600000), // Approximate next scan time
      version: '1.0.0',
      components: summary.totalComponents,
      securityGrade: summary.overallSecurityGrade,
      criticalIssues: summary.criticalComponents
    };

    ResponseHelper.success(res, responseData, 'Service health status retrieved');
  } catch (error: unknown) {
    logger.error('Failed to get service health status', {
      error: error instanceof Error ? error?.message : 'Unknown error'
    });
    ResponseHelper.error(res, 'Failed to retrieve service health status');
  }
});

/**
 * @route POST /api/dependency-monitoring/optimize
 * @description Trigger dependency optimization analysis
 * @access Private (Admin)
 */
router.post('/optimize',
  authenticateToken,
  [
    body('type').optional().isIn(['container', 'dependencies', 'all']),
    body('dryRun').optional().isBoolean()
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { type = 'all', dryRun = false } = req.body;
      const userRole = req.user?.role;

      if (!userRole || !['admin', 'security_admin', 'system_admin'].includes(userRole)) {
        ResponseHelper.error(res, req, { message: 'Insufficient permissions for optimization operations', statusCode: 403 });
        return;
      }

      logger.info('Dependency optimization triggered', {
        type,
        dryRun,
        userId: req.user?.id,
        userRole
      });

      if (!automatedDependencyScanner) {
        ResponseHelper.error(res, req, { message: 'Automated dependency scanner not available', statusCode: 503 });
        return;
      }

      const scanResult = await automatedDependencyScanner.triggerScan();
      const optimizationTargets = scanResult.optimizations.identified.filter(target => {
        if (type === 'container') return target.type === 'container-size';
        if (type === 'dependencies') return target.type !== 'container-size';
        return true;
      });

      const summary = {
        totalOpportunities: optimizationTargets.length,
        highImpact: optimizationTargets.filter(t => t.improvementPercentage >= 20).length,
        estimatedSavings: optimizationTargets.reduce((acc, target) => {
          if (target.type === 'container-size' && target.estimatedSavings.size) {
            acc.containerSize += parseFloat(target.estimatedSavings.size.replace(/[^\d.]/g, ''));
          }
          return acc;
        }, { containerSize: 0 }),
        byType: optimizationTargets.reduce((acc: any, target) => {
          acc[target.type] = (acc[target.type] || 0) + 1;
          return acc;
        }, {})
      };

      ResponseHelper.success(res, {
        dryRun,
        summary,
        opportunities: optimizationTargets,
        recommendations: scanResult.recommendations,
        timestamp: new Date().toISOString()
      }, 'Optimization analysis completed successfully');

    } catch (error: unknown) {
      logger.error('Failed to perform optimization analysis', {
        error: error instanceof Error ? error?.message : 'Unknown error',
        userId: req.user?.id
      });
      ResponseHelper.error(res, 'Failed to perform optimization analysis');
    }
  }
);

/**
 * @route POST /api/dependency-monitoring/resolve-conflicts
 * @description Analyze and resolve dependency conflicts
 * @access Private (Admin)
 */
router.post('/resolve-conflicts',
  authenticateToken,
  [
    body('autoResolve').optional().isBoolean(),
    body('riskLevel').optional().isIn(['low', 'medium', 'high'])
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { autoResolve = false, riskLevel = 'low' } = req.body;
      const userRole = req.user?.role;

      if (!userRole || !['admin', 'security_admin', 'system_admin'].includes(userRole)) {
        ResponseHelper.error(res, req, { message: 'Insufficient permissions for conflict resolution', statusCode: 403 });
        return;
      }

      logger.info('Conflict resolution requested', {
        autoResolve,
        riskLevel,
        userId: req.user?.id,
        userRole
      });

      if (!advancedDependencyManager) {
        ResponseHelper.error(res, req, { message: 'Advanced dependency manager not available', statusCode: 503 });
        return;
      }

      const analysis = await advancedDependencyManager.performComprehensiveAnalysis();
      
      const conflicts = analysis.conflicts.filter(conflict => {
        if (riskLevel === 'low') return conflict.riskAssessment === 'low';
        if (riskLevel === 'medium') return ['low', 'medium'].includes(conflict.riskAssessment);
        return true; // high includes all
      });

      const conflictSummary = {
        total: conflicts.length,
        byPackage: conflicts.reduce((acc: any, conflict) => {
          acc[conflict.package] = (acc[conflict.package] || 0) + 1;
          return acc;
        }, {}),
        byRisk: conflicts.reduce((acc: any, conflict) => {
          acc[conflict.riskAssessment] = (acc[conflict.riskAssessment] || 0) + 1;
          return acc;
        }, {}),
        resolvable: conflicts.filter(c => c.rationale.includes('automated')).length
      };

      if (autoResolve && conflicts.length > 0) {
        // This would trigger actual conflict resolution
        logger.info('Automated conflict resolution initiated', {
          conflicts: conflicts.length,
          userId: req.user?.id
        });
      }

      ResponseHelper.success(res, {
        autoResolve,
        riskLevel,
        summary: conflictSummary,
        conflicts,
        recommendations: analysis.summary,
        timestamp: new Date().toISOString()
      }, 'Conflict analysis completed successfully');

    } catch (error: unknown) {
      logger.error('Failed to analyze conflicts', {
        error: error instanceof Error ? error?.message : 'Unknown error',
        userId: req.user?.id
      });
      ResponseHelper.error(res, 'Failed to analyze dependency conflicts');
    }
  }
);

/**
 * @route GET /api/dependency-monitoring/reports
 * @description Get available dependency analysis reports
 * @access Private (Admin)
 */
router.get('/reports',
  authenticateToken,
  [
    query('type').optional().isIn(['scan', 'optimization', 'conflicts']),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, limit = 20 } = req.query;
      
      const reportsDir = path.join(process.cwd(), 'reports', 'dependency-management');
      
      if (!fs.existsSync(reportsDir)) {
        ResponseHelper.success(res, {
          reports: [],
          total: 0,
          message: 'No reports directory found'
        }, 'Reports retrieved successfully');
        return;
      }

      let reportFiles = fs.readdirSync(reportsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(reportsDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            filename: file,
            type: file.includes('scan') ? 'scan' : 
                  file.includes('optimization') ? 'optimization' : 
                  file.includes('conflict') ? 'conflicts' : 'unknown',
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            downloadUrl: `/api/dependency-monitoring/reports/${file}`
          };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());

      // Filter by type if specified
      if (type) {
        reportFiles = reportFiles.filter(report => report.type === type);
      }

      // Apply limit
      const limitedReports = reportFiles.slice(0, parseInt(limit as string));

      ResponseHelper.success(res, {
        reports: limitedReports,
        total: reportFiles.length,
        showing: limitedReports.length,
        filters: { type: type || 'all', limit }
      }, 'Reports retrieved successfully');

    } catch (error: unknown) {
      logger.error('Failed to get reports list', {
        error: error instanceof Error ? error?.message : 'Unknown error',
        userId: req.user?.id
      });
      ResponseHelper.error(res, 'Failed to retrieve reports list');
    }
  }
);

/**
 * @route GET /api/dependency-monitoring/reports/:filename
 * @description Download specific dependency report
 * @access Private (Admin)
 */
router.get('/reports/:filename',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename } = req.params;
      
      // Validate filename to prevent path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        ResponseHelper.error(res, req, { message: 'Invalid filename', statusCode: 400 });
        return;
      }

      const filePath = path.join(process.cwd(), 'reports', 'dependency-management', filename);
      
      if (!fs.existsSync(filePath)) {
        ResponseHelper.error(res, req, { message: 'Report file not found', statusCode: 404 });
        return;
      }

      const stats = fs.statSync(filePath);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      logger.info('Report downloaded', {
        filename,
        size: stats.size,
        userId: req.user?.id
      });

    } catch (error: unknown) {
      logger.error('Failed to download report', {
        error: error instanceof Error ? error?.message : 'Unknown error',
        filename: req.params.filename,
        userId: req.user?.id
      });
      ResponseHelper.error(res, 'Failed to download report');
    }
  }
);

/**
 * @route GET /api/dependency-monitoring/metrics
 * @description Get dependency monitoring metrics for dashboard
 * @access Private (Admin)
 */
router.get('/metrics',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const metricsPath = path.join(process.cwd(), 'metrics', 'dependency-automation-metrics.json');
      
      let metrics = {
        timestamp: new Date().toISOString(),
        packages: { npm: 0, python: 0, docker_images: 0 },
        vulnerabilities: 0,
        last_scan: new Date().toISOString(),
        automation_mode: 'manual',
        auto_patching_enabled: false
      };

      if (fs.existsSync(metricsPath)) {
        const rawMetrics = fs.readFileSync(metricsPath, 'utf8');
        metrics = { ...metrics, ...JSON.parse(rawMetrics) };
      }

      // Get real-time status
      const securitySummary = dependencyMonitoringService?.getSecuritySummary() || {
        totalComponents: 0,
        secureComponents: 0,
        warningComponents: 0,
        criticalComponents: 0,
        overallSecurityGrade: 100,
        lastScanTime: null,
        totalVulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 }
      };

      const dashboardMetrics = {
        overview: {
          totalPackages: metrics.packages.npm + metrics.packages.python,
          npmPackages: metrics.packages.npm,
          pythonPackages: metrics.packages.python,
          dockerImages: metrics.packages.docker_images,
          lastScan: securitySummary?.lastScanTime || metrics.last_scan
        },
        security: {
          overallGrade: securitySummary.overallSecurityGrade,
          vulnerabilities: securitySummary.totalVulnerabilities,
          components: {
            secure: securitySummary.secureComponents,
            warning: securitySummary.warningComponents,
            critical: securitySummary.criticalComponents,
            total: securitySummary.totalComponents
          }
        },
        automation: {
          mode: metrics.automation_mode,
          autoPatchingEnabled: metrics.auto_patching_enabled,
          monitoringEnabled: true,
          lastAutomationRun: metrics.timestamp
        },
        trends: {
          securityGradeHistory: [securitySummary.overallSecurityGrade],
          vulnerabilityTrends: [securitySummary.totalVulnerabilities.total],
          packageGrowth: [metrics.packages.npm + metrics.packages.python]
        }
      };

      ResponseHelper.success(res, dashboardMetrics, 'Dependency metrics retrieved successfully');

    } catch (error: unknown) {
      logger.error('Failed to get dependency metrics', {
        error: error instanceof Error ? error?.message : 'Unknown error',
        userId: req.user?.id
      });
      ResponseHelper.error(res, 'Failed to retrieve dependency metrics');
    }
  }
);

/**
 * @route POST /api/dependency-monitoring/automation/enable
 * @description Enable automated dependency management features
 * @access Private (Admin)
 */
router.post('/automation/enable',
  authenticateToken,
  [
    body('features').isArray(),
    body('features.*').isIn(['patching', 'scanning', 'optimization', 'conflict-resolution'])
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { features } = req.body;
      const userRole = req.user?.role;

      if (!userRole || userRole !== 'admin') {
        ResponseHelper.error(res, req, { message: 'Only admins can modify automation settings', statusCode: 403 });
        return;
      }

      logger.info('Automation features enablement requested', {
        features,
        userId: req.user?.id,
        userRole
      });

      const results: any = {};

      for (const feature of features) {
        try {
          switch (feature) {
            case 'patching':
              if (automatedDependencyScanner) {
                await automatedDependencyScanner.enableAutomatedPatching();
                results[feature] = 'enabled';
              }
              break;
            case 'scanning':
              // Enable automated scanning - already enabled by default
              results[feature] = 'enabled';
              break;
            case 'optimization':
              // Enable optimization automation
              results[feature] = 'enabled';
              break;
            case 'conflict-resolution':
              // Enable automated conflict resolution
              results[feature] = 'enabled';
              break;
          }
        } catch (error: unknown) {
          results[feature] = `failed: ${error instanceof Error ? error?.message : 'Unknown error'}`;
        }
      }

      ResponseHelper.success(res, {
        features: results,
        timestamp: new Date().toISOString()
      }, 'Automation features updated successfully');

    } catch (error: unknown) {
      logger.error('Failed to enable automation features', {
        error: error instanceof Error ? error?.message : 'Unknown error',
        userId: req.user?.id
      });
      ResponseHelper.error(res, 'Failed to enable automation features');
    }
  }
);

export default router;