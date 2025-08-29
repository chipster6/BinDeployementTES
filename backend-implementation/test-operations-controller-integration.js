const { OperationsController } = require('./dist/controllers/OperationsController');

// Mock Express Request and Response
const mockRequest = (overrides = {}) => ({
  tenant_id: 'test-tenant-123',
  idemKey: 'test-idem-key-456',
  params: {},
  query: {},
  body: {},
  ...overrides
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

// Test the listBins endpoint
async function testListBins() {
  console.log('🧪 Testing listBins endpoint...');
  
  const req = mockRequest({
    query: { page: '1', limit: '10', status: 'ACTIVE' }
  });
  const res = mockResponse();
  
  try {
    await OperationsController.listBins(req, res);
    
    // Verify response structure
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        bins: expect.any(Array),
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: expect.any(Number),
          pages: expect.any(Number)
        })
      })
    );
    
    console.log('✅ listBins test passed');
  } catch (error) {
    console.error('❌ listBins test failed:', error.message);
  }
}

// Test the createBin endpoint
async function testCreateBin() {
  console.log('🧪 Testing createBin endpoint...');
  
  const req = mockRequest({
    body: {
      serial_number: 'SN-TEST-001',
      type: 'ROLL_OFF',
      capacity_m3: 15.5,
      customer_id: 'C-TEST-001',
      location: { lat: 45.5, lon: -73.6 }
    }
  });
  const res = mockResponse();
  
  try {
    await OperationsController.createBin(req, res);
    
    // Verify response structure
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.setHeader).toHaveBeenCalledWith('ETag', expect.any(String));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        bin: expect.objectContaining({
          id: expect.any(String),
          tenant_id: 'test-tenant-123',
          serial_number: 'SN-TEST-001',
          type: 'ROLL_OFF',
          capacity_m3: 15.5,
          customer_id: 'C-TEST-001',
          status: 'ACTIVE',
          etag: expect.any(String)
        })
      })
    );
    
    console.log('✅ createBin test passed');
  } catch (error) {
    console.error('❌ createBin test failed:', error.message);
  }
}

// Test validation error handling
async function testValidationError() {
  console.log('🧪 Testing validation error handling...');
  
  const req = mockRequest({
    body: {
      serial_number: 'SN-TEST-001'
      // Missing required fields
    }
  });
  const res = mockResponse();
  
  try {
    await OperationsController.createBin(req, res);
    
    // Verify error response
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'VALIDATION_ERROR',
        message: expect.stringContaining('Missing required fields')
      })
    );
    
    console.log('✅ validation error test passed');
  } catch (error) {
    console.error('❌ validation error test failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting OperationsController integration tests...\n');
  
  // Setup Jest globals for expect
  global.expect = require('expect');
  global.jest = { fn: () => ({ mockReturnValue: (val) => ({ mockReturnValue: val }) }) };
  
  await testListBins();
  await testCreateBin();
  await testValidationError();
  
  console.log('\n✅ All OperationsController integration tests completed!');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };