/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - API ROUTES
 * ============================================================================
 * 
 * Main router that combines all API route modules.
 * Provides organized routing structure for the entire application.
 * 
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { Router } from 'express';
import { logger } from '@/utils/logger';

// Import route modules
import authRoutes from './auth';
import userRoutes from './users';
import customerRoutes from './customers';
import binRoutes from './bins';
// import vehicleRoutes from './vehicles';
// import routeRoutes from './routes';
// import driverRoutes from './drivers';
// import serviceRoutes from './services';
// import billingRoutes from './billing';
// import trackingRoutes from './tracking';
// import analyticsRoutes from './analytics';
// import webhookRoutes from './webhooks';

/**
 * Create main API router
 */
const router = Router();

/**
 * API Routes Structure
 * 
 * /api/v1/auth          - Authentication endpoints
 * /api/v1/users         - User management
 * /api/v1/customers     - Customer management
 * /api/v1/vehicles      - Vehicle management
 * /api/v1/drivers       - Driver management
 * /api/v1/routes        - Route management and optimization
 * /api/v1/services      - Service event management
 * /api/v1/billing       - Billing and invoicing
 * /api/v1/tracking      - Real-time GPS tracking
 * /api/v1/analytics     - Analytics and reporting
 * /api/v1/webhooks      - External webhook handlers
 * /api/v1/admin         - Administrative endpoints
 */

// Temporary placeholder endpoints until actual route modules are created
router.get('/', (req, res) => {
  res.json({
    message: 'Waste Management System API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      customers: '/api/v1/customers',
      bins: '/api/v1/bins',
      vehicles: '/api/v1/vehicles',
      drivers: '/api/v1/drivers',
      routes: '/api/v1/routes',
      services: '/api/v1/services',
      billing: '/api/v1/billing',
      tracking: '/api/v1/tracking',
      analytics: '/api/v1/analytics',
      webhooks: '/api/v1/webhooks',
      admin: '/api/v1/admin',
      docs: '/api/docs',
      health: '/health',
    },
  });
});

// Placeholder route for testing
router.get('/test', (req, res) => {
  res.json({
    message: 'API test endpoint working',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'],
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/bins', binRoutes);
/*
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/routes', routeRoutes);
router.use('/services', serviceRoutes);
router.use('/billing', billingRoutes);
router.use('/tracking', trackingRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/webhooks', webhookRoutes);
*/

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'api_route_not_found',
    message: `API route ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /api/v1/',
      'GET /api/v1/test',
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/register',
      'GET /api/v1/auth/profile',
      'GET /api/v1/users',
      'POST /api/v1/users',
      'GET /api/v1/customers',
      'POST /api/v1/customers',
      'GET /api/v1/bins',
      'POST /api/v1/bins',
      'GET /health',
      'GET /api/docs',
    ],
    timestamp: new Date().toISOString(),
  });
});

logger.info('✅ API routes configured');

export { router as apiRoutes };
export default router;