/**
 * Vitest setup file for AITuberOnAirCore tests
 */

// Global test timeout - increase if needed for async tests
import { beforeAll } from 'vitest';

beforeAll(() => {
  // Global timeout for all tests
  // Using beforeAll instead of setTimeout since it's Vitest's recommended approach
});

// Other global test configuration can be added here
