/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SWAGGER DOCUMENTATION SETUP
 * ============================================================================
 * 
 * Swagger/OpenAPI documentation configuration and setup.
 * Serves interactive API documentation based on existing contracts.
 * 
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * Load existing OpenAPI specification from artifacts
 */
const loadApiContracts = (): any => {
  try {
    const contractsPath = path.join(process.cwd(), '..', 'artifacts', 'api-contracts.yml');
    
    // Check if the contracts file exists
    if (fs.existsSync(contractsPath)) {
      const contractsContent = fs.readFileSync(contractsPath, 'utf8');
      const apiSpec = yaml.load(contractsContent) as any;
      
      logger.info('Loaded existing API contracts from artifacts/api-contracts.yml');
      
      // Update server URL to match current environment
      if (apiSpec.servers) {
        apiSpec.servers = [
          {
            url: `http://localhost:${config.port}/api/v1`,
            description: `${config.app.nodeEnv} server`,
          },
        ];
      }
      
      return apiSpec;
    } else {
      logger.warn('API contracts file not found, generating basic spec');
      return generateBasicSpec();
    }
  } catch (error) {
    logger.error('Failed to load API contracts:', error);
    return generateBasicSpec();
  }
};

/**
 * Generate basic OpenAPI specification if contracts file is not available
 */
const generateBasicSpec = (): any => {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Waste Management System API',
      version: config.app.version || '1.0.0',
      description: `
        ## Comprehensive Waste Management System API
        
        This API provides endpoints for managing waste collection operations including:
        - User authentication and authorization
        - Customer management
        - Route planning and optimization
        - Vehicle and driver management
        - Real-time GPS tracking
        - Billing and invoicing
        - Analytics and reporting
        
        ### Authentication
        All endpoints require JWT authentication except for login and health checks.
        Include the JWT token in the Authorization header: \`Bearer <token>\`
        
        ### Rate Limiting
        API requests are rate limited. Check the \`X-RateLimit-*\` headers in responses.
        
        ### Error Handling
        The API uses standard HTTP status codes and returns error details in JSON format.
      `,
      contact: {
        name: 'API Support',
        email: 'api-support@waste-mgmt.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
        description: `${config.app.nodeEnv} server`,
      },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check endpoint',
          description: 'Check the health status of the API and its dependencies',
          responses: {
            200: {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                      timestamp: { type: 'string', format: 'date-time' },
                      uptime: { type: 'number' },
                      checks: { type: 'object' },
                    },
                  },
                },
              },
            },
            503: {
              description: 'Service is unhealthy',
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login endpoint',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string' },
          },
        },
      },
    },
    security: [
      { BearerAuth: [] },
    ],
  };
};

/**
 * Swagger UI options configuration
 */
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    persistAuthorization: true,
    displayRequestDuration: true,
    defaultModelExpandDepth: 2,
    defaultModelsExpandDepth: 1,
    maxDisplayedTags: 20,
    deepLinking: true,
    displayOperationId: false,
    defaultModelRendering: 'example',
    showExtensions: true,
    showMutatedRequest: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
    
    // Custom CSS for better appearance
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info hgroup.main { margin: 0 0 20px 0; }
      .swagger-ui .info .title { font-size: 2rem; color: #2c3e50; }
      .swagger-ui .info .description { font-size: 1rem; line-height: 1.6; }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 4px; }
      .swagger-ui .auth-wrapper .auth-container { border: 1px solid #d1ecf1; }
      .swagger-ui .btn.authorize { background-color: #007bff; border-color: #007bff; }
      .swagger-ui .btn.authorize:hover { background-color: #0056b3; border-color: #004085; }
      .swagger-ui .model-box-control:focus, .swagger-ui .models-control:focus, .swagger-ui .opblock-summary-control:focus { outline: none; }
    `,
    
    // Custom site title
    customSiteTitle: 'Waste Management API Documentation',
    
    // Custom favicon
    customfavIcon: '/favicon.ico',
  },
};

/**
 * Setup Swagger documentation
 */
export const setupSwagger = (app: Express): void => {
  try {
    if (!config.app.enableSwaggerUI) {
      logger.info('Swagger UI disabled by configuration');
      return;
    }
    
    // Load OpenAPI specification
    const apiSpec = loadApiContracts();
    
    // Serve Swagger UI at /api/docs
    app.use('/api/docs', swaggerUi.serve);
    app.get('/api/docs', swaggerUi.setup(apiSpec, swaggerOptions));
    
    // Serve raw OpenAPI spec as JSON
    app.get('/api/docs/openapi.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(apiSpec, null, 2));
    });
    
    // Serve raw OpenAPI spec as YAML
    app.get('/api/docs/openapi.yaml', (req, res) => {
      res.setHeader('Content-Type', 'application/x-yaml');
      res.send(yaml.dump(apiSpec));
    });
    
    // Health check for docs
    app.get('/api/docs/health', (req, res) => {
      res.json({
        status: 'healthy',
        swagger: 'enabled',
        timestamp: new Date().toISOString(),
      });
    });
    
    logger.info(`📝 Swagger UI available at: http://localhost:${config.port}/api/docs`);
    logger.info(`📄 OpenAPI JSON spec at: http://localhost:${config.port}/api/docs/openapi.json`);
    logger.info(`📄 OpenAPI YAML spec at: http://localhost:${config.port}/api/docs/openapi.yaml`);
    
  } catch (error) {
    logger.error('Failed to setup Swagger documentation:', error);
    
    // Create a minimal error page
    app.get('/api/docs', (req, res) => {
      res.status(500).json({
        error: 'swagger_setup_failed',
        message: 'Failed to load API documentation',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }
};

/**
 * Generate OpenAPI spec from JSDoc comments (alternative method)
 */
export const generateSwaggerFromJSDoc = (): any => {
  const options = {
    definition: {
      openapi: '3.1.0',
      info: {
        title: 'Waste Management System API',
        version: config.app.version || '1.0.0',
        description: 'API for waste management operations',
      },
      servers: [
        {
          url: `http://localhost:${config.port}/api/v1`,
          description: `${config.app.nodeEnv} server`,
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ BearerAuth: [] }],
    },
    apis: [
      path.join(__dirname, '../routes/*.ts'),
      path.join(__dirname, '../controllers/*.ts'),
      path.join(__dirname, '../models/*.ts'),
    ],
  };
  
  return swaggerJsdoc(options);
};

/**
 * Validate OpenAPI specification
 */
export const validateOpenAPISpec = (spec: any): boolean => {
  try {
    // Basic validation
    if (!spec.openapi || !spec.info || !spec.paths) {
      logger.error('Invalid OpenAPI specification: missing required fields');
      return false;
    }
    
    // Check version
    if (!spec.openapi.startsWith('3.')) {
      logger.error('Invalid OpenAPI version: must be 3.x');
      return false;
    }
    
    logger.info('OpenAPI specification validation passed');
    return true;
  } catch (error) {
    logger.error('OpenAPI specification validation failed:', error);
    return false;
  }
};

// Export setup function
export default setupSwagger;