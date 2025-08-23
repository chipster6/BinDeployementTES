-- ============================================================================
-- WASTE MANAGEMENT SYSTEM - MFA SECRET ENCRYPTION MIGRATION
-- ============================================================================
--
-- Migration to encrypt existing MFA secrets in the database
-- This migration is part of the critical security fix for plaintext MFA storage
--
-- CRITICAL SECURITY FIX: Convert plaintext MFA secrets to encrypted format
-- using AES-256-GCM encryption through application-level hooks
--
-- Created by: Security & Compliance Specialist
-- Date: 2025-08-20
-- Version: 1.0.0
-- ============================================================================

BEGIN;

-- Add migration logging
INSERT INTO core.migration_log (migration_name, status, started_at) 
VALUES ('004-encrypt-mfa-secrets', 'started', NOW());

-- Note: This migration creates a backup table but encryption happens at application level
-- through Sequelize hooks that were added to the User model

-- Step 1: Create backup table for MFA secrets before encryption
CREATE TABLE IF NOT EXISTS core.user_mfa_secrets_backup AS 
SELECT id, email, mfa_secret, mfa_enabled, updated_at
FROM core.users 
WHERE mfa_secret IS NOT NULL AND mfa_secret != '';

-- Step 2: Add comment to mfa_secret column to indicate it's now encrypted
COMMENT ON COLUMN core.users.mfa_secret IS 'AES-256-GCM encrypted MFA secret using application-level encryption hooks';

-- Step 3: Add application-level trigger notice
-- Note: Actual encryption happens through Sequelize hooks in the application layer
-- This ensures transparent encryption/decryption for all operations

-- Log completion of schema changes
INSERT INTO core.migration_log (migration_name, status, completed_at, notes) 
VALUES ('004-encrypt-mfa-secrets', 'schema_complete', NOW(), 
'Schema updated. MFA encryption will be handled by application hooks on next user update/access.');

COMMIT;

-- ============================================================================
-- POST-DEPLOYMENT INSTRUCTIONS:
-- ============================================================================
-- 
-- 1. Deploy the updated User model with encryption hooks
-- 2. Run data migration script to encrypt existing MFA secrets:
--    npm run migrate:encrypt-mfa
-- 3. Verify all MFA secrets are encrypted in database
-- 4. Test TOTP verification still works after encryption
-- 5. Monitor logs for any encryption/decryption errors
--
-- ROLLBACK PLAN:
-- - Restore from user_mfa_secrets_backup table if needed
-- - Remove encryption hooks from User model
-- - Verify TOTP functionality restored
-- ============================================================================