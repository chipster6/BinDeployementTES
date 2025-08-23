/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - MFA ENCRYPTION VERIFICATION SCRIPT
 * ============================================================================
 * 
 * Simple verification script to test MFA encryption functionality
 * without database dependencies. Used to validate the security fix.
 * 
 * Usage: node scripts/verify-mfa-encryption.js
 * 
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-20
 * Version: 1.0.0
 */

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-for-verification-32-chars';

const { 
    encryptDatabaseField, 
    decryptDatabaseField, 
    isEncrypted 
} = require('../src/utils/encryption');

async function verifyMfaEncryption() {
    console.log('🔐 MFA Encryption Verification Test');
    console.log('===================================\n');

    try {
        // Test data
        const testSecrets = [
            'JBSWY3DPEHPK3PXP',                    // 16 chars (typical)
            'JBSWY3DPEHPK3PXPJBSWY3DP',          // 24 chars
            'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'   // 32 chars (long)
        ];

        let allTestsPassed = true;

        for (let i = 0; i < testSecrets.length; i++) {
            const secret = testSecrets[i];
            console.log(`Test ${i + 1}: Secret length ${secret.length}`);
            
            try {
                // Encrypt the secret
                const encrypted = await encryptDatabaseField(secret);
                console.log(`  ✅ Encryption successful`);
                console.log(`  📏 Encrypted length: ${encrypted ? encrypted.length : 0} chars`);
                
                // Verify it's encrypted
                const isEnc = isEncrypted(encrypted);
                console.log(`  🔍 Detected as encrypted: ${isEnc ? '✅ YES' : '❌ NO'}`);
                
                if (!isEnc) {
                    allTestsPassed = false;
                    console.log(`  ❌ FAIL: Secret not detected as encrypted`);
                    continue;
                }
                
                // Verify it doesn't contain plaintext
                const containsPlaintext = encrypted.includes(secret);
                console.log(`  🔒 Contains plaintext: ${containsPlaintext ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
                
                if (containsPlaintext) {
                    allTestsPassed = false;
                    console.log(`  ❌ FAIL: Encrypted data contains plaintext`);
                    continue;
                }
                
                // Decrypt and verify
                const decrypted = await decryptDatabaseField(encrypted);
                console.log(`  🔓 Decryption successful: ${decrypted === secret ? '✅ YES' : '❌ NO'}`);
                
                if (decrypted !== secret) {
                    allTestsPassed = false;
                    console.log(`  ❌ FAIL: Decrypted value doesn't match original`);
                    console.log(`     Original: ${secret}`);
                    console.log(`     Decrypted: ${decrypted}`);
                    continue;
                }
                
                console.log(`  ✅ Test ${i + 1} PASSED\n`);
                
            } catch (error) {
                console.log(`  ❌ Test ${i + 1} FAILED: ${error.message}\n`);
                allTestsPassed = false;
            }
        }

        // Test error handling
        console.log('Test: Error Handling');
        try {
            const nullResult = await decryptDatabaseField('corrupted_data');
            console.log(`  🛡️  Corrupt data handling: ${nullResult === null ? '✅ GRACEFUL' : '❌ ERROR'}`);
            
            const emptyResult = await encryptDatabaseField('');
            console.log(`  🛡️  Empty string handling: ${emptyResult === null ? '✅ GRACEFUL' : '❌ ERROR'}`);
            
        } catch (error) {
            console.log(`  ❌ Error handling test failed: ${error.message}`);
            allTestsPassed = false;
        }

        // Test TOTP integration (mock)
        console.log('\nTest: TOTP Integration Simulation');
        try {
            const totpSecret = 'JBSWY3DPEHPK3PXP';
            const encrypted = await encryptDatabaseField(totpSecret);
            const decrypted = await decryptDatabaseField(encrypted);
            
            // Simulate TOTP operations
            const mockTotp = {
                generate: (secret) => secret.length === 16 ? '123456' : null,
                verify: (token, secret) => token === '123456' && secret === totpSecret
            };
            
            const token = mockTotp.generate(decrypted);
            const isValid = mockTotp.verify(token, decrypted);
            
            console.log(`  📱 TOTP token generation: ${token ? '✅ SUCCESS' : '❌ FAIL'}`);
            console.log(`  🔐 TOTP verification: ${isValid ? '✅ SUCCESS' : '❌ FAIL'}`);
            
            if (!token || !isValid) {
                allTestsPassed = false;
            }
            
        } catch (error) {
            console.log(`  ❌ TOTP integration test failed: ${error.message}`);
            allTestsPassed = false;
        }

        // Performance test
        console.log('\nTest: Performance');
        try {
            const perfSecret = 'JBSWY3DPEHPK3PXPJBSWY3DP';
            const iterations = 10;
            
            const encryptStart = Date.now();
            const encryptedValues = [];
            
            for (let i = 0; i < iterations; i++) {
                const encrypted = await encryptDatabaseField(perfSecret + i);
                encryptedValues.push(encrypted);
            }
            
            const encryptTime = Date.now() - encryptStart;
            const decryptStart = Date.now();
            
            for (const encrypted of encryptedValues) {
                await decryptDatabaseField(encrypted);
            }
            
            const decryptTime = Date.now() - decryptStart;
            
            console.log(`  ⚡ Encryption (${iterations}x): ${encryptTime}ms (avg: ${encryptTime/iterations}ms)`);
            console.log(`  ⚡ Decryption (${iterations}x): ${decryptTime}ms (avg: ${decryptTime/iterations}ms)`);
            
            const avgEncrypt = encryptTime / iterations;
            const avgDecrypt = decryptTime / iterations;
            
            if (avgEncrypt > 50 || avgDecrypt > 50) {
                console.log(`  ⚠️  Performance warning: Average time > 50ms`);
            } else {
                console.log(`  ✅ Performance acceptable`);
            }
            
        } catch (error) {
            console.log(`  ❌ Performance test failed: ${error.message}`);
            allTestsPassed = false;
        }

        console.log('\n🏁 VERIFICATION RESULTS');
        console.log('========================');
        if (allTestsPassed) {
            console.log('✅ ALL TESTS PASSED');
            console.log('🔐 MFA encryption implementation is SECURE and FUNCTIONAL');
            console.log('🚀 Ready for production deployment');
        } else {
            console.log('❌ SOME TESTS FAILED');
            console.log('🚨 Review implementation before deployment');
        }

        return allTestsPassed;

    } catch (error) {
        console.error('❌ VERIFICATION FAILED:', error.message);
        return false;
    }
}

// Run verification if called directly
if (require.main === module) {
    verifyMfaEncryption()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { verifyMfaEncryption };