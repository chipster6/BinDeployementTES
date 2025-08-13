/**
 * Basic Jest functionality test
 */

describe('Jest Basic Functionality', () => {
  it('should run basic arithmetic tests', () => {
    expect(1 + 1).toBe(2);
    expect(Math.max(1, 2, 3)).toBe(3);
  });

  it('should handle async operations', async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    const start = Date.now();
    await delay(10);
    const end = Date.now();
    
    expect(end - start).toBeGreaterThanOrEqual(10);
  });

  it('should handle environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have access to Jest globals', () => {
    expect(jest).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });
});