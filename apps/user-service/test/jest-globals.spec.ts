describe('Jest Globals Sanity Check', () => {
  let counter = 0;

  beforeEach(() => {
    counter++;
  });

  afterAll(() => {
    // This will run after all tests
    expect(counter).toBe(1);
  });

  it('should recognize describe, it, expect, beforeEach, and afterAll', () => {
    expect(counter).toBe(1); // Should be incremented by beforeEach
  });
});
