/**
 * ============================================================================
 * PERFORMANCE OPTIMIZATION API ROUTES
 * ============================================================================
 *
 * API routes for database performance monitoring, optimization, and N+1 query
 * detection. Provides comprehensive performance management endpoints.
 *
 * Created by: Database-Architect & Performance-Optimization-Specialist
 * Date: 2025-08-16
 * Version: 1.0.0 - Performance Optimization Phase 2
 */

import express from 'express';
import { authenticate } from '@/middleware/auth';
import { authorize } from '@/middleware/authorize';
import { rateLimit } from '@/middleware/rateLimit';
import PerformanceController from '@/controllers/PerformanceController';

const router = express.Router();
const performanceController = new PerformanceController();

// Apply authentication and authorization to all performance routes
router.use(authenticate);
router.use(authorize(['admin', 'system_admin', 'performance_admin'])); // Only admins can access performance data

// Rate limiting for performance endpoints
const performanceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many performance requests',
});

router.use(performanceRateLimit);

/**
 * Performance Dashboard & Overview
 */

// Get comprehensive performance dashboard
router.get('/dashboard', performanceController.getDashboard.bind(performanceController));

// Get detailed performance analysis
router.get('/analysis', performanceController.getAnalysis.bind(performanceController));

// Get real-time performance metrics
router.get('/metrics/realtime', performanceController.getRealtimeMetrics.bind(performanceController));

// Get performance history
router.get('/history', performanceController.getPerformanceHistory.bind(performanceController));

/**
 * N+1 Query Detection
 */

// Get N+1 query patterns
router.get('/nplus-one', performanceController.getNPlusOnePatterns.bind(performanceController));

/**
 * Optimization Recommendations
 */

// Get optimization recommendations
router.get('/recommendations', performanceController.getRecommendations.bind(performanceController));

// Apply specific recommendation
router.post('/recommendations/:id/apply', performanceController.applyRecommendation.bind(performanceController));

// Get optimization impact analysis
router.get('/impact-analysis', performanceController.getImpactAnalysis.bind(performanceController));

/**
 * Automated Optimization
 */

// Apply optimization automatically
router.post('/optimize', performanceController.applyOptimization.bind(performanceController));

/**
 * Alerts & Monitoring
 */

// Acknowledge performance alert
router.post('/alerts/:index/acknowledge', performanceController.acknowledgeAlert.bind(performanceController));

export default router;