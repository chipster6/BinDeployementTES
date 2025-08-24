#!/bin/bash

echo "🔧 Fixing remaining controller syntax errors..."

# Fix the extra closing braces in MasterTrafficCoordinationController
sed -i '' 's/, statusCode: 500 } });/, statusCode: 500 });/g' src/controllers/MasterTrafficCoordinationController.ts
sed -i '' 's/, statusCode: 503 } });/, statusCode: 503 });/g' src/controllers/MasterTrafficCoordinationController.ts

# Fix error.statusCode reference issues
sed -i '' 's/ResponseHelper\.error(res, { message: error instanceof Error ? error\.message : "Unknown error", statusCode: error\.statusCode });/if (error instanceof AppError) { ResponseHelper.error(res, { message: error.message, statusCode: error.statusCode }); } else { ResponseHelper.error(res, { message: "Unknown error", statusCode: 500 }); }/g' src/controllers/MasterTrafficCoordinationController.ts

echo "✅ Controller syntax errors fixed!"