#!/bin/bash

# Fix Sequelize Op import issues aggressively

echo "Fixing Sequelize Op imports..."

# Find all files with DataTypes.Op and replace with Op
find src -type f -name "*.ts" -exec grep -l "DataTypes\.Op" {} \; | while read file; do
    echo "Fixing DataTypes.Op in $file"
    # Replace DataTypes.Op with Op
    sed -i '' 's/DataTypes\.Op/Op/g' "$file"
    
    # Check if Op is imported, if not add it
    if ! grep -q "import.*{.*Op.*}.*from.*sequelize" "$file"; then
        # Check if there's already a sequelize import
        if grep -q "import.*{.*}.*from.*sequelize" "$file"; then
            # Add Op to existing import
            sed -i '' '/import.*{.*}.*from.*sequelize/s/{/{ Op,/' "$file"
            # Remove duplicate Op if it exists
            sed -i '' 's/Op, Op,/Op,/g' "$file"
        else
            # Add new import line
            sed -i '' '1s/^/import { Op } from "sequelize";\n/' "$file"
        fi
    fi
done

# Fix any files that use Op without importing it
find src -type f -name "*.ts" -exec grep -l "\bOp\." {} \; | while read file; do
    if ! grep -q "import.*{.*Op.*}.*from.*sequelize" "$file"; then
        echo "Adding Op import to $file"
        # Check if there's already a sequelize import
        if grep -q "import.*{.*}.*from.*sequelize" "$file"; then
            # Add Op to existing import if not already there
            if ! grep -q "Op" "$file"; then
                sed -i '' '/import.*{.*}.*from.*sequelize/s/from/ Op } from/' "$file"
                sed -i '' 's/} Op }/,Op }/g' "$file"
            fi
        else
            # Add new import at the top after the first import or comment block
            awk 'BEGIN{done=0} /^import/ && !done {print "import { Op } from \"sequelize\";"; done=1} {print}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        fi
    fi
done

echo "Op import fixes complete!"