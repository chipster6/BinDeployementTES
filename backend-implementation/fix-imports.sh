#!/bin/bash

echo "🔧 Starting systematic TypeScript import fixes..."

# Step 1: Remove duplicate InferAttributes imports
echo "Step 1: Removing duplicate InferAttributes imports..."
find src -name "*.ts" -type f -exec sed -i '' '/^import { InferAttributes, InferCreationAttributes } from '\''sequelize'\'';$/d' {} \;

# Step 2: Add comprehensive Sequelize imports to all model files
echo "Step 2: Adding Sequelize type imports to models..."
for file in src/models/*.ts src/models/**/*.ts; do
  if [ -f "$file" ]; then
    # Check if the file already has the types imported
    if ! grep -q "CreationOptional\|ForeignKey\|NonAttribute" "$file"; then
      # Add import at the beginning after the header comment
      sed -i '' '1,/^import/s/^import/import type { CreationOptional, ForeignKey, NonAttribute, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, HasManyGetAssociationsMixin, WhereOptions, FindOptions } from "@\/types\/sequelize";\
import/' "$file"
    fi
  fi
done

# Step 3: Add API types imports to services
echo "Step 3: Adding API type imports to services..."
for file in src/services/*.ts src/services/**/*.ts; do
  if [ -f "$file" ]; then
    # Check if the file uses ApiResponse, ServiceResult, etc.
    if grep -q "ApiResponse\|ServiceResult\|AuthenticatedRequest\|RouteOptimizationRequest" "$file" 2>/dev/null; then
      if ! grep -q "from.*@/types/api" "$file"; then
        sed -i '' '1,/^import/s/^import/import type { ApiResponse, ServiceResult, ServiceError, AuthenticatedRequest, RouteOptimizationRequest, RouteOptimizationResponse, BaseSystemError, SecurityError, ExternalServiceConfig, ServiceProvider, FallbackProvider, FallbackContext, AnalyticsTimeRange, QueuePerformanceMetrics, RealTimeErrorEvent, CrossStreamErrorContext, RoutingDecision, IntelligentRoutingNode, SmartRoutingContext, CoordinationStrategy, MLModel } from "@\/types\/api";\
import/' "$file"
      fi
    fi
  fi
done

# Step 4: Add API types imports to controllers
echo "Step 4: Adding API type imports to controllers..."
for file in src/controllers/*.ts; do
  if [ -f "$file" ]; then
    if ! grep -q "from.*@/types/api" "$file"; then
      sed -i '' '1,/^import/s/^import/import type { ApiResponse, ServiceResult, AuthenticatedRequest, BaseSystemError, SecurityError } from "@\/types\/api";\
import/' "$file"
    fi
  fi
done

# Step 5: Fix Op operator imports
echo "Step 5: Fixing Sequelize Op imports..."
find src -name "*.ts" -type f -exec sed -i '' 's/import { Op } from "sequelize"/import { Op } from "@\/types\/sequelize"/g' {} \;
find src -name "*.ts" -type f -exec sed -i '' 's/Sequelize\.Op/Op/g' {} \;

# Step 6: Add logger interface if missing
echo "Step 6: Creating logger interface..."
cat > src/utils/logger.d.ts << 'EOF'
/**
 * Logger Type Definitions
 */

export interface Logger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  verbose(message: string, meta?: any): void;
  silly(message: string, meta?: any): void;
}

export interface Timer {
  stop(): number;
  getElapsed(): number;
  elapsed: number;
}

export class TimerImpl implements Timer {
  private startTime: number;
  
  constructor() {
    this.startTime = Date.now();
  }
  
  stop(): number {
    return this.getElapsed();
  }
  
  getElapsed(): number {
    return Date.now() - this.startTime;
  }
  
  get elapsed(): number {
    return this.getElapsed();
  }
}

export const logger: Logger & {
  startTimer(): Timer;
  monitoring: {
    logServiceStart(serviceName: string, method: string, data?: any): void;
    logServiceSuccess(serviceName: string, method: string, timer: Timer, result?: any): void;
    logServiceError(serviceName: string, method: string, timer: Timer, error: any): void;
  };
  errorHandling: {
    handleError(error: any, context?: any): void;
    handleSuccess(message: string, data?: any): void;
  };
  security: {
    log(message: string, level: string, meta?: any): void;
  };
  siem: {
    logSecurityEvent(event: any): void;
  };
};

declare module '@/utils/logger' {
  export { logger, Logger, Timer };
}
EOF

# Step 7: Fix ResponseHelper issues
echo "Step 7: Creating ResponseHelper types..."
cat > src/utils/ResponseHelper.d.ts << 'EOF'
/**
 * ResponseHelper Type Definitions
 */

import { Response } from 'express';

export interface ErrorResponseOptions {
  message: string;
  statusCode?: number;
  errors?: any[];
}

export interface SuccessResponseOptions<T = any> {
  data: T;
  message?: string;
  statusCode?: number;
}

export class ResponseHelper {
  static success<T = any>(res: Response, options: SuccessResponseOptions<T>): Response;
  static error(res: Response, options: ErrorResponseOptions): Response;
  static paginated<T = any>(res: Response, data: T[], pagination: any): Response;
  static noContent(res: Response): Response;
  static created<T = any>(res: Response, data: T, message?: string): Response;
  static badRequest(res: Response, message: string, errors?: any[]): Response;
  static unauthorized(res: Response, message?: string): Response;
  static forbidden(res: Response, message?: string): Response;
  static notFound(res: Response, message?: string): Response;
  static conflict(res: Response, message: string): Response;
  static internalError(res: Response, message?: string): Response;
}

declare module '@/utils/ResponseHelper' {
  export { ResponseHelper, ErrorResponseOptions, SuccessResponseOptions };
}
EOF

echo "✅ Import fixes complete! Now running TypeScript compiler to check remaining errors..."

# Run TypeScript compiler to see remaining errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l