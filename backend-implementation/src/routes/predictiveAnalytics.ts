/**
 * ============================================================================
 * PREDICTIVE ANALYTICS ROUTES - PHASE 3 AI/ML IMPLEMENTATION
 * ============================================================================
 *
 * API routes for predictive analytics services including Prophet time series
 * forecasting, LightGBM gradient boosting, and ensemble models for waste
 * management intelligence and optimization.
 *
 * Routes:
 * - POST /forecast - Generate demand forecasting
 * - POST /batch-forecast - Generate batch forecasts for multiple targets
 * - POST /prophet/train - Train Prophet model
 * - POST /prophet/{modelId}/forecast - Generate Prophet forecast
 * - POST /lightgbm/train - Train LightGBM model
 * - POST /lightgbm/predict - Make LightGBM predictions
 * - POST /{service}/{modelId}/cross-validate - Perform cross-validation
 * - POST /lightgbm/optimize - Optimize hyperparameters
 * - GET /{service}/{modelId}/diagnostics - Get model diagnostics
 * - GET /status - Get service status
 * - GET /{service}/models - Get cached models
 * - DELETE /{service}/cache - Clear model cache
 * - GET /stream/{modelId} - Stream real-time predictions (Server-Sent Events)
 * - GET /performance-metrics - Get advanced ML performance metrics
 * - GET /health - Health check
 * - GET /health-advanced - Advanced health check with circuit breaker status
 *
 * Phase 3 Implementation: Predictive Intelligence System
 * Created by: Backend-Agent (Phase 3 Parallel Coordination)
 * Date: 2025-08-19
 * Version: 1.0.0
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { auth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import PredictiveAnalyticsController from '@/controllers/PredictiveAnalyticsController';

const router = Router();

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Forecast request validation
 */
const validateForecastRequest = [
  body('target')
    .optional()
    .isIn(['demand', 'revenue', 'churn', 'maintenance', 'cost'])
    .withMessage('Target must be one of: demand, revenue, churn, maintenance, cost'),
  body('timeframe')
    .optional()
    .isIn(['1d', '7d', '30d', '90d', '365d'])
    .withMessage('Timeframe must be one of: 1d, 7d, 30d, 90d, 365d'),
  body('granularity')
    .optional()
    .isIn(['hourly', 'daily', 'weekly', 'monthly'])
    .withMessage('Granularity must be one of: hourly, daily, weekly, monthly'),
  body('modelPreference')
    .optional()
    .isIn(['prophet', 'lightgbm', 'ensemble', 'auto'])
    .withMessage('Model preference must be one of: prophet, lightgbm, ensemble, auto'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('features')
    .optional()
    .isObject()
    .withMessage('Features must be an object')
];

/**
 * Prophet training validation
 */
const validateProphetTraining = [
  body('data')
    .isArray({ min: 2 })
    .withMessage('Data must be an array with at least 2 points'),
  body('data.*.ds')
    .isISO8601()
    .withMessage('Date field (ds) must be in ISO8601 format'),
  body('data.*.y')
    .isNumeric()
    .withMessage('Target field (y) must be numeric'),
  body('config')
    .optional()
    .isObject()
    .withMessage('Config must be an object'),
  body('config.periods')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Periods must be between 1 and 1000'),
  body('config.growth')
    .optional()
    .isIn(['linear', 'logistic'])
    .withMessage('Growth must be linear or logistic'),
  body('customSeasonalities')
    .optional()
    .isArray()
    .withMessage('Custom seasonalities must be an array'),
  body('holidays')
    .optional()
    .isArray()
    .withMessage('Holidays must be an array')
];

/**
 * LightGBM training validation
 */
const validateLightGBMTraining = [
  body('dataset')
    .isObject()
    .withMessage('Dataset must be an object'),
  body('dataset.features')
    .isArray({ min: 1 })
    .withMessage('Features must be a non-empty array'),
  body('dataset.target')
    .isArray({ min: 1 })
    .withMessage('Target must be a non-empty array'),
  body('dataset.feature_names')
    .isArray({ min: 1 })
    .withMessage('Feature names must be a non-empty array'),
  body('config')
    .optional()
    .isObject()
    .withMessage('Config must be an object'),
  body('config.objective')
    .optional()
    .isIn(['regression', 'binary', 'multiclass', 'lambdarank'])
    .withMessage('Objective must be one of: regression, binary, multiclass, lambdarank'),
  body('config.boosting')
    .optional()
    .isIn(['gbdt', 'dart', 'goss', 'rf'])
    .withMessage('Boosting must be one of: gbdt, dart, goss, rf'),
  body('validationDataset')
    .optional()
    .isObject()
    .withMessage('Validation dataset must be an object')
];

/**
 * LightGBM prediction validation
 */
const validateLightGBMPrediction = [
  body('model_id')
    .isString()
    .notEmpty()
    .withMessage('Model ID is required'),
  body('features')
    .isArray({ min: 1 })
    .withMessage('Features must be a non-empty array'),
  body('prediction_type')
    .optional()
    .isIn(['value', 'probability', 'raw_score'])
    .withMessage('Prediction type must be one of: value, probability, raw_score'),
  body('explain_predictions')
    .optional()
    .isBoolean()
    .withMessage('Explain predictions must be a boolean'),
  body('batch_size')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Batch size must be between 1 and 10000')
];

/**
 * Cross-validation validation
 */
const validateCrossValidation = [
  param('service')
    .isIn(['prophet', 'lightgbm'])
    .withMessage('Service must be prophet or lightgbm'),
  param('modelId')
    .isString()
    .notEmpty()
    .withMessage('Model ID is required'),
  body('folds')
    .optional()
    .isInt({ min: 2, max: 20 })
    .withMessage('Folds must be between 2 and 20'),
  body('shuffle')
    .optional()
    .isBoolean()
    .withMessage('Shuffle must be a boolean'),
  body('horizon')
    .optional()
    .isString()
    .withMessage('Horizon must be a string'),
  body('period')
    .optional()
    .isString()
    .withMessage('Period must be a string'),
  body('initial')
    .optional()
    .isString()
    .withMessage('Initial must be a string')
];

/**
 * Hyperparameter optimization validation
 */
const validateHyperparameterOptimization = [
  body('dataset')
    .isObject()
    .withMessage('Dataset must be an object'),
  body('optimizationMethod')
    .optional()
    .isIn(['grid', 'random', 'bayesian'])
    .withMessage('Optimization method must be one of: grid, random, bayesian'),
  body('maxEvals')
    .optional()
    .isInt({ min: 5, max: 1000 })
    .withMessage('Max evaluations must be between 5 and 1000'),
  body('validationDataset')
    .optional()
    .isObject()
    .withMessage('Validation dataset must be an object')
];

/**
 * Service parameter validation
 */
const validateServiceParam = [
  param('service')
    .isIn(['prophet', 'lightgbm', 'all'])
    .withMessage('Service must be prophet, lightgbm, or all')
];

/**
 * Model ID parameter validation
 */
const validateModelIdParam = [
  param('modelId')
    .isString()
    .notEmpty()
    .withMessage('Model ID is required')
];

/**
 * Batch forecast request validation
 */
const validateBatchForecastRequest = [
  body('requests')
    .isArray({ min: 1, max: 10 })
    .withMessage('Requests array must contain 1-10 forecast requests'),
  body('requests.*.target')
    .optional()
    .isIn(['demand', 'revenue', 'churn', 'maintenance', 'cost'])
    .withMessage('Target must be one of: demand, revenue, churn, maintenance, cost'),
  body('requests.*.timeframe')
    .optional()
    .isIn(['1d', '7d', '30d', '90d', '365d'])
    .withMessage('Timeframe must be one of: 1d, 7d, 30d, 90d, 365d'),
  body('requests.*.granularity')
    .optional()
    .isIn(['hourly', 'daily', 'weekly', 'monthly'])
    .withMessage('Granularity must be one of: hourly, daily, weekly, monthly'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  body('options.concurrent')
    .optional()
    .isBoolean()
    .withMessage('Concurrent option must be boolean')
];

/**
 * Stream parameters validation
 */
const validateStreamParameters = [
  param('modelId')
    .isLength({ min: 1 })
    .withMessage('Model ID is required'),
  query('interval')
    .optional()
    .isInt({ min: 5000, max: 300000 })
    .withMessage('Interval must be between 5000ms (5s) and 300000ms (5min)'),
  query('target')
    .optional()
    .isIn(['demand', 'revenue', 'churn', 'maintenance', 'cost'])
    .withMessage('Target must be one of: demand, revenue, churn, maintenance, cost')
];

/**
 * Prophet forecast validation
 */
const validateProphetForecast = [
  param('modelId')
    .isString()
    .notEmpty()
    .withMessage('Model ID is required'),
  body('periods')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Periods must be between 1 and 1000'),
  body('freq')
    .optional()
    .isIn(['D', 'W', 'M', 'H', 'T'])
    .withMessage('Frequency must be one of: D, W, M, H, T'),
  body('includeComponents')
    .optional()
    .isBoolean()
    .withMessage('Include components must be a boolean')
];

/**
 * Custom seasonality validation
 */
const validateCustomSeasonality = [
  param('modelId')
    .isString()
    .notEmpty()
    .withMessage('Model ID is required'),
  body('name')
    .isString()
    .notEmpty()
    .withMessage('Seasonality name is required'),
  body('period')
    .isFloat({ min: 0.1 })
    .withMessage('Period must be a positive number'),
  body('fourier_order')
    .isInt({ min: 1, max: 20 })
    .withMessage('Fourier order must be between 1 and 20'),
  body('prior_scale')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Prior scale must be a positive number'),
  body('mode')
    .optional()
    .isIn(['additive', 'multiplicative'])
    .withMessage('Mode must be additive or multiplicative')
];

// ============================================================================
// RATE LIMITING
// ============================================================================

const forecastRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many forecast requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const trainingRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 training requests per hour
  message: 'Too many training requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const predictionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // limit each IP to 1000 predictions per 5 minutes
  message: 'Too many prediction requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * @route   POST /api/predictive-analytics/forecast
 * @desc    Generate demand forecast using ensemble models
 * @access  Private
 */
router.post('/forecast',
  auth,
  forecastRateLimit,
  validateForecastRequest,
  PredictiveAnalyticsController.generateForecast
);

/**
 * @route   POST /api/predictive-analytics/prophet/train
 * @desc    Train Prophet time series model
 * @access  Private
 */
router.post('/prophet/train',
  auth,
  trainingRateLimit,
  validateProphetTraining,
  PredictiveAnalyticsController.trainProphetModel
);

/**
 * @route   POST /api/predictive-analytics/prophet/:modelId/forecast
 * @desc    Generate forecast using trained Prophet model
 * @access  Private
 */
router.post('/prophet/:modelId/forecast',
  auth,
  forecastRateLimit,
  validateProphetForecast,
  PredictiveAnalyticsController.generateProphetForecast
);

/**
 * @route   POST /api/predictive-analytics/prophet/:modelId/seasonality
 * @desc    Add custom seasonality to Prophet model
 * @access  Private
 */
router.post('/prophet/:modelId/seasonality',
  auth,
  validateCustomSeasonality,
  PredictiveAnalyticsController.addCustomSeasonality
);

/**
 * @route   POST /api/predictive-analytics/lightgbm/train
 * @desc    Train LightGBM gradient boosting model
 * @access  Private
 */
router.post('/lightgbm/train',
  auth,
  trainingRateLimit,
  validateLightGBMTraining,
  PredictiveAnalyticsController.trainLightGBMModel
);

/**
 * @route   POST /api/predictive-analytics/lightgbm/predict
 * @desc    Make predictions using trained LightGBM model
 * @access  Private
 */
router.post('/lightgbm/predict',
  auth,
  predictionRateLimit,
  validateLightGBMPrediction,
  PredictiveAnalyticsController.makeLightGBMPredictions
);

/**
 * @route   POST /api/predictive-analytics/lightgbm/optimize
 * @desc    Optimize LightGBM hyperparameters
 * @access  Private
 */
router.post('/lightgbm/optimize',
  auth,
  trainingRateLimit,
  validateHyperparameterOptimization,
  PredictiveAnalyticsController.optimizeHyperparameters
);

/**
 * @route   POST /api/predictive-analytics/:service/:modelId/cross-validate
 * @desc    Perform cross-validation on trained model
 * @access  Private
 */
router.post('/:service/:modelId/cross-validate',
  auth,
  validateCrossValidation,
  PredictiveAnalyticsController.performCrossValidation
);

/**
 * @route   GET /api/predictive-analytics/:service/:modelId/diagnostics
 * @desc    Get model diagnostics and performance metrics
 * @access  Private
 */
router.get('/:service/:modelId/diagnostics',
  auth,
  validateServiceParam,
  validateModelIdParam,
  PredictiveAnalyticsController.getModelDiagnostics
);

/**
 * @route   GET /api/predictive-analytics/status
 * @desc    Get service status and metrics
 * @access  Private
 */
router.get('/status',
  auth,
  PredictiveAnalyticsController.getServiceStatus
);

/**
 * @route   GET /api/predictive-analytics/:service/models
 * @desc    Get cached models for service
 * @access  Private
 */
router.get('/:service/models',
  auth,
  validateServiceParam,
  PredictiveAnalyticsController.getCachedModels
);

/**
 * @route   DELETE /api/predictive-analytics/:service/cache
 * @desc    Clear model cache for service
 * @access  Private
 */
router.delete('/:service/cache',
  auth,
  validateServiceParam,
  PredictiveAnalyticsController.clearModelCache
);

/**
 * @route   POST /api/predictive-analytics/batch-forecast
 * @desc    Generate batch forecasts for multiple targets
 * @access  Private
 */
router.post('/batch-forecast',
  auth,
  forecastRateLimit,
  validateBatchForecastRequest,
  PredictiveAnalyticsController.generateBatchForecast
);

/**
 * @route   GET /api/predictive-analytics/stream/:modelId
 * @desc    Stream real-time predictions (Server-Sent Events)
 * @access  Private
 */
router.get('/stream/:modelId',
  auth,
  validateStreamParameters,
  PredictiveAnalyticsController.streamPredictions
);

/**
 * @route   GET /api/predictive-analytics/performance-metrics
 * @desc    Get advanced ML performance metrics
 * @access  Private
 */
router.get('/performance-metrics',
  auth,
  PredictiveAnalyticsController.getPerformanceMetrics
);

/**
 * @route   GET /api/predictive-analytics/health-advanced
 * @desc    Advanced health check with circuit breaker status
 * @access  Private
 */
router.get('/health-advanced',
  auth,
  PredictiveAnalyticsController.advancedHealthCheck
);

/**
 * @route   GET /api/predictive-analytics/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health',
  PredictiveAnalyticsController.healthCheck
);

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Validation error handler
 */
router.use((req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });
  }
  next();
});

export default router;