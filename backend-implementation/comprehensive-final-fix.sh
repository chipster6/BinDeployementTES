#!/bin/bash

echo "🔧 Comprehensive final TypeScript fixes..."

# Step 1: Fix IntelligentRoutingController ResponseHelper calls
echo "Step 1: Fixing IntelligentRoutingController ResponseHelper calls..."
# Fix badRequest calls with req as second argument
sed -i '' 's/ResponseHelper\.badRequest(res, req, /ResponseHelper.badRequest(res, /g' src/controllers/IntelligentRoutingController.ts
# Fix success calls with req as second argument
sed -i '' 's/ResponseHelper\.success(res, req, /ResponseHelper.success(res, /g' src/controllers/IntelligentRoutingController.ts
# Fix error calls with req as second argument
sed -i '' 's/ResponseHelper\.error(res, req, /ResponseHelper.error(res, /g' src/controllers/IntelligentRoutingController.ts
# Fix internalError calls with req as second argument
sed -i '' 's/ResponseHelper\.internalError(res, req, /ResponseHelper.internalError(res, /g' src/controllers/IntelligentRoutingController.ts
# Fix forbidden calls with req as second argument
sed -i '' 's/ResponseHelper\.forbidden(res, req, /ResponseHelper.forbidden(res, /g' src/controllers/IntelligentRoutingController.ts
# Fix notFound calls with req as second argument
sed -i '' 's/ResponseHelper\.notFound(res, req, /ResponseHelper.notFound(res, /g' src/controllers/IntelligentRoutingController.ts

# Step 2: Fix User interface by adding id property
echo "Step 2: Creating User interface extension..."
cat > src/types/express.d.ts << 'EOF'
import { User as UserModel } from '@/models/User';

declare global {
  namespace Express {
    interface User extends UserModel {
      id: string;
      organizationId?: string;
      role?: string;
    }
    
    interface Request {
      user?: User;
    }
  }
}

export {};
EOF

# Step 3: Fix Sequelize Op export
echo "Step 3: Fixing Sequelize Op exports..."
sed -i '' 's/Sequelize\.Op/Op/g' src/**/*.ts 2>/dev/null || true

# Step 4: Add type-only imports where needed
echo "Step 4: Adding type-only imports..."
find src -name "*.ts" -type f -exec sed -i '' \
  's/^import { ServiceResult }/import type { ServiceResult }/' {} \; 2>/dev/null || true

echo "✅ Comprehensive fixes complete!"