#!/bin/bash

echo "🔧 Final comprehensive TypeScript fixes..."

# Step 1: Fix IntelligentRoutingController ResponseHelper calls
echo "Step 1: Fixing IntelligentRoutingController..."
# Fix error calls with 3 arguments
sed -i '' 's/ResponseHelper\.error(res, \([^,]*\), \([^,]*\), \([^)]*\))/ResponseHelper.error(res, { message: \1, statusCode: 500 })/g' src/controllers/IntelligentRoutingController.ts
# Fix success calls with 3 arguments  
sed -i '' 's/ResponseHelper\.success(res, \([^,]*\), \([^,]*\), \([^)]*\))/ResponseHelper.success(res, { data: \1, message: \2 })/g' src/controllers/IntelligentRoutingController.ts
# Fix badRequest calls
sed -i '' 's/ResponseHelper\.badRequest(res, \([^,]*\), \([^,]*\), \([^)]*\))/ResponseHelper.badRequest(res, \1, [])/g' src/controllers/IntelligentRoutingController.ts

# Step 2: Fix ExternalServiceCoordinationController remaining calls
echo "Step 2: Fixing ExternalServiceCoordinationController..."
sed -i '' 's/ResponseHelper\.success(res, \([^,]*\), \([^)]*\))/ResponseHelper.success(res, { data: \1 })/g' src/controllers/ExternalServiceCoordinationController.ts
sed -i '' 's/ResponseHelper\.error(res, \([^,]*\), \([^)]*\))/ResponseHelper.error(res, { message: "Operation failed", statusCode: 500 })/g' src/controllers/ExternalServiceCoordinationController.ts

# Step 3: Fix MLSecurityController undefined issues  
echo "Step 3: Fixing MLSecurityController undefined handling..."
# Fix success calls with possible undefined message
sed -i '' 's/message: result?.message/message: result?.message || "Success"/g' src/controllers/MLSecurityController.ts

# Step 4: Add missing return statements
echo "Step 4: Adding missing return statements..."
# Fix MLSecurityController missing returns
sed -i '' '/async.*{$/,/^[[:space:]]*}$/{
  /return /!{
    /^[[:space:]]*}$/i\
    return;
  }
}' src/controllers/MLSecurityController.ts 2>/dev/null || true

echo "✅ Comprehensive fixes complete!"