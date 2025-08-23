/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - MFA SECRET ENCRYPTION SCRIPT
 * ============================================================================
 * 
 * Script to encrypt existing plaintext MFA secrets in the database.
 * This is a critical security fix to address plaintext MFA storage vulnerability.
 * 
 * SECURITY IMPACT: Critical
 * - Encrypts all existing MFA secrets with AES-256-GCM
 * - Maintains TOTP functionality through transparent decryption
 * - Creates audit trail of encryption operations
 * 
 * Usage: npm run migrate:encrypt-mfa
 * 
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-20
 * Version: 1.0.0
 */

const { database } = require('../src/config/database');
const { encryptDatabaseField, decryptDatabaseField, isEncrypted } = require('../src/utils/encryption');

async function encryptExistingMfaSecrets() {
    console.log('Starting MFA secret encryption migration...');
    
    const transaction = await database.transaction();
    
    try {
        // Find all users with unencrypted MFA secrets
        const [users] = await database.query(`
            SELECT id, email, mfa_secret 
            FROM core.users 
            WHERE mfa_secret IS NOT NULL 
            AND mfa_secret != ''
            AND deleted_at IS NULL
        `, { transaction });

        console.log(`Found ${users.length} users with MFA secrets to encrypt`);

        let encryptedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                // Check if already encrypted
                if (isEncrypted(user.mfa_secret)) {
                    console.log(`User ${user.email}: MFA secret already encrypted, skipping`);
                    skippedCount++;
                    continue;
                }

                // Encrypt the MFA secret
                const encryptedSecret = await encryptDatabaseField(user.mfa_secret);
                
                if (!encryptedSecret) {
                    console.error(`User ${user.email}: Encryption returned null`);
                    errorCount++;
                    continue;
                }

                // Update the database with encrypted secret
                await database.query(`
                    UPDATE core.users 
                    SET mfa_secret = :encrypted_secret, 
                        updated_at = NOW()
                    WHERE id = :user_id
                `, {
                    replacements: {
                        encrypted_secret: encryptedSecret,
                        user_id: user.id
                    },
                    transaction
                });

                console.log(`User ${user.email}: MFA secret encrypted successfully`);
                encryptedCount++;

                // Verify encryption worked by attempting decryption
                const decryptedSecret = await decryptDatabaseField(encryptedSecret);
                if (decryptedSecret !== user.mfa_secret) {
                    throw new Error(`Encryption verification failed for user ${user.email}`);
                }

            } catch (error) {
                console.error(`User ${user.email}: Encryption failed:`, error.message);
                errorCount++;
            }
        }

        // Log migration results
        await database.query(`
            INSERT INTO core.migration_log (migration_name, status, completed_at, notes)
            VALUES (
                '004-encrypt-mfa-secrets-data',
                'completed',
                NOW(),
                :notes
            )
        `, {
            replacements: {
                notes: `Encrypted: ${encryptedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`
            },
            transaction
        });

        if (errorCount > 0) {
            throw new Error(`Migration completed with ${errorCount} errors`);
        }

        await transaction.commit();
        
        console.log('\n=== MFA Secret Encryption Migration Complete ===');
        console.log(`Successfully encrypted: ${encryptedCount} MFA secrets`);
        console.log(`Already encrypted (skipped): ${skippedCount}`);
        console.log(`Errors encountered: ${errorCount}`);
        console.log('================================================\n');

        return true;

    } catch (error) {
        await transaction.rollback();
        console.error('Migration failed:', error.message);
        
        // Log failure
        await database.query(`
            INSERT INTO core.migration_log (migration_name, status, completed_at, error_message)
            VALUES (
                '004-encrypt-mfa-secrets-data',
                'failed',
                NOW(),
                :error_message
            )
        `, {
            replacements: {
                error_message: error.message
            }
        });
        
        return false;
    }
}

// Test function to verify TOTP still works after encryption
async function testMfaEncryption() {
    console.log('\nTesting MFA encryption functionality...');
    
    try {
        const { generateSecret, verify } = require('otplib/authenticator');
        
        // Generate test secret
        const testSecret = generateSecret();
        console.log('Generated test secret:', testSecret);
        
        // Encrypt it
        const encrypted = await encryptDatabaseField(testSecret);
        console.log('Encrypted successfully');
        
        // Decrypt it
        const decrypted = await decryptDatabaseField(encrypted);
        console.log('Decrypted successfully');
        
        // Verify they match
        if (testSecret !== decrypted) {
            throw new Error('Encryption/decryption test failed - secrets do not match');
        }
        
        console.log('✅ MFA encryption test passed');
        return true;
        
    } catch (error) {
        console.error('❌ MFA encryption test failed:', error.message);
        return false;
    }
}

// Main execution
async function main() {
    try {
        console.log('MFA Secret Encryption Migration');
        console.log('================================\n');
        
        // Test encryption functionality first
        const testPassed = await testMfaEncryption();
        if (!testPassed) {
            console.error('Encryption test failed - aborting migration');
            process.exit(1);
        }
        
        // Run the migration
        const migrationSuccess = await encryptExistingMfaSecrets();
        
        if (migrationSuccess) {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        } else {
            console.error('❌ Migration failed');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    } finally {
        await database.close();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    encryptExistingMfaSecrets,
    testMfaEncryption
};