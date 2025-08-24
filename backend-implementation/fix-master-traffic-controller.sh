#!/bin/bash

echo "🔧 Fixing MasterTrafficCoordinationController syntax errors..."

# Fix the malformed error logging statements
sed -i '' 's/error instanceof Error ? error?.message : , statusCode:)/error instanceof Error ? error.message : String(error)/g' src/controllers/MasterTrafficCoordinationController.ts

# Fix the malformed ResponseHelper.success calls
sed -i '' 's/ResponseHelper\.success(res, req, { data:/ResponseHelper.success(res, { data:/g' src/controllers/MasterTrafficCoordinationController.ts
sed -i '' 's/, message: '\''System-wide traffic coordination executed successfully'\'' });/ });/g' src/controllers/MasterTrafficCoordinationController.ts
sed -i '' 's/, message: '\''Load balancing configuration applied successfully'\'' });/ });/g' src/controllers/MasterTrafficCoordinationController.ts  
sed -i '' 's/, message: '\''System status retrieved successfully'\'' });/ });/g' src/controllers/MasterTrafficCoordinationController.ts
sed -i '' 's/, message: '\''Coordination analytics retrieved successfully'\'' });/ });/g' src/controllers/MasterTrafficCoordinationController.ts
sed -i '' 's/, message: '\''Group integration status retrieved successfully'\'' });/ });/g' src/controllers/MasterTrafficCoordinationController.ts
sed -i '' 's/, message: '\''Active coordinations retrieved successfully'\'' });/ });/g' src/controllers/MasterTrafficCoordinationController.ts
sed -i '' 's/, message: '\''Service health status retrieved successfully'\'' });/ });/g' src/controllers/MasterTrafficCoordinationController.ts

# Fix the ResponseHelper.error calls
sed -i '' 's/ResponseHelper\.error(res, { message: error instanceof Error ? error?.message : , statusCode:/ResponseHelper.error(res, { message: error instanceof Error ? error.message : "Unknown error", statusCode:/g' src/controllers/MasterTrafficCoordinationController.ts

echo "✅ MasterTrafficCoordinationController fixed!"