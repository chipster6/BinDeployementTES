/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ML/AI API ROUTES INDEX
 * ============================================================================
 *
 * PHASE 1 WEAVIATE DEPLOYMENT: ML/AI API Route Coordination
 * 
 * COORDINATION SESSION: phase-1-weaviate-parallel-deployment
 * BACKEND AGENT ROLE: API route organization and middleware coordination
 * 
 * Routes Structure:
 * - /api/ml/vector/* - Vector Intelligence (Weaviate)
 * - /api/ml/optimization/* - Route Optimization (Future: Phase 2)
 * - /api/ml/predictions/* - Predictive Analytics (Future: Phase 3)  
 * - /api/ml/llm/* - Local LLM Integration (Future: Phase 4)
 *
 * Created by: Backend-Agent
 * Date: 2025-08-15
 * Version: 1.0.0
 */

import { Router } from 'express';
import { logger } from '@/utils/logger';
import vectorRoutes from './vector';

const router = Router();

/**
 * ML/AI API Routes Registration
 * 
 * PHASE 1: Vector Intelligence Foundation (ACTIVE)
 * - Semantic search across operational data
 * - Operational data vectorization
 * - Insight generation from vector patterns
 */

// Vector Intelligence Routes (Phase 1 - ACTIVE)
router.use('/vector', vectorRoutes);

/**
 * Future ML/AI Routes (Phases 2-4)
 * These will be implemented in subsequent coordination sessions
 */

// Route Optimization Routes (Phase 2 - PLANNED)
// router.use('/optimization', optimizationRoutes);

// Predictive Analytics Routes (Phase 3 - PLANNED)  
// router.use('/predictions', predictionsRoutes);

// Local LLM Intelligence Routes (Phase 4 - PLANNED)
// router.use('/llm', llmRoutes);

/**
 * ML/AI API Health Check Endpoint
 * Provides overview of all ML/AI service statuses
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      vectorIntelligence: {
        status: 'active',
        phase: 1,
        endpoints: [
          'POST /api/ml/vector/search',
          'POST /api/ml/vector/ingest', 
          'GET /api/ml/vector/insights',
          'GET /api/ml/vector/health',
          'POST /api/ml/vector/deploy'
        ]
      },
      routeOptimization: {
        status: 'planned',
        phase: 2,
        estimatedDeployment: 'Week 8-9'
      },
      predictiveAnalytics: {
        status: 'planned', 
        phase: 3,
        estimatedDeployment: 'Week 9-10'
      },
      llmIntelligence: {
        status: 'planned',
        phase: 4, 
        estimatedDeployment: 'Week 10-11'
      }
    };

    logger.info('ML/AI health check accessed', {
      userId: req.user?.id,
      phases: Object.keys(healthStatus)
    });

    res.json({
      success: true,
      message: 'ML/AI services health check',
      data: healthStatus,
      meta: {
        activePhases: 1,
        totalPhases: 4,
        coordinationSession: 'phase-1-weaviate-parallel-deployment'
      }
    });

  } catch (error) {
    logger.error('ML/AI health check error', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'ML/AI health check failed',
      error: error.message
    });
  }
});

/**
 * ML/AI API Documentation Endpoint
 * Provides API documentation for all ML/AI endpoints
 */
router.get('/docs', (req, res) => {
  const documentation = {
    title: 'Waste Management ML/AI API Documentation',
    version: '1.0.0',
    coordinationSession: 'phase-1-weaviate-parallel-deployment',
    phases: {
      phase1: {
        title: 'Vector Intelligence Foundation',
        status: 'active',
        baseUrl: '/api/ml/vector',
        endpoints: {
          'POST /search': 'Semantic search across operational data',
          'POST /ingest': 'Vectorize operational data',
          'GET /insights': 'Generate operational insights',
          'GET /health': 'Service health metrics',
          'POST /deploy': 'Deploy Weaviate connection'
        },
        authentication: 'JWT Bearer Token required',
        rateLimit: 'Varies by endpoint (10-100 requests per time window)',
        performance: '<200ms response time target'
      },
      phase2: {
        title: 'Advanced Route Optimization Engine',
        status: 'planned',
        description: 'OR-Tools + GraphHopper integration for route optimization',
        estimatedDeployment: 'Week 8-9'
      },
      phase3: {
        title: 'Predictive Intelligence System', 
        status: 'planned',
        description: 'Prophet + LightGBM forecasting with 85%+ accuracy',
        estimatedDeployment: 'Week 9-10'
      },
      phase4: {
        title: 'Local LLM Intelligence',
        status: 'planned',
        description: 'Llama 3.1 8B natural language processing',
        estimatedDeployment: 'Week 10-11'
      }
    },
    coordination: {
      backendAgent: 'API integration & service implementation',
      databaseArchitect: 'Schema design & optimization',
      performanceSpecialist: '<200ms SLA & caching strategies'
    }
  };

  res.json({
    success: true,
    data: documentation
  });
});

export default router;