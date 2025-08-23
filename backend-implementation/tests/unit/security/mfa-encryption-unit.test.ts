/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - MFA ENCRYPTION UNIT TESTS
 * ============================================================================
 *
 * Unit tests for MFA secret encryption functionality without database dependency.
 * Tests the core encryption/decryption logic that will be used in Sequelize hooks.
 * 
 * SECURITY TEST COVERAGE:
 * - Encryption and decryption functions work correctly
 * - Encrypted data format validation
 * - Error handling for corrupt data
 * - Integration with TOTP functionality
 * 
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-20
 * Version: 1.0.0
 */

import { 
  encryptDatabaseField, 
  decryptDatabaseField, 
  isEncrypted 
} from '../../../src/utils/encryption';

describe('MFA Secret Encryption Unit Tests', () => {
  const testSecret = 'JBSWY3DPEHPK3PXP'; // Example TOTP secret
  const longerSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'; // Longer test secret

  describe('Encryption and Decryption Functions', () => {
    it('should encrypt and decrypt MFA secrets correctly', async () => {
      // Encrypt the secret
      const encrypted = await encryptDatabaseField(testSecret);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testSecret);
      expect(encrypted).not.toBeNull();
      
      // Verify it's encrypted
      expect(isEncrypted(encrypted!)).toBe(true);
      
      // Decrypt and verify
      const decrypted = await decryptDatabaseField(encrypted!);
      expect(decrypted).toBe(testSecret);
    });

    it('should handle different secret lengths', async () => {
      // Test with longer secret
      const encrypted = await encryptDatabaseField(longerSecret);
      expect(encrypted).toBeDefined();
      expect(isEncrypted(encrypted!)).toBe(true);
      
      const decrypted = await decryptDatabaseField(encrypted!);
      expect(decrypted).toBe(longerSecret);
    });

    it('should return null for null/empty inputs', async () => {
      expect(await encryptDatabaseField('')).toBeNull();
      expect(await encryptDatabaseField(null as any)).toBeNull();
      expect(await decryptDatabaseField(null)).toBeNull();
      expect(await decryptDatabaseField('')).toBeNull();
    });

    it('should handle whitespace in input', async () => {
      const secretWithSpaces = '  ' + testSecret + '  ';
      const encrypted = await encryptDatabaseField(secretWithSpaces);
      expect(encrypted).toBeDefined();
      
      const decrypted = await decryptDatabaseField(encrypted!);
      expect(decrypted).toBe(testSecret); // Should be trimmed
    });
  });

  describe('Encrypted Data Format Validation', () => {
    it('should produce different encrypted values for same input', async () => {
      // Encrypt the same secret multiple times
      const encrypted1 = await encryptDatabaseField(testSecret);
      const encrypted2 = await encryptDatabaseField(testSecret);
      
      expect(encrypted1).not.toBe(encrypted2); // Should be different due to random IV
      
      // Both should decrypt to same value
      const decrypted1 = await decryptDatabaseField(encrypted1!);
      const decrypted2 = await decryptDatabaseField(encrypted2!);
      
      expect(decrypted1).toBe(testSecret);
      expect(decrypted2).toBe(testSecret);
    });

    it('should correctly identify encrypted data', async () => {
      const encrypted = await encryptDatabaseField(testSecret);
      expect(isEncrypted(encrypted!)).toBe(true);
      
      // Test false positives
      expect(isEncrypted(testSecret)).toBe(false);
      expect(isEncrypted('random_string')).toBe(false);
      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted('{"invalid": "json"}')).toBe(false);
    });

    it('should create base64-encoded JSON structure', async () => {
      const encrypted = await encryptDatabaseField(testSecret);
      expect(encrypted).toBeDefined();
      
      // Verify it's base64
      expect(() => Buffer.from(encrypted!, 'base64')).not.toThrow();
      
      // Verify JSON structure
      const decoded = Buffer.from(encrypted!, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      
      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('tag');
      expect(parsed).toHaveProperty('keyVersion');
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted encrypted data gracefully', async () => {
      const corruptedData = 'corrupted_base64_data';
      const result = await decryptDatabaseField(corruptedData);
      expect(result).toBeNull(); // Should return null, not throw
    });

    it('should handle invalid JSON in encrypted data', async () => {
      const invalidJson = Buffer.from('invalid json data').toString('base64');
      const result = await decryptDatabaseField(invalidJson);
      expect(result).toBeNull();
    });

    it('should handle missing required fields', async () => {
      // Create valid base64 JSON but missing required fields
      const incompleteData = {
        data: 'some_data',
        // Missing iv and tag
      };
      const encoded = Buffer.from(JSON.stringify(incompleteData)).toString('base64');
      
      const result = await decryptDatabaseField(encoded);
      expect(result).toBeNull();
    });
  });

  describe('TOTP Integration', () => {
    it('should work with TOTP library after encryption/decryption', async () => {
      // Mock TOTP library
      const authenticator = {
        generateSecret: () => testSecret,
        generate: (secret: string) => '123456',
        verify: ({ token, secret }: { token: string, secret: string }) => {
          return token === '123456' && secret === testSecret;
        }
      };

      // Simulate MFA secret generation and encryption
      const originalSecret = authenticator.generateSecret();
      const encrypted = await encryptDatabaseField(originalSecret);
      const decrypted = await decryptDatabaseField(encrypted!);

      // Verify TOTP still works with decrypted secret
      const token = authenticator.generate(decrypted!);
      const isValid = authenticator.verify({ token, secret: decrypted! });
      
      expect(isValid).toBe(true);
      expect(decrypted).toBe(originalSecret);
    });

    it('should handle typical TOTP secret formats', async () => {
      const totpSecrets = [
        'JBSWY3DPEHPK3PXP',           // 16 chars
        'JBSWY3DPEHPK3PXPJBSWY3DP',  // 24 chars  
        'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', // 32 chars
      ];

      for (const secret of totpSecrets) {
        const encrypted = await encryptDatabaseField(secret);
        expect(encrypted).toBeDefined();
        expect(isEncrypted(encrypted!)).toBe(true);
        
        const decrypted = await decryptDatabaseField(encrypted!);
        expect(decrypted).toBe(secret);
      }
    });
  });

  describe('Performance and Security', () => {
    it('should encrypt and decrypt within reasonable time', async () => {
      const start = Date.now();
      
      const encrypted = await encryptDatabaseField(testSecret);
      const encryptTime = Date.now() - start;
      
      const decryptStart = Date.now();
      const decrypted = await decryptDatabaseField(encrypted!);
      const decryptTime = Date.now() - decryptStart;
      
      // Should complete within 100ms each (very generous for unit tests)
      expect(encryptTime).toBeLessThan(100);
      expect(decryptTime).toBeLessThan(100);
      expect(decrypted).toBe(testSecret);
    });

    it('should not leak plaintext in encrypted output', async () => {
      const encrypted = await encryptDatabaseField(testSecret);
      expect(encrypted).toBeDefined();
      
      // Verify plaintext secret doesn't appear in encrypted data
      expect(encrypted!.toLowerCase()).not.toContain(testSecret.toLowerCase());
      
      // Verify it doesn't look like base32 (TOTP format)
      expect(encrypted!).not.toMatch(/^[A-Z2-7]+=*$/);
    });

    it('should handle concurrent encryption/decryption', async () => {
      const promises = Array.from({ length: 10 }, async (_, i) => {
        const secret = testSecret + i.toString();
        const encrypted = await encryptDatabaseField(secret);
        const decrypted = await decryptDatabaseField(encrypted!);
        return { original: secret, decrypted };
      });

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.decrypted).toBe(result.original);
      });
    });
  });
});