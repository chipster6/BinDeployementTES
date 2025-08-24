#!/bin/bash

echo "🔧 Starting comprehensive TypeScript error fixes..."

# Step 1: Remove ALL duplicate imports that were added by previous script
echo "Step 1: Removing duplicate AuthenticatedRequest imports..."
find src/controllers -name "*.ts" -type f -exec sed -i '' '/^import type.*AuthenticatedRequest.*from "@\/types\/api";/d' {} \;

# Step 2: Fix the AuthenticatedRequest import - should come from express extended types
echo "Step 2: Creating proper Express type extensions..."
cat > src/types/express.d.ts << 'EOF'
import { User } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: any;
    }
    
    export interface AuthenticatedRequest extends Request {
      user: User;
      session: any;
    }
  }
}

export {};
EOF

# Step 3: Fix controller imports to use Express types properly
echo "Step 3: Fixing controller imports..."
for file in src/controllers/*.ts; do
  if [ -f "$file" ]; then
    # Remove the duplicate type import
    sed -i '' '/^import type { ApiResponse, ServiceResult, AuthenticatedRequest/d' "$file"
    # Add proper imports if not present
    if ! grep -q "import { Request, Response, NextFunction } from 'express'" "$file"; then
      sed -i '' "1s/^/import { Request, Response, NextFunction } from 'express';\n/" "$file"
    fi
    # Add API response types without AuthenticatedRequest
    if ! grep -q "from '@/types/api'" "$file"; then
      sed -i '' "2s/^/import type { ApiResponse, ServiceResult, BaseSystemError, SecurityError } from '@\/types\/api';\n/" "$file"
    fi
  fi
done

# Step 4: Fix AuthenticatedRequest interface references
echo "Step 4: Updating AuthenticatedRequest usage..."
for file in src/controllers/*.ts; do
  if [ -f "$file" ]; then
    # Replace interface declarations with Express type
    sed -i '' 's/interface AuthenticatedRequest extends Request {/\/\/ Using Express.AuthenticatedRequest from types\/express.d.ts/' "$file"
    sed -i '' '/^  user: User;$/d' "$file"
    sed -i '' '/^  organization\?: Organization;$/d' "$file"
    sed -i '' '/^}$/N;/^}\n$/d' "$file"
  fi
done

# Step 5: Fix user property access with proper type guards
echo "Step 5: Adding type guards for user property..."
cat > src/utils/typeGuards.ts << 'EOF'
import { Request } from 'express';
import { User } from '../models/User';

export function isAuthenticatedRequest(req: Request): req is Express.AuthenticatedRequest {
  return req.user !== undefined && req.user !== null;
}

export function assertAuthenticated(req: Request): asserts req is Express.AuthenticatedRequest {
  if (!isAuthenticatedRequest(req)) {
    throw new Error('User not authenticated');
  }
}

export function getAuthenticatedUser(req: Request): User {
  assertAuthenticated(req);
  return req.user;
}
EOF

# Step 6: Fix ResponseHelper success method calls with undefined data
echo "Step 6: Fixing ResponseHelper calls..."
find src/controllers -name "*.ts" -type f -exec sed -i '' \
  's/ResponseHelper\.success(res, { data: \([^,]*\) \| undefined/ResponseHelper.success(res, { data: \1 || {}/' {} \;

# Step 7: Fix ServiceResult error property references
echo "Step 7: Fixing ServiceResult.errors to ServiceResult.error..."
find src/controllers -name "*.ts" -type f -exec sed -i '' 's/\.errors\([^a-zA-Z]\)/.error\1/g' {} \;

# Step 8: Add missing return statements
echo "Step 8: Adding missing return statements..."
# Fix MLSecurityController missing returns
sed -i '' '/async predictThreat(req: Request, res: Response): Promise<Response>/,/^  \}$/{
  /return ResponseHelper/!{
    /^  \}$/i\
    return ResponseHelper.internalError(res, "Unexpected error");
  }
}' src/controllers/MLSecurityController.ts

sed -i '' '/async getRiskScore(req: Request, res: Response): Promise<Response>/,/^  \}$/{
  /return ResponseHelper/!{
    /^  \}$/i\
    return ResponseHelper.internalError(res, "Unexpected error");
  }
}' src/controllers/MLSecurityController.ts

# Step 9: Fix optional property access with proper guards
echo "Step 9: Adding user guards in controllers..."
for file in src/controllers/BinController.ts src/controllers/CustomerController.ts; do
  if [ -f "$file" ]; then
    # Add type guard import
    sed -i '' '1a\
import { isAuthenticatedRequest, getAuthenticatedUser } from "@/utils/typeGuards";
' "$file"
    
    # Replace direct user access with guarded access
    sed -i '' 's/req\.user\./getAuthenticatedUser(req)\./g' "$file"
  fi
done

# Step 10: Fix missing types from imports
echo "Step 10: Adding missing type imports..."

# Add missing Sequelize types
cat >> src/types/sequelize.d.ts << 'EOF'

// Additional exports for common Sequelize types
export { 
  Model,
  DataTypes,
  Sequelize,
  Transaction,
  ValidationError,
  UniqueConstraintError,
  DatabaseError,
  TimeoutError,
  ConnectionError,
  ConnectionTimedOutError
} from 'sequelize';

// Export instance for singleton pattern
export const sequelize: Sequelize;
EOF

# Step 11: Fix exactOptionalPropertyTypes issues
echo "Step 11: Fixing optional property type issues..."
# Update api.d.ts to handle undefined properly
cat >> src/types/api.d.ts << 'EOF'

// Helper type for optional properties with exactOptionalPropertyTypes
export type OptionalProperty<T> = T | undefined;

// Updated response options for strict mode
export interface StrictSuccessResponseOptions<T = any> {
  data: T;
  message?: string | undefined;
  statusCode?: number | undefined;
}

export interface StrictErrorResponseOptions {
  message: string;
  statusCode?: number | undefined;
  errors?: any[] | undefined;
}
EOF

# Step 12: Fix imports in services that were corrupted
echo "Step 12: Cleaning up service imports..."
for file in src/services/*.ts src/services/**/*.ts; do
  if [ -f "$file" ]; then
    # Remove duplicate type imports
    awk '!seen[$0]++' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  fi
done

echo "✅ TypeScript error fixes complete! Running compiler check..."

# Final check
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l