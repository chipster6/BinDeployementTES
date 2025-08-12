/**
 * Test to verify path alias resolution is working
 */

describe('Path Alias Resolution Test', () => {
  it('should be able to import using relative paths first', async () => {
    // Test relative import first
    const { ResponseHelper } = await import('../../src/utils/ResponseHelper');
    expect(ResponseHelper).toBeDefined();
    expect(typeof ResponseHelper).toBe('function');
  });

  it('should be able to import using path alias', async () => {
    // Try importing a simple module using path alias
    try {
      const { ResponseHelper } = await import('@/utils/ResponseHelper');
      expect(ResponseHelper).toBeDefined();
      expect(typeof ResponseHelper).toBe('function');
    } catch (error) {
      console.error('Path alias import failed:', error);
      // Log Jest configuration for debugging
      console.error('Jest moduleNameMapper:', JSON.stringify(jest.config.moduleNameMapper || {}, null, 2));
      throw error;
    }
  });
});