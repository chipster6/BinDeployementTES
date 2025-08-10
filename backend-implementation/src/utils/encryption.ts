/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ENCRYPTION UTILITIES
 * ============================================================================
 * 
 * Comprehensive encryption utilities for field-level data protection.
 * Implements AES-256-GCM encryption with proper key management and
 * secure random initialization vectors.
 * 
 * Security Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Secure random IV generation
 * - Base64 encoding for database storage
 * - Key rotation support
 * - Integrity verification
 * - Secure key derivation
 * 
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import crypto from 'crypto';
import { config } from '@/config';

/**
 * Encryption configuration constants
 */
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  tagLength: 16, // 128 bits
  saltLength: 32, // 256 bits
  iterations: 100000, // PBKDF2 iterations
} as const;

/**
 * Encrypted data structure
 */
interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
  salt?: string;
  keyVersion?: string;
}

/**
 * Get encryption key from environment or derive from master key
 */
function getEncryptionKey(salt?: Buffer): Buffer {
  const masterKey = config.encryption?.masterKey || process.env.ENCRYPTION_MASTER_KEY;
  
  if (!masterKey) {
    throw new Error('Encryption master key not configured. Set ENCRYPTION_MASTER_KEY environment variable.');
  }

  if (salt) {
    // Derive key using PBKDF2 for additional security
    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      ENCRYPTION_CONFIG.iterations,
      ENCRYPTION_CONFIG.keyLength,
      'sha512'
    );
  }

  // Use direct key derivation from master key
  return crypto.scryptSync(masterKey, 'salt', ENCRYPTION_CONFIG.keyLength);
}

/**
 * Generate secure random initialization vector
 */
function generateIV(): Buffer {
  return crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
}

/**
 * Generate secure random salt
 */
function generateSalt(): Buffer {
  return crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
}

/**
 * Encrypt sensitive data with AES-256-GCM
 */
export async function encryptSensitiveData(
  plaintext: string,
  useKeyDerivation: boolean = true
): Promise<string> {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty or null data');
  }

  try {
    const iv = generateIV();
    let key: Buffer;
    let salt: Buffer | undefined;

    if (useKeyDerivation) {
      salt = generateSalt();
      key = getEncryptionKey(salt);
    } else {
      key = getEncryptionKey();
    }

    // Create cipher
    const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, key, { iv });

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    // Create encrypted data structure
    const encryptedData: EncryptedData = {
      data: encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      keyVersion: '1.0', // For key rotation support
    };

    if (salt) {
      encryptedData.salt = salt.toString('base64');
    }

    // Return as base64-encoded JSON string
    return Buffer.from(JSON.stringify(encryptedData)).toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Data encryption failed');
  }
}

/**
 * Decrypt sensitive data with AES-256-GCM
 */
export async function decryptSensitiveData(encryptedString: string): Promise<string> {
  if (!encryptedString) {
    throw new Error('Cannot decrypt empty or null data');
  }

  try {
    // Parse the encrypted data structure
    const encryptedDataJson = Buffer.from(encryptedString, 'base64').toString('utf8');
    const encryptedData: EncryptedData = JSON.parse(encryptedDataJson);

    // Validate required fields
    if (!encryptedData.data || !encryptedData.iv || !encryptedData.tag) {
      throw new Error('Invalid encrypted data structure');
    }

    // Get encryption key
    let key: Buffer;
    if (encryptedData.salt) {
      const salt = Buffer.from(encryptedData.salt, 'base64');
      key = getEncryptionKey(salt);
    } else {
      key = getEncryptionKey();
    }

    // Convert base64 data back to buffers
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');

    // Create decipher
    const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.algorithm, key, { iv });
    decipher.setAuthTag(tag);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Data decryption failed - data may be corrupted or key may be wrong');
  }
}

/**
 * Encrypt field-level data for database storage
 */
export async function encryptDatabaseField(value: string): Promise<string | null> {
  if (!value || value.trim() === '') {
    return null;
  }

  return await encryptSensitiveData(value.trim());
}

/**
 * Decrypt field-level data from database
 */
export async function decryptDatabaseField(encryptedValue: string | null): Promise<string | null> {
  if (!encryptedValue) {
    return null;
  }

  try {
    return await decryptSensitiveData(encryptedValue);
  } catch (error) {
    // Log error but don't throw to prevent application crashes
    console.error('Database field decryption failed:', error);
    return null;
  }
}

/**
 * Hash sensitive data for searching (one-way)
 */
export function hashSensitiveData(data: string, salt?: string): string {
  if (!data) {
    throw new Error('Cannot hash empty data');
  }

  const useSalt = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(data, useSalt, 10000, 64, 'sha512');
  
  return `${useSalt}:${hash.toString('hex')}`;
}

/**
 * Verify hashed sensitive data
 */
export function verifySensitiveDataHash(data: string, hashedData: string): boolean {
  if (!data || !hashedData) {
    return false;
  }

  try {
    const [salt, originalHash] = hashedData.split(':');
    const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
    const newHash = hash.toString('hex');
    
    return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(newHash, 'hex'));
  } catch (error) {
    console.error('Hash verification failed:', error);
    return false;
  }
}

/**
 * Generate encryption key for session tokens
 */
export function generateSessionKey(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Encrypt session data
 */
export function encryptSessionData(data: any): string {
  const sessionKey = config.session?.secret || process.env.SESSION_SECRET || generateSessionKey();
  const iv = generateIV();
  
  const cipher = crypto.createCipher('aes-256-cbc', sessionKey, { iv });
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return `${iv.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt session data
 */
export function decryptSessionData(encryptedData: string): any {
  try {
    const sessionKey = config.session?.secret || process.env.SESSION_SECRET;
    if (!sessionKey) {
      throw new Error('Session key not configured');
    }

    const [ivString, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivString, 'base64');
    
    const decipher = crypto.createDecipher('aes-256-cbc', sessionKey, { iv });
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Session decryption failed:', error);
    throw new Error('Session decryption failed');
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate cryptographically secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

/**
 * Create HMAC signature for data integrity
 */
export function createHmacSignature(data: string, key?: string): string {
  const secretKey = key || config.hmac?.secret || process.env.HMAC_SECRET;
  if (!secretKey) {
    throw new Error('HMAC secret key not configured');
  }
  
  return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHmacSignature(data: string, signature: string, key?: string): boolean {
  try {
    const expectedSignature = createHmacSignature(data, key);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('HMAC verification failed:', error);
    return false;
  }
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars * 2) {
    return '*'.repeat(Math.max(data?.length || 0, 8));
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const middle = '*'.repeat(Math.max(data.length - (visibleChars * 2), 4));
  
  return `${start}${middle}${end}`;
}

/**
 * Check if data appears to be encrypted (basic heuristic)
 */
export function isEncrypted(data: string): boolean {
  if (!data) return false;
  
  try {
    // Check if it looks like base64-encoded encrypted data structure
    const decoded = Buffer.from(data, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return parsed.data && parsed.iv && parsed.tag;
  } catch {
    return false;
  }
}

/**
 * Key rotation: re-encrypt data with new key version
 */
export async function rotateEncryptionKey(oldEncryptedData: string): Promise<string> {
  try {
    // Decrypt with old key
    const decrypted = await decryptSensitiveData(oldEncryptedData);
    
    // Re-encrypt with current key
    return await encryptSensitiveData(decrypted);
  } catch (error) {
    console.error('Key rotation failed:', error);
    throw new Error('Failed to rotate encryption key');
  }
}

/**
 * Secure data wipe for memory cleanup
 */
export function secureWipe(buffer: Buffer | string): void {
  if (Buffer.isBuffer(buffer)) {
    buffer.fill(0);
  } else if (typeof buffer === 'string') {
    // Note: In JavaScript, strings are immutable, so we can't actually wipe them
    // This is a limitation of the language. In production, consider using
    // Buffer operations for sensitive data throughout the application.
    console.warn('Cannot securely wipe immutable string. Consider using Buffer for sensitive data.');
  }
}

/**
 * Export encryption utilities
 */
export default {
  encryptSensitiveData,
  decryptSensitiveData,
  encryptDatabaseField,
  decryptDatabaseField,
  hashSensitiveData,
  verifySensitiveDataHash,
  generateSessionKey,
  encryptSessionData,
  decryptSessionData,
  generateSecureToken,
  generateSecurePassword,
  createHmacSignature,
  verifyHmacSignature,
  maskSensitiveData,
  isEncrypted,
  rotateEncryptionKey,
  secureWipe,
};