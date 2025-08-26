#!/usr/bin/env node
// Development seed script
// Agent: db_architect
// Scope: Sample data for development

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/wm_dev';

async function seedDev() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('🌱 Seeding development data...');
    
    // Sample bins
    await client.query(`
      INSERT INTO bins (id, tenant_id, serial_number, type, capacity_m3, customer_id, location, status)
      VALUES 
        (gen_random_uuid(), gen_random_uuid(), 'BIN001', 'GENERAL', 1.5, gen_random_uuid(), ST_GeogFromText('POINT(-122.4194 37.7749)'), 'ACTIVE'),
        (gen_random_uuid(), gen_random_uuid(), 'BIN002', 'RECYCLING', 2.0, gen_random_uuid(), ST_GeogFromText('POINT(-122.4094 37.7849)'), 'ACTIVE')
      ON CONFLICT (tenant_id, serial_number) DO NOTHING
    `);
    
    console.log('✅ Development data seeded successfully');
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  seedDev();
}

module.exports = { seedDev };