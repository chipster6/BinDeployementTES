#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

let hasErrors = false;

function validateSchemas() {
  const schemasDir = path.join(__dirname, '../contracts/events');
  const examplesDir = path.join(schemasDir, 'examples');
  
  if (!fs.existsSync(schemasDir)) {
    console.log('✅ No event schemas directory found - validation skipped');
    return;
  }

  // Load all schema files
  const schemaFiles = fs.readdirSync(schemasDir)
    .filter(file => file.endsWith('.schema.json'))
    .map(file => path.join(schemasDir, file));

  if (schemaFiles.length === 0) {
    console.log('✅ No schema files found - validation skipped');
    return;
  }

  console.log(`🔍 Validating ${schemaFiles.length} event schema(s)...`);

  // Validate each schema file
  schemaFiles.forEach(schemaFile => {
    try {
      const schemaContent = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
      const validate = ajv.compile(schemaContent);
      
      console.log(`✅ Schema valid: ${path.basename(schemaFile)}`);
      
      // Validate examples if they exist
      if (fs.existsSync(examplesDir)) {
        const exampleFiles = fs.readdirSync(examplesDir)
          .filter(file => file.endsWith('.json'))
          .map(file => path.join(examplesDir, file));
        
        exampleFiles.forEach(exampleFile => {
          try {
            const exampleContent = JSON.parse(fs.readFileSync(exampleFile, 'utf8'));
            const valid = validate(exampleContent);
            
            if (valid) {
              console.log(`  ✅ Example valid: ${path.basename(exampleFile)}`);
            } else {
              console.error(`  ❌ Example invalid: ${path.basename(exampleFile)}`);
              console.error('    Errors:', validate.errors);
              hasErrors = true;
            }
          } catch (error) {
            console.error(`  ❌ Failed to parse example: ${path.basename(exampleFile)}`);
            console.error('    Error:', error.message);
            hasErrors = true;
          }
        });
      }
    } catch (error) {
      console.error(`❌ Schema invalid: ${path.basename(schemaFile)}`);
      console.error('  Error:', error.message);
      hasErrors = true;
    }
  });
}

validateSchemas();

if (hasErrors) {
  console.error('\n❌ Event schema validation failed');
  process.exit(1);
} else {
  console.log('\n✅ All event schemas and examples are valid');
  process.exit(0);
}