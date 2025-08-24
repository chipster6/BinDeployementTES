#!/bin/bash

echo "🔧 Fixing ResponseHelper calls properly..."

# Step 1: Fix MLSecurityController malformed calls
echo "Step 1: Fixing MLSecurityController ResponseHelper calls..."
sed -i '' 's/ResponseHelper\.error(res, req, {/ResponseHelper.error(res, {/g' src/controllers/MLSecurityController.ts
sed -i '' 's/ResponseHelper\.error(res, { message: result?.message, statusCode: 500, result\.errors/ResponseHelper.error(res, { message: result?.message || "Operation failed", statusCode: 500, errors: result?.errors || []/g' src/controllers/MLSecurityController.ts
sed -i '' 's/ResponseHelper\.error(res, { message: result?.message, statusCode: 404, result\.errors/ResponseHelper.error(res, { message: result?.message || "Not found", statusCode: 404, errors: result?.errors || []/g' src/controllers/MLSecurityController.ts

# Step 2: Fix MasterTrafficCoordinationController malformed calls
echo "Step 2: Fixing MasterTrafficCoordinationController ResponseHelper calls..."
sed -i '' 's/ResponseHelper\.error(res, { message: req, statusCode: { message:/ResponseHelper.error(res, { message:/g' src/controllers/MasterTrafficCoordinationController.ts
sed -i '' 's/ }), statusCode: \([0-9]*\) });/, statusCode: \1 });/g' src/controllers/MasterTrafficCoordinationController.ts
sed -i '' 's/String(error })//g' src/controllers/MasterTrafficCoordinationController.ts
sed -i '' 's/String(error/, statusCode:/g' src/controllers/MasterTrafficCoordinationController.ts

# Step 3: Fix ExternalServiceCoordinationController malformed calls
echo "Step 3: Fixing ExternalServiceCoordinationController ResponseHelper calls..."
sed -i '' 's/ResponseHelper\.success(res, { data: req, message: { data:/ResponseHelper.success(res, { data:/g' src/controllers/ExternalServiceCoordinationController.ts
sed -i '' 's/, message: '\''[^'\'']*'\'' } });/ });/g' src/controllers/ExternalServiceCoordinationController.ts
sed -i '' 's/ResponseHelper\.error(res, { message: req, statusCode: { message:/ResponseHelper.error(res, { message:/g' src/controllers/ExternalServiceCoordinationController.ts
sed -i '' 's/, statusCode: [0-9]* } });/, statusCode: 500 });/g' src/controllers/ExternalServiceCoordinationController.ts

# Step 4: Fix IntelligentRoutingController calls
echo "Step 4: Fixing IntelligentRoutingController ResponseHelper calls..."
find src/controllers -name "IntelligentRoutingController.ts" -exec sed -i '' \
  's/ResponseHelper\.error(res, \([^,]*\), \([^,]*\), \([^)]*\))/ResponseHelper.error(res, { message: \1, statusCode: 500 })/g' {} \;

find src/controllers -name "IntelligentRoutingController.ts" -exec sed -i '' \
  's/ResponseHelper\.success(res, \([^,]*\), \([^,]*\), \([^)]*\))/ResponseHelper.success(res, { data: \1, message: \2 })/g' {} \;

echo "✅ ResponseHelper calls fixed properly!"