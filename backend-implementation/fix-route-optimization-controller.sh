#!/bin/bash

echo "🔧 Fixing RouteOptimizationController errors..."

# Fix the malformed ResponseHelper.error calls with result.errors
sed -i '' 's/, statusCode: 400, result\.errors });/, statusCode: 400, errors: result?.errors || [] });/g' src/controllers/RouteOptimizationController.ts
sed -i '' 's/, statusCode: 500, result\.errors });/, statusCode: 500, errors: result?.errors || [] });/g' src/controllers/RouteOptimizationController.ts

echo "✅ RouteOptimizationController fixed!"