#!/bin/bash

echo "🔧 Fixing ResponseHelper method calls to use new signature..."

# Fix ResponseHelper.error calls with 3 arguments
echo "Step 1: Fixing ResponseHelper.error calls..."
find src/controllers -name "*.ts" -type f -exec sed -i '' \
  's/ResponseHelper\.error(res, \([^,]*\), \([^)]*\))/ResponseHelper.error(res, { message: \1, statusCode: \2 })/g' {} \;

# Fix ResponseHelper.success calls with 3 arguments  
echo "Step 2: Fixing ResponseHelper.success calls..."
find src/controllers -name "*.ts" -type f -exec sed -i '' \
  's/ResponseHelper\.success(res, \([^,]*\), \([^)]*\))/ResponseHelper.success(res, { data: \1, message: \2 })/g' {} \;

# Fix ResponseHelper.created calls
echo "Step 3: Fixing ResponseHelper.created calls..."
find src/controllers -name "*.ts" -type f -exec sed -i '' \
  's/ResponseHelper\.created(res, \([^,]*\), \([^)]*\))/ResponseHelper.created(res, \1, \2)/g' {} \;

# Fix ResponseHelper.badRequest calls with 3 arguments
echo "Step 4: Fixing ResponseHelper.badRequest calls..."
find src/controllers -name "*.ts" -type f -exec sed -i '' \
  's/ResponseHelper\.badRequest(res, \([^,]*\), \([^)]*\))/ResponseHelper.badRequest(res, \1, \2)/g' {} \;

# Fix ResponseHelper.paginated calls with 4 arguments
echo "Step 5: Fixing ResponseHelper.paginated calls..."
find src/controllers -name "*.ts" -type f -exec sed -i '' \
  's/ResponseHelper\.paginated(res, \([^,]*\), \([^,]*\), \([^)]*\))/ResponseHelper.paginated(res, \1, \2)/g' {} \;

echo "✅ ResponseHelper calls fixed!"