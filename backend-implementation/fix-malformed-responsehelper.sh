#!/bin/bash

echo "Fixing malformed ResponseHelper.success calls..."

# Fix pattern: ResponseHelper.success(res, req, { data: req, { data: X, message: Y } })
# Should be: ResponseHelper.success(res, req, { data: X, message: Y })
find src -name "*.ts" -type f -exec perl -i -pe '
    s/ResponseHelper\.success\(res,\s*req,\s*\{\s*data:\s*req,\s*\{\s*data:\s*([^,}]+),\s*message:\s*([^}]+)\s*\}\s*\}\s*\)/ResponseHelper.success(res, req, { data: $1, message: $2 })/g
' {} \;

# Fix nested message patterns
find src -name "*.ts" -type f -exec perl -i -pe '
    s/\{\s*data:\s*req,\s*message:\s*\{\s*data:\s*([^,}]+),\s*message:\s*([^}]+)\s*\}\s*\}/{ data: $1, message: $2 }/g
' {} \;

echo "Fixing malformed ResponseHelper.error calls..."

# Fix pattern: ResponseHelper.error(res, req, { message: req, statusCode: { message: X, errors: statusCode: Y } })
# Should be: ResponseHelper.error(res, req, { message: X, statusCode: Y })
find src -name "*.ts" -type f -exec perl -i -pe '
    s/ResponseHelper\.error\(res,\s*req,\s*\{\s*message:\s*req,\s*statusCode:\s*\{\s*message:\s*([^,]+),\s*errors:\s*statusCode:\s*(\d+)\s*\}\s*\}\s*\)/ResponseHelper.error(res, req, { message: $1, statusCode: $2 })/g
' {} \;

echo "Malformed ResponseHelper fixes complete!"