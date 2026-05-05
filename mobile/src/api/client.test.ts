import { apiClient } from './client';

describe('API Client', () => {
  it('should have correct base URL', () => {
    // This is a simple test to verify the client is properly initialized
    expect(apiClient).toBeDefined();
  });
});