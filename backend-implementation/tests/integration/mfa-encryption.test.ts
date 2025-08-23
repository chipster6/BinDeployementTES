/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - MFA ENCRYPTION SECURITY TESTS
 * ============================================================================
 *
 * Test suite to verify MFA secret encryption functionality.
 * Critical security fix validation for plaintext MFA storage vulnerability.
 * 
 * SECURITY TEST COVERAGE:
 * - MFA secret encryption on user creation
 * - MFA secret encryption on user update
 * - Transparent decryption on user retrieval
 * - TOTP verification still works with encrypted secrets
 * - Database contains only encrypted MFA secrets
 * 
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-20
 * Version: 1.0.0
 */

import { User } from '../../src/models/User';
import { database } from '../../src/config/database';
import { isEncrypted, decryptDatabaseField } from '../../src/utils/encryption';

describe('MFA Secret Encryption Security Tests', () => {
  beforeAll(async () => {
    // Ensure database is ready
    await database.authenticate();
  });

  afterAll(async () => {
    // Cleanup test data
    await User.destroy({ where: { email: { [database.Sequelize.Op.like]: '%test-mfa-encryption%' } }, force: true });
    await database.close();
  });

  describe('MFA Secret Creation Encryption', () => {
    it('should encrypt MFA secret when creating new user with MFA', async () => {
      // Create user with MFA enabled
      const testUser = await User.create({
        email: 'test-mfa-encryption-create@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        mfa_enabled: true,
      });

      // Generate MFA secret
      const originalSecret = testUser.generateMfaSecret();
      expect(originalSecret).toBeDefined();
      expect(typeof originalSecret).toBe('string');

      // Save the user to trigger encryption
      await testUser.save();

      // Query database directly to verify encryption
      const [results] = await database.query(
        'SELECT mfa_secret FROM core.users WHERE id = :userId',
        {
          replacements: { userId: testUser.id },
          type: database.QueryTypes.SELECT,
        }
      );

      const dbUser = results as any;
      expect(dbUser.mfa_secret).toBeDefined();
      
      // Verify the secret is encrypted in database
      expect(isEncrypted(dbUser.mfa_secret)).toBe(true);
      expect(dbUser.mfa_secret).not.toBe(originalSecret);
      
      // Verify we can decrypt it back to original
      const decryptedSecret = await decryptDatabaseField(dbUser.mfa_secret);
      expect(decryptedSecret).toBe(originalSecret);
    });

    it('should encrypt MFA secret when updating existing user', async () => {
      // Create user without MFA
      const testUser = await User.create({
        email: 'test-mfa-encryption-update@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        mfa_enabled: false,
      });

      expect(testUser.mfa_secret).toBeNull();

      // Enable MFA and generate secret
      testUser.mfa_enabled = true;
      const originalSecret = testUser.generateMfaSecret();
      
      // Update user to trigger encryption
      await testUser.save();

      // Query database directly to verify encryption
      const [results] = await database.query(
        'SELECT mfa_secret FROM core.users WHERE id = :userId',
        {
          replacements: { userId: testUser.id },
          type: database.QueryTypes.SELECT,
        }
      );

      const dbUser = results as any;
      expect(isEncrypted(dbUser.mfa_secret)).toBe(true);
      expect(dbUser.mfa_secret).not.toBe(originalSecret);

      // Verify decryption works
      const decryptedSecret = await decryptDatabaseField(dbUser.mfa_secret);
      expect(decryptedSecret).toBe(originalSecret);
    });
  });

  describe('MFA Secret Retrieval Decryption', () => {
    it('should transparently decrypt MFA secret when loading user', async () => {
      // Create user with MFA
      const testUser = await User.create({
        email: 'test-mfa-encryption-retrieval@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        mfa_enabled: true,
      });

      const originalSecret = testUser.generateMfaSecret();
      await testUser.save();

      // Find user again to test decryption
      const foundUser = await User.findOne({
        where: { email: 'test-mfa-encryption-retrieval@example.com' }
      });

      expect(foundUser).toBeDefined();
      expect(foundUser!.mfa_secret).toBe(originalSecret);
      expect(foundUser!.mfa_secret).not.toBe(null);
    });

    it('should handle multiple users with encrypted MFA secrets', async () => {
      const users = [];
      const secrets = [];

      // Create multiple users with MFA
      for (let i = 0; i < 3; i++) {
        const user = await User.create({
          email: `test-mfa-bulk-${i}@example.com`,
          password_hash: 'hashed_password',
          first_name: 'Test',
          last_name: `User${i}`,
          role: 'customer',
          mfa_enabled: true,
        });

        const secret = user.generateMfaSecret();
        await user.save();
        
        users.push(user);
        secrets.push(secret);
      }

      // Find all users at once
      const foundUsers = await User.findAll({
        where: {
          email: {
            [database.Sequelize.Op.in]: users.map(u => u.email)
          }
        }
      });

      expect(foundUsers).toHaveLength(3);
      
      foundUsers.forEach((user, index) => {
        expect(user.mfa_secret).toBe(secrets[index]);
      });
    });
  });

  describe('TOTP Functionality with Encryption', () => {
    it('should generate valid TOTP tokens with encrypted MFA secrets', async () => {
      // Create user with MFA
      const testUser = await User.create({
        email: 'test-mfa-totp@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        mfa_enabled: true,
      });

      const secret = testUser.generateMfaSecret();
      await testUser.save();

      // Reload user to ensure decryption works
      const reloadedUser = await User.findByPk(testUser.id);
      expect(reloadedUser).toBeDefined();

      // Generate TOTP token using external library for validation
      const authenticator = require('otplib/authenticator');
      const token = authenticator.generate(secret);
      expect(token).toBeDefined();
      expect(token).toMatch(/^\d{6}$/);

      // Verify token works with encrypted secret
      const isValid = reloadedUser!.verifyMfaToken(token);
      expect(isValid).toBe(true);
    });

    it('should generate QR code URI with encrypted MFA secrets', async () => {
      // Create user with MFA
      const testUser = await User.create({
        email: 'test-mfa-qr@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        mfa_enabled: true,
      });

      testUser.generateMfaSecret();
      await testUser.save();

      // Reload user to test with encrypted secret
      const reloadedUser = await User.findByPk(testUser.id);
      
      // Generate QR code URI
      const qrUri = reloadedUser!.getMfaQrCodeUri();
      expect(qrUri).toBeDefined();
      expect(qrUri).toContain('otpauth://totp/');
      expect(qrUri).toContain(testUser.email);
    });

    it('should reject invalid TOTP tokens with encrypted MFA secrets', async () => {
      // Create user with MFA
      const testUser = await User.create({
        email: 'test-mfa-invalid-token@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        mfa_enabled: true,
      });

      testUser.generateMfaSecret();
      await testUser.save();

      // Reload user
      const reloadedUser = await User.findByPk(testUser.id);

      // Test with invalid token
      const isValid = reloadedUser!.verifyMfaToken('000000');
      expect(isValid).toBe(false);
    });
  });

  describe('Database Security Validation', () => {
    it('should never store plaintext MFA secrets in database', async () => {
      // Create multiple users with MFA
      const users = [];
      for (let i = 0; i < 5; i++) {
        const user = await User.create({
          email: `test-plaintext-check-${i}@example.com`,
          password_hash: 'hashed_password',
          first_name: 'Test',
          last_name: `User${i}`,
          role: 'customer',
          mfa_enabled: true,
        });

        user.generateMfaSecret();
        await user.save();
        users.push(user);
      }

      // Query all MFA secrets directly from database
      const [results] = await database.query(
        `SELECT id, email, mfa_secret 
         FROM core.users 
         WHERE email LIKE 'test-plaintext-check-%@example.com'
         AND mfa_secret IS NOT NULL`,
        { type: database.QueryTypes.SELECT }
      );

      expect(results).toHaveLength(5);

      // Verify all MFA secrets in database are encrypted
      (results as any[]).forEach(row => {
        expect(isEncrypted(row.mfa_secret)).toBe(true);
        // Ensure it doesn't look like a plaintext TOTP secret
        expect(row.mfa_secret).not.toMatch(/^[A-Z2-7]{32}$/);
      });
    });

    it('should handle null MFA secrets gracefully', async () => {
      // Create user without MFA
      const testUser = await User.create({
        email: 'test-mfa-null@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        mfa_enabled: false,
      });

      expect(testUser.mfa_secret).toBeNull();

      // Verify TOTP operations handle null gracefully
      expect(testUser.verifyMfaToken('123456')).toBe(false);
      
      expect(() => {
        testUser.getMfaQrCodeUri();
      }).toThrow('MFA secret not generated');
    });
  });

  describe('Error Handling', () => {
    it('should handle decryption errors gracefully', async () => {
      // Create user and manually corrupt MFA secret in database
      const testUser = await User.create({
        email: 'test-mfa-corruption@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        mfa_enabled: true,
      });

      testUser.generateMfaSecret();
      await testUser.save();

      // Manually corrupt the encrypted MFA secret in database
      await database.query(
        `UPDATE core.users 
         SET mfa_secret = 'corrupted_encrypted_data' 
         WHERE id = :userId`,
        {
          replacements: { userId: testUser.id }
        }
      );

      // Try to load user - should handle decryption error gracefully
      const corruptedUser = await User.findByPk(testUser.id);
      expect(corruptedUser).toBeDefined();
      expect(corruptedUser!.mfa_secret).toBeNull(); // Should be set to null on decryption failure
    });
  });
});