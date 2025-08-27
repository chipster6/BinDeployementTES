#!/bin/bash

# TypeScript Modified Files Checker
# 
# Quickly checks TypeScript errors only in recently modified files
# for faster feedback during development

set -e

echo "🔍 Checking TypeScript errors in recently modified files..."

# Get list of modified TypeScript files (staged + unstaged)
MODIFIED_FILES=$(git diff --name-only HEAD~1 HEAD | grep '\.ts$' | grep '^src/' || true)

if [ -z "$MODIFIED_FILES" ]; then
    echo "📝 No modified TypeScript files found in src/"
    exit 0
fi

echo "Checking files: $MODIFIED_FILES"

# Check only modified files for TypeScript errors
ERROR_COUNT=0
for file in $MODIFIED_FILES; do
    if [ -f "$file" ]; then
        # Run TypeScript check on individual file
        if ! npx tsc --noEmit --skipLibCheck "$file" 2>/dev/null; then
            ERROR_COUNT=$((ERROR_COUNT + 1))
            echo "❌ Errors found in: $file"
        fi
    fi
done

if [ $ERROR_COUNT -eq 0 ]; then
    echo "✅ No TypeScript errors in modified files!"
else
    echo "❌ Found TypeScript errors in $ERROR_COUNT modified files"
    echo "Run 'npm run type-check' for detailed error information"
    exit 1
fi