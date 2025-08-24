#!/bin/bash

# Fix ResponseHelper.success calls with 3 arguments (res, data, message)
echo "Fixing ResponseHelper.success calls..."

# Pattern 1: ResponseHelper.success(res, data, message)
find src -name "*.ts" -type f -exec perl -i -pe '
    s/ResponseHelper\.success\(res,\s*([^,]+),\s*([^)]+)\)/ResponseHelper.success(res, req, { data: $1, message: $2 })/g
' {} \;

# Pattern 2: ResponseHelper.success(res, data) - 2 arguments
find src -name "*.ts" -type f -exec perl -i -pe '
    s/ResponseHelper\.success\(res,\s*([^)]+)\)(?!\s*,)/ResponseHelper.success(res, req, { data: $1 })/g
' {} \;

# Fix ResponseHelper.error calls with wrong patterns
echo "Fixing ResponseHelper.error calls..."

# Pattern 1: ResponseHelper.error(res, message, statusCode, errors)
find src -name "*.ts" -type f -exec perl -i -pe '
    s/ResponseHelper\.error\(res,\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/ResponseHelper.error(res, req, { message: $1, statusCode: $2, errors: $3 })/g
' {} \;

# Pattern 2: ResponseHelper.error(res, message, statusCode)
find src -name "*.ts" -type f -exec perl -i -pe '
    s/ResponseHelper\.error\(res,\s*([^,]+),\s*(\d+)\)/ResponseHelper.error(res, req, { message: $1, statusCode: $2 })/g
' {} \;

echo "ResponseHelper pattern fixes complete!"