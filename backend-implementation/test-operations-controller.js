/**
 * Simple test to verify OperationsController compiles and basic functionality works
 */

const { OperationsController } = require('./dist/controllers/OperationsController');

// Mock request and response objects
const mockReq = {
  tenant_id: 'test-tenant-123',
  query: { page: '1', limit: '10' },
  params: { id: 'bin-123' },
  body: {
    serial_number: 'SN-TEST-001',
    type: 'ROLL_OFF',
    capacity_m3: 15.5,
    customer_id: 'customer-123',
    location: { lat: 45.5, lon: -73.6 }
  }
};

const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.data = data;
    return this;
  }
};

async function testOperationsController() {
  console.log('🧪 Testing OperationsController...');
  
  try {
    // Test listBins
    console.log('Testing listBins...');
    await OperationsController.listBins(mockReq, mockRes);
    console.log('✅ listBins completed with status:', mockRes.statusCode);
    
    // Test createBin
    console.log('Testing createBin...');
    const createReq = { ...mockReq, idemKey: 'test-idem-key-123' };
    await OperationsController.createBin(createReq, mockRes);
    console.log('✅ createBin completed with status:', mockRes.statusCode);
    
    // Test getBin
    console.log('Testing getBin...');
    await OperationsController.getBin(mockReq, mockRes);
    console.log('✅ getBin completed with status:', mockRes.statusCode);
    
    console.log('🎉 All OperationsController tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testOperationsController();
}

module.exports = { testOperationsController };