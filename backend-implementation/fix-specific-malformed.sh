#!/bin/bash

echo "Fixing specific malformed ResponseHelper patterns..."

# Fix the specific pattern: { data: req, { data: X, message: Y } }
# Should become: { data: X, message: Y }

# First, let's fix ExternalServiceCoordinationController.ts
perl -i -pe '
    s/ResponseHelper\.success\(res,\s*req,\s*\{\s*data:\s*req,\s*\{\s*data:\s*([^}]+?),\s*message:\s*([^}]+?)\s*\}\s*\}\s*\)/ResponseHelper.success(res, req, { data: $1, message: $2 })/g
' src/controllers/ExternalServiceCoordinationController.ts

# Fix similar patterns in other files
perl -i -pe '
    s/ResponseHelper\.success\(res,\s*req,\s*\{\s*data:\s*req,\s*\{\s*data:\s*([^}]+?),\s*message:\s*([^}]+?)\s*\}\s*\}\s*\)/ResponseHelper.success(res, req, { data: $1, message: $2 })/g
' src/routes/api/analytics.ts

perl -i -pe '
    s/ResponseHelper\.success\(res,\s*req,\s*\{\s*data:\s*req,\s*\{\s*data:\s*([^}]+?),\s*message:\s*([^}]+?)\s*\}\s*\}\s*\)/ResponseHelper.success(res, req, { data: $1, message: $2 })/g
' src/routes/api/external/errorOptimization.ts

echo "Fixed malformed patterns in 3 files"