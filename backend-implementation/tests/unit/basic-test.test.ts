/**
 * Basic test to verify Jest configuration is working
 */

describe('Basic Jest Configuration Test', () => {
  it('should execute basic test successfully', () => {
    const result = 2 + 2;
    expect(result).toBe(4);
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('test');
    const result = await promise;
    expect(result).toBe('test');
  });
});