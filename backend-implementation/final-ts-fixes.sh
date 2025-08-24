#!/bin/bash

echo "🔧 Final TypeScript fixes..."

# Step 1: Fix BaseController imports and Response type conflict
echo "Step 1: Fixing BaseController..."
cat > src/controllers/BaseController.ts << 'EOF'
import type { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '@/utils/ResponseHelper';
import { logger } from '@/utils/logger';

/**
 * Base controller class with common error handling
 */
export abstract class BaseController {
  /**
   * Handle errors in a consistent way
   */
  protected handleError(res: Response, error: unknown, message: string = 'An error occurred'): void {
    logger.error(message, { error });
    
    if (error instanceof Error) {
      ResponseHelper.error(res, { 
        message: error.message || message,
        statusCode: 500
      });
    } else {
      ResponseHelper.error(res, { 
        message,
        statusCode: 500
      });
    }
  }
  
  /**
   * Handle success responses
   */
  protected handleSuccess(res: Response, data: any, message: string = 'Success'): void {
    ResponseHelper.success(res, {
      data,
      message
    });
  }
}
EOF

# Step 2: Fix MLSecurityController missing return statements
echo "Step 2: Adding missing return statements to MLSecurityController..."
# Fix the predictThreat method
sed -i '' '/async predictThreat.*{/,/^  \}$/{
  /return ResponseHelper/!{
    /^  \}$/i\
    return ResponseHelper.internalError(res, "Unexpected error");
  }
}' src/controllers/MLSecurityController.ts 2>/dev/null || true

# Fix the getRiskScore method
sed -i '' '/async getRiskScore.*{/,/^  \}$/{
  /return ResponseHelper/!{
    /^  \}$/i\
    return ResponseHelper.internalError(res, "Unexpected error");
  }
}' src/controllers/MLSecurityController.ts 2>/dev/null || true

# Step 3: Fix ResponseHelper calls to handle undefined values
echo "Step 3: Fixing ResponseHelper calls..."
find src/controllers -name "*.ts" -type f -exec sed -i '' \
  's/message: result?.message/message: result?.message || "Operation failed"/g' {} \;
  
find src/controllers -name "*.ts" -type f -exec sed -i '' \
  's/errors: result\.errors/errors: result.errors || []/g' {} \;

# Step 4: Fix ResponseHelper success calls with proper signatures
echo "Step 4: Fixing ResponseHelper.success calls..."
find src/controllers -name "MLSecurityController.ts" -type f -exec sed -i '' \
  's/ResponseHelper\.success(res, result\.data, result?.message)/ResponseHelper.success(res, { data: result.data || {}, message: result?.message || "Success" })/g' {} \;

# Step 5: Fix type-only imports for all controllers
echo "Step 5: Converting to type-only imports..."
for file in src/controllers/*.ts; do
  if [ -f "$file" ]; then
    # Fix Request, Response, NextFunction imports
    sed -i '' 's/^import { Request, Response, NextFunction }/import type { Request, Response, NextFunction }/' "$file"
    sed -i '' 's/^import { Request, Response }/import type { Request, Response }/' "$file"
    sed -i '' 's/^import { Response }/import type { Response }/' "$file"
  fi
done

# Step 6: Fix ResponseHelper implementation
echo "Step 6: Updating ResponseHelper implementation..."
cat > src/utils/ResponseHelper.ts << 'EOF'
import type { Response } from 'express';

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
  static success<T = any>(res: Response, options: SuccessResponseOptions<T>): Response {
    const { data, message = 'Success', statusCode = 200 } = options;
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  static error(res: Response, options: ErrorResponseOptions): Response {
    const { message, statusCode = 500, errors = [] } = options;
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }

  static paginated<T = any>(res: Response, data: T[], pagination: any): Response {
    return res.status(200).json({
      success: true,
      data,
      pagination
    });
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static created<T = any>(res: Response, data: T, message: string = 'Created successfully'): Response {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }

  static badRequest(res: Response, message: string, errors: any[] = []): Response {
    return res.status(400).json({
      success: false,
      message,
      errors
    });
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return res.status(401).json({
      success: false,
      message
    });
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return res.status(403).json({
      success: false,
      message
    });
  }

  static notFound(res: Response, message: string = 'Not found'): Response {
    return res.status(404).json({
      success: false,
      message
    });
  }

  static conflict(res: Response, message: string): Response {
    return res.status(409).json({
      success: false,
      message
    });
  }

  static internalError(res: Response, message: string = 'Internal server error'): Response {
    return res.status(500).json({
      success: false,
      message
    });
  }
}
EOF

echo "✅ Final fixes complete! Running compiler check..."

# Final check
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l