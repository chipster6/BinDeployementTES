#!/bin/bash

echo "🔧 Fixing syntax errors in TypeScript files..."

# Fix AuthController.ts interfaces missing closing braces
echo "Fixing AuthController.ts interfaces..."
sed -i '' '64a\
}' src/controllers/AuthController.ts

sed -i '' '73a\
}' src/controllers/AuthController.ts

sed -i '' '80a\
}' src/controllers/AuthController.ts

# Fix the export statement at the end of files
echo "Fixing export statements..."
sed -i '' 's/^export default \([A-Za-z]*\)Controller;$/}\n\nexport default \1Controller;/g' src/controllers/AuthController.ts
sed -i '' 's/^export default \([A-Za-z]*\)Controller;$/}\n\nexport default \1Controller;/g' src/controllers/BinController.ts
sed -i '' 's/^export default \([A-Za-z]*\)Controller;$/}\n\nexport default \1Controller;/g' src/controllers/CustomerController.ts
sed -i '' 's/^export default \([A-Za-z]*\)Controller;$/}\n\nexport default \1Controller;/g' src/controllers/ExternalServiceCoordinationController.ts
sed -i '' 's/^export default \([A-Za-z]*\)Controller;$/}\n\nexport default \1Controller;/g' src/controllers/IntelligentRoutingController.ts
sed -i '' 's/^export default \([A-Za-z]*\)Controller;$/}\n\nexport default \1Controller;/g' src/controllers/MLSecurityController.ts

# Fix BaseController closing brace
echo "Fixing BaseController.ts..."
if ! grep -q "^}$" src/controllers/BaseController.ts; then
  echo "}" >> src/controllers/BaseController.ts
fi

# Remove duplicate import statements
echo "Removing duplicate imports..."
for file in src/controllers/*.ts; do
  if [ -f "$file" ]; then
    # Remove duplicate type imports on consecutive lines
    awk '!(/^import type .* from/ && prev ~ /^import type .* from/) {print} {prev=$0}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  fi
done

# Fix CustomerController interface if needed
echo "Checking CustomerController.ts..."
if grep -q "interface CreateCustomerRequest {" src/controllers/CustomerController.ts; then
  # Find the line number and add closing brace if missing
  line=$(grep -n "interface CreateCustomerRequest {" src/controllers/CustomerController.ts | cut -d: -f1)
  # Check if there's a closing brace within 15 lines
  if ! sed -n "${line},$((line+15))p" src/controllers/CustomerController.ts | grep -q "^}$"; then
    # Add closing brace after the last property
    sed -i '' '/organizationId?: string;/a\
}' src/controllers/CustomerController.ts
  fi
fi

echo "✅ Syntax fixes complete! Running compiler check..."

# Final check
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l