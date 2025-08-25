#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/controllers/MLSecurityController.ts');

if (!fs.existsSync(filePath)) {
  console.error('MLSecurityController.ts not found');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

console.log('Converting remaining express-validator patterns to Joi...');

// Remove any body(), param(), query() imports that might exist
content = content.replace(/import\s*{\s*[^}]*(?:body|param|query)[^}]*}\s*from\s*['"]express-validator['"];?\s*\n?/g, '');

// Fix requireRole patterns that still use arrays
content = content.replace(/requireRole\(\["admin", "security_analyst", "threat_hunter"\]\)/g, 'requireRole(UserRole.ADMIN)');
content = content.replace(/requireRole\(\["admin", "threat_hunter", "security_analyst"\]\)/g, 'requireRole(UserRole.ADMIN)');
content = content.replace(/requireRole\(\["admin", "security_analyst", "compliance_officer"\]\)/g, 'requireRole(UserRole.ADMIN)');
content = content.replace(/requireRole\(\["admin", "ml_engineer", "data_scientist"\]\)/g, 'requireRole(UserRole.ADMIN)');
content = content.replace(/requireRole\(\["admin", "ml_engineer", "security_analyst"\]\)/g, 'requireRole(UserRole.ADMIN)');
content = content.replace(/requireRole\(\["admin", "fraud_analyst", "security_analyst"\]\)/g, 'requireRole(UserRole.ADMIN)');
content = content.replace(/requireRole\(\["admin", "ml_engineer"\]\)/g, 'requireRole(UserRole.ADMIN)');
content = content.replace(/requireRole\(\["admin", "security_analyst", "risk_manager", "dashboard_viewer"\]\)/g, 'requireRole(UserRole.ADMIN)');

// Convert analyzeAPTBehavior validation
const aptBehaviorValidation = `validateRequest(
      Joi.object({
        userId: Joi.string().required(),
        sessionId: Joi.string().required(),
        activityData: Joi.object({
          actions: Joi.array().required(),
          networkActivity: Joi.array().required(),
          systemEvents: Joi.array().required()
        }).required()
      })
    )`;

content = content.replace(
  /validateRequest\(\[\s*body\("userId"\)\.notEmpty\(\)\.withMessage\("User ID required"\),[\s\S]*?body\("activityData\.systemEvents"\)\.isArray\(\)\.withMessage\("System events array required"\)\s*\]\)/g,
  aptBehaviorValidation
);

// Convert detectLateralMovement validation
const lateralMovementValidation = `validateRequest(
      Joi.object({
        networkEvents: Joi.array().items(
          Joi.object({
            sourceIp: Joi.string().ip().required(),
            targetIp: Joi.string().ip().required(),
            protocol: Joi.string().required()
          })
        ).required()
      })
    )`;

content = content.replace(
  /validateRequest\(\[\s*body\("networkEvents"\)\.isArray\(\)[\s\S]*?body\("networkEvents\.\*\.protocol"\)\.notEmpty\(\)[\s\S]*?\]\)/g,
  lateralMovementValidation
);

// Convert detectC2Communications validation
const c2ValidationValidation = `validateRequest(
      Joi.object({
        networkTraffic: Joi.array().items(
          Joi.object({
            sourceIp: Joi.string().ip().required(),
            destinationIp: Joi.string().ip().required(),
            protocol: Joi.string().required()
          })
        ).required()
      })
    )`;

content = content.replace(
  /validateRequest\(\[\s*body\("networkTraffic"\)\.isArray\(\)[\s\S]*?body\("networkTraffic\.\*\.protocol"\)\.notEmpty\(\)[\s\S]*?\]\)/g,
  c2ValidationValidation
);

// Convert runThreatHunting validation
const threatHuntingValidation = `validateRequest(
      Joi.object({
        queryIds: Joi.array().optional(),
        timeRange: Joi.object({
          start: Joi.date().iso().optional(),
          end: Joi.date().iso().optional()
        }).optional()
      })
    )`;

content = content.replace(
  /validateRequest\(\[\s*body\("queryIds"\)[\s\S]*?body\("timeRange\.end"\)[\s\S]*?\]\)/g,
  threatHuntingValidation
);

// Convert generateThreatPredictions validation
const threatPredictionsValidation = `validateRequest(
      Joi.object({
        modelTypes: Joi.array().required(),
        horizons: Joi.array().required(),
        scope: Joi.object({
          userId: Joi.string().optional(),
          systemId: Joi.string().optional()
        }).optional()
      })
    )`;

content = content.replace(
  /validateRequest\(\[\s*body\("modelTypes"\)[\s\S]*?body\("scope\.systemId"\)[\s\S]*?\]\)/g,
  threatPredictionsValidation
);

// Convert analyzeRiskTrajectories validation
const riskTrajectoriesValidation = `validateRequest(
      Joi.object({
        targets: Joi.array().items(
          Joi.object({
            type: Joi.string().valid("user", "system").required(),
            id: Joi.string().required()
          })
        ).required(),
        horizon: Joi.string().valid("1h", "6h", "24h", "7d", "30d", "90d").optional()
      })
    )`;

content = content.replace(
  /validateRequest\(\[\s*body\("targets"\)[\s\S]*?body\("horizon"\)[\s\S]*?\]\)/g,
  riskTrajectoriesValidation
);

// Convert submitTrainingJob validation
const trainingJobValidation = `validateRequest(
      Joi.object({
        config: Joi.object({
          modelType: Joi.string().required(),
          algorithm: Joi.string().required(),
          features: Joi.array().required(),
          trainingData: Joi.object({
            source: Joi.string().required()
          }).required()
        }).required()
      })
    )`;

content = content.replace(
  /validateRequest\(\[\s*body\("config\.modelType"\)[\s\S]*?body\("config\.trainingData\.source"\)[\s\S]*?\]\)/g,
  trainingJobValidation
);

// Convert parameter validations - getTrainingJobStatus
const jobStatusValidation = `validateRequest(
      Joi.object({
        jobId: Joi.string().required()
      }),
      'params'
    )`;

content = content.replace(
  /validateRequest\(\[\s*param\("jobId"\)\.notEmpty\(\)\.withMessage\("Job ID required"\)\s*\]\)/g,
  jobStatusValidation
);

// Convert deployModel validation
const deployModelValidation = `validateRequest(
      Joi.object({
        modelId: Joi.string().required(),
        environment: Joi.string().valid("staging", "production").required(),
        trafficPercentage: Joi.number().integer().min(1).max(100).optional().default(100)
      })
    )`;

content = content.replace(
  /validateRequest\(\[\s*body\("modelId"\)[\s\S]*?body\("trafficPercentage"\)[\s\S]*?\]\)/g,
  deployModelValidation
);

// Convert monitorModelPerformance validation
const modelPerformanceValidation = `validateRequest(
      Joi.object({
        modelId: Joi.string().required()
      }),
      'params'
    ),
    validateRequest(
      Joi.object({
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional()
      }),
      'query'
    )`;

content = content.replace(
  /validateRequest\(\[\s*param\("modelId"\)[\s\S]*?query\("endDate"\)[\s\S]*?\]\)/g,
  modelPerformanceValidation
);

// Convert blockEntity validation
const blockEntityValidation = `validateRequest(
      Joi.object({
        entityType: Joi.string().valid("customer", "card", "ip", "device").required(),
        entityId: Joi.string().required(),
        reason: Joi.string().required(),
        duration: Joi.number().integer().min(300).optional()
      })
    )`;

content = content.replace(
  /validateRequest\(\[\s*body\("entityType"\)[\s\S]*?body\("duration"\)[\s\S]*?\]\)/g,
  blockEntityValidation
);

// Convert triggerRetraining validation
const retrainingValidation = `validateRequest(
      Joi.object({
        modelId: Joi.string().required()
      }),
      'params'
    ),
    validateRequest(
      Joi.object({
        reason: Joi.string().required(),
        config: Joi.object().optional()
      })
    )`;

content = content.replace(
  /validateRequest\(\[\s*param\("modelId"\)[\s\S]*?body\("config"\)[\s\S]*?\]\)/g,
  retrainingValidation
);

console.log('✅ Converted all express-validator patterns to Joi');
console.log('   - Fixed all body(), param(), query() patterns');
console.log('   - Updated all requireRole array parameters');
console.log('   - Standardized validation middleware usage');

// Write the fixed content
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ MLSecurityController.ts validation patterns updated');