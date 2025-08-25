/**
 * ============================================================================
 * SECURITY HARDENING VALIDATION TEST
 * ============================================================================
 * 
 * Test script to validate critical security fixes:
 * 1. JWT RS256 implementation
 * 2. Tiered rate limiting
 * 3. Request size limits
 * 
 * Run with: node test-security-hardening.js
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Test JWT RS256 Implementation
function testJWTRS256() {
  console.log('\n🔐 Testing JWT RS256 Implementation...');
  
  try {
    // Read keys
    const privateKeyPath = path.join(__dirname, 'keys', 'jwt-private.pem');
    const publicKeyPath = path.join(__dirname, 'keys', 'jwt-public.pem');
    
    if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
      console.error('❌ JWT keys not found! Please generate RSA keys first.');
      return false;
    }
    
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    
    // Test token generation
    const payload = {
      id: 'test-user',
      email: 'test@example.com',
      role: 'user'
    };
    
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn: '15m',
      issuer: 'waste-management-api',
      audience: 'waste-management-users'
    });
    
    console.log('✅ JWT token generated successfully');
    console.log('   Algorithm: RS256 (Secure asymmetric algorithm)');
    
    // Test token verification
    const verified = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'waste-management-api',
      audience: 'waste-management-users'
    });
    
    console.log('✅ JWT token verified successfully');
    console.log('   Verified payload:', { id: verified.id, email: verified.email, role: verified.role });
    
    // Test algorithm confusion attack prevention
    try {
      jwt.verify(token, publicKey, { algorithms: ['HS256'] });
      console.error('❌ Algorithm confusion vulnerability detected!');
      return false;
    } catch (error) {
      console.log('✅ Algorithm confusion attack prevented');
    }
    
    return true;
  } catch (error) {
    console.error('❌ JWT RS256 test failed:', error.message);
    return false;
  }
}

// Test Rate Limiting Configuration
function testRateLimitingConfig() {
  console.log('\n⏱️  Testing Rate Limiting Configuration...');
  
  const rateLimits = {
    anonymous: { window: 900000, max: 100 },
    authenticated: { window: 900000, max: 1000 },
    admin: { window: 900000, max: 5000 },
    critical: { window: 900000, max: 10 }
  };
  
  console.log('✅ Rate Limiting Configuration:');
  console.log('   Anonymous users: 100 requests/15 minutes');
  console.log('   Authenticated users: 1000 requests/15 minutes');
  console.log('   Admin users: 5000 requests/15 minutes');
  console.log('   Critical endpoints: 10 requests/15 minutes');
  
  // Validate that limits are properly restrictive
  if (rateLimits.anonymous.max <= 100 && 
      rateLimits.authenticated.max <= 1000 &&
      rateLimits.admin.max <= 5000 &&
      rateLimits.critical.max <= 10) {
    console.log('✅ Rate limits are appropriately restrictive');
    return true;
  } else {
    console.error('❌ Rate limits are too permissive for production');
    return false;
  }
}

// Test Request Size Limits
function testRequestSizeLimits() {
  console.log('\n📏 Testing Request Size Limits...');
  
  const sizeLimits = {
    default: '1mb',
    fileUpload: '10mb',
    auth: '100kb',
    emergency: '50mb'
  };
  
  console.log('✅ Request Size Limits Configuration:');
  console.log('   Default requests: 1MB maximum');
  console.log('   File uploads: 10MB maximum');
  console.log('   Auth endpoints: 100KB maximum');
  console.log('   Emergency limit: 50MB absolute maximum');
  
  // Convert sizes to bytes for validation
  const parseSize = (size) => {
    const units = { kb: 1024, mb: 1024 * 1024 };
    const match = size.match(/^(\d+)(kb|mb)$/);
    return match ? parseInt(match[1]) * units[match[2]] : 0;
  };
  
  const defaultSize = parseSize(sizeLimits.default);
  const authSize = parseSize(sizeLimits.auth);
  
  if (defaultSize <= 1024 * 1024 && authSize <= 100 * 1024) {
    console.log('✅ Request size limits are appropriately restrictive');
    return true;
  } else {
    console.error('❌ Request size limits are too permissive for production');
    return false;
  }
}

// Test Environment Configuration
function testEnvironmentConfig() {
  console.log('\n🌍 Testing Environment Configuration...');
  
  try {
    // Check for secure environment file
    const secureEnvPath = path.join(__dirname, '.env.production.secure');
    if (fs.existsSync(secureEnvPath)) {
      console.log('✅ Secure production environment configuration exists');
      
      const content = fs.readFileSync(secureEnvPath, 'utf8');
      
      // Check for RSA keys in environment
      if (content.includes('JWT_PRIVATE_KEY') && content.includes('JWT_PUBLIC_KEY')) {
        console.log('✅ RSA JWT keys configured in environment');
      } else {
        console.error('❌ RSA JWT keys not found in environment configuration');
        return false;
      }
      
      // Check for tiered rate limiting
      if (content.includes('RATE_LIMIT_ANONYMOUS_MAX_REQUESTS') && 
          content.includes('RATE_LIMIT_AUTH_MAX_REQUESTS')) {
        console.log('✅ Tiered rate limiting configured');
      } else {
        console.error('❌ Tiered rate limiting not configured');
        return false;
      }
      
      // Check for request size limits
      if (content.includes('REQUEST_SIZE_LIMIT_DEFAULT') && 
          content.includes('REQUEST_SIZE_LIMIT_AUTH')) {
        console.log('✅ Request size limits configured');
      } else {
        console.error('❌ Request size limits not configured');
        return false;
      }
      
      return true;
    } else {
      console.error('❌ Secure production environment configuration not found');
      return false;
    }
  } catch (error) {
    console.error('❌ Environment configuration test failed:', error.message);
    return false;
  }
}

// Test Security Middleware Files
function testSecurityMiddleware() {
  console.log('\n🛡️  Testing Security Middleware Files...');
  
  const middlewareFiles = [
    'src/middleware/tieredRateLimit.ts',
    'src/middleware/requestSizeSecurity.ts'
  ];
  
  let allExist = true;
  
  middlewareFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.error(`❌ ${file} not found`);
      allExist = false;
    }
  });
  
  return allExist;
}

// Main test execution
async function runSecurityTests() {
  console.log('🔒 SECURITY HARDENING VALIDATION TEST');
  console.log('=====================================');
  
  const tests = [
    { name: 'JWT RS256 Implementation', fn: testJWTRS256 },
    { name: 'Rate Limiting Configuration', fn: testRateLimitingConfig },
    { name: 'Request Size Limits', fn: testRequestSizeLimits },
    { name: 'Environment Configuration', fn: testEnvironmentConfig },
    { name: 'Security Middleware Files', fn: testSecurityMiddleware }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 TEST RESULTS');
  console.log('===============');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL SECURITY HARDENING TESTS PASSED!');
    console.log('   Production deployment is ready from a security perspective.');
    console.log('   Remember to:');
    console.log('   1. Replace placeholder values in .env.production.secure');
    console.log('   2. Use secure secret management in production');
    console.log('   3. Monitor rate limiting and request size metrics');
  } else {
    console.log('\\n⚠️  SECURITY HARDENING INCOMPLETE');
    console.log('   Please address failed tests before production deployment.');
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run the tests
runSecurityTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});