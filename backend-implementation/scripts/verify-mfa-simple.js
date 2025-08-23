/**
 * Simple MFA encryption verification
 */
const crypto = require('crypto');

// Mock config for testing
const mockConfig = {
  security: {
    encryptionKey: 'test-master-key-for-verification-only-32chars'
  }
};

// Simple encryption functions (extracted from encryption.ts)
const ENCRYPTION_CONFIG = {
  algorithm: "aes-256-gcm",
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  saltLength: 32,
  iterations: 100000,
};

function getEncryptionKey(salt) {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY || mockConfig.security.encryptionKey;
  if (!masterKey) {
    throw new Error("Encryption master key not configured");
  }

  if (salt) {
    return crypto.pbkdf2Sync(masterKey, salt, ENCRYPTION_CONFIG.iterations, ENCRYPTION_CONFIG.keyLength, "sha512");
  }
  return crypto.scryptSync(masterKey, "salt", ENCRYPTION_CONFIG.keyLength);
}

function generateIV() {
  return crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
}

function generateSalt() {
  return crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
}

async function encryptDatabaseField(plaintext) {
  if (!plaintext || plaintext.trim() === "") {
    return null;
  }

  try {
    const iv = generateIV();
    const salt = generateSalt();
    const key = getEncryptionKey(salt);

    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    let encrypted = cipher.update(plaintext.trim(), "utf8", "base64");
    encrypted += cipher.final("base64");

    const tag = cipher.getAuthTag();

    const encryptedData = {
      data: encrypted,
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      salt: salt.toString("base64"),
      keyVersion: "1.0",
    };

    return Buffer.from(JSON.stringify(encryptedData)).toString("base64");
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Data encryption failed");
  }
}

async function decryptDatabaseField(encryptedString) {
  if (!encryptedString) {
    return null;
  }

  try {
    const encryptedDataJson = Buffer.from(encryptedString, "base64").toString("utf8");
    const encryptedData = JSON.parse(encryptedDataJson);

    if (!encryptedData.data || !encryptedData.iv || !encryptedData.tag) {
      throw new Error("Invalid encrypted data structure");
    }

    const salt = Buffer.from(encryptedData.salt, "base64");
    const key = getEncryptionKey(salt);

    const iv = Buffer.from(encryptedData.iv, "base64");
    const tag = Buffer.from(encryptedData.tag, "base64");

    const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedData.data, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}

function isEncrypted(data) {
  if (!data) return false;
  try {
    const decoded = Buffer.from(data, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    return parsed.data && parsed.iv && parsed.tag;
  } catch {
    return false;
  }
}

// Test function
async function testEncryption() {
  console.log('🔐 MFA Encryption Test');
  console.log('======================\n');

  const testSecret = 'JBSWY3DPEHPK3PXP';
  
  try {
    console.log('1. Encrypting MFA secret...');
    const encrypted = await encryptDatabaseField(testSecret);
    console.log('   ✅ Encrypted successfully');
    console.log('   📏 Length:', encrypted ? encrypted.length : 0, 'chars');
    
    console.log('2. Verifying encryption format...');
    const isEnc = isEncrypted(encrypted);
    console.log('   ✅ Detected as encrypted:', isEnc);
    
    console.log('3. Checking for plaintext leakage...');
    const hasPlaintext = encrypted && encrypted.includes(testSecret);
    console.log('   ✅ No plaintext found:', !hasPlaintext);
    
    console.log('4. Decrypting...');
    const decrypted = await decryptDatabaseField(encrypted);
    console.log('   ✅ Decrypted successfully');
    console.log('   🔍 Matches original:', decrypted === testSecret);
    
    console.log('\n🏁 Test Result:');
    if (isEnc && !hasPlaintext && decrypted === testSecret) {
      console.log('✅ ALL TESTS PASSED - MFA encryption is working correctly!');
      return true;
    } else {
      console.log('❌ Some tests failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run test
if (require.main === module) {
  testEncryption()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testEncryption, encryptDatabaseField, decryptDatabaseField, isEncrypted };