#!/usr/bin/env node

/**
 * ============================================================================
 * CONTRACT TYPE GENERATION SCRIPT
 * ============================================================================
 * 
 * Generates TypeScript types from OpenAPI contracts and GraphQL schema.
 * Ensures type safety during microservices extraction.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONTRACTS_DIR = path.join(__dirname, '../shared/contracts');
const OUTPUT_DIR = path.join(__dirname, '../shared/types/src/contracts');

async function generateOpenAPITypes() {
  console.log('🔄 Generating OpenAPI contract types...');
  
  const contracts = [
    'auth-service.yaml',
    'operations-service.yaml', 
    'spatial-routing-service.yaml'
  ];
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  for (const contract of contracts) {
    const contractPath = path.join(CONTRACTS_DIR, contract);
    const serviceName = contract.replace('-service.yaml', '');
    const outputFile = path.join(OUTPUT_DIR, `${serviceName}-types.ts`);
    
    if (fs.existsSync(contractPath)) {
      try {
        // Using openapi-typescript for type generation
        execSync(`npx openapi-typescript ${contractPath} -o ${outputFile}`, {
          stdio: 'inherit'
        });
        console.log(`✅ Generated types for ${serviceName} service`);
      } catch (error) {
        console.error(`❌ Failed to generate types for ${serviceName}:`, error.message);
      }
    }
  }
}

async function generateGraphQLTypes() {
  console.log('🔄 Generating GraphQL schema types...');
  
  const schemaPath = path.join(CONTRACTS_DIR, 'federated-schema.graphql');
  const outputFile = path.join(OUTPUT_DIR, 'graphql-types.ts');
  
  if (fs.existsSync(schemaPath)) {
    try {
      // Using graphql-codegen for type generation
      execSync(`npx graphql-codegen --schema ${schemaPath} --generates ${outputFile}`, {
        stdio: 'inherit'
      });
      console.log('✅ Generated GraphQL federation types');
    } catch (error) {
      console.error('❌ Failed to generate GraphQL types:', error.message);
    }
  }
}

async function createIndexFile() {
  console.log('🔄 Creating contract types index...');
  
  const indexContent = `/**
 * Generated contract types for microservices
 */

// OpenAPI contract types
export * from './auth-types';
export * from './operations-types';  
export * from './spatial-routing-types';

// GraphQL federation types
export * from './graphql-types';

// Re-export domain events for convenience
export * from '../index';
`;

  const indexPath = path.join(OUTPUT_DIR, 'index.ts');
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Created contract types index');
}

async function main() {
  console.log('🚀 Starting contract type generation...');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  
  try {
    await generateOpenAPITypes();
    await generateGraphQLTypes(); 
    await createIndexFile();
    
    console.log('🎉 Contract type generation completed successfully!');
    console.log('📦 Next steps:');
    console.log('   1. Install dependencies: npm install -D openapi-typescript @graphql-codegen/cli');
    console.log('   2. Run: npm run build:contracts');
    console.log('   3. Import types: import { AuthService } from "@waste-mgmt/types/contracts"');
    
  } catch (error) {
    console.error('💥 Contract type generation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateOpenAPITypes, generateGraphQLTypes };