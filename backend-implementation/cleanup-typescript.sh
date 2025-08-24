#!/bin/bash

echo "🔧 Comprehensive TypeScript cleanup..."

# Step 1: Remove duplicate import lines
echo "Step 1: Removing duplicate imports..."
for file in src/controllers/*.ts src/services/*.ts src/services/**/*.ts src/models/*.ts; do
  if [ -f "$file" ]; then
    # Remove consecutive duplicate imports
    awk '!seen[$0]++ || !/^import/' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  fi
done

# Step 2: Fix "No newline at end of file" markers that got inserted into code
echo "Step 2: Removing 'No newline' markers..."
find src -name "*.ts" -type f -exec sed -i '' 's/ No newline at end of file//g' {} \;

# Step 3: Fix broken interface declarations
echo "Step 3: Fixing interface declarations..."
for file in src/controllers/*.ts; do
  if [ -f "$file" ]; then
    # Fix interfaces that lost their closing braces
    sed -i '' '/^interface.*{$/,/^[^}]/{
      /^interface/{
        h
        d
      }
      /^[a-zA-Z]/{
        /^}$/!{
          N
          /\n}/{
            P
            d
          }
          /\n[a-zA-Z]/{
            s/\n/\n}\n/
          }
        }
      }
    }' "$file"
  fi
done

# Step 4: Fix class declarations at end of files
echo "Step 4: Fixing class declarations..."
for file in src/controllers/*.ts; do
  if [ -f "$file" ]; then
    # Ensure classes are properly closed
    if grep -q "^export default.*Controller" "$file"; then
      # Check if there's a closing brace before export
      if ! tail -5 "$file" | grep -q "^}$"; then
        sed -i '' '/^export default.*Controller/i\
}' "$file"
      fi
    fi
  fi
done

# Step 5: Remove lines with just "};"
echo "Step 5: Cleaning up malformed closing braces..."
find src -name "*.ts" -type f -exec sed -i '' '/^};$/d' {} \;

# Step 6: Fix specific known issues
echo "Step 6: Fixing specific known issues..."

# Fix AuthController interfaces
cat > /tmp/auth-interfaces.ts << 'EOF'
/**
 * Registration request interface
 */
interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
  organizationId?: string;
  gdprConsentGiven: boolean;
}

/**
 * Login request interface
 */
interface LoginRequest {
  email: string;
  password: string;
  mfaToken?: string;
  rememberMe?: boolean;
  deviceFingerprint?: string;
}

/**
 * Password change request interface
 */
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
EOF

# Replace the broken interfaces in AuthController
if [ -f "src/controllers/AuthController.ts" ]; then
  # Extract the file before interfaces
  sed -n '1,/^interface RegisterRequest/p' src/controllers/AuthController.ts | sed '$d' > /tmp/auth-before.ts
  
  # Extract the file after interfaces
  sed -n '/^export const authRateLimit/,$p' src/controllers/AuthController.ts > /tmp/auth-after.ts
  
  # Combine
  cat /tmp/auth-before.ts /tmp/auth-interfaces.ts /tmp/auth-after.ts > src/controllers/AuthController.ts
fi

# Step 7: Final validation
echo "Step 7: Running final validation..."
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l