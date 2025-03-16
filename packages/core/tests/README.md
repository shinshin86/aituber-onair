# AITuber OnAir Core - Tests

This directory contains tests for the AITuber OnAir Core library components.

## Directory Structure

Tests are organized to mirror the library's structure:

```
tests/
├── core/         # Tests for core components
├── services/     # Tests for services (voice, chat, etc.)
├── utils/        # Tests for utility functions
└── README.md     # This file
```

## Test Naming Conventions

- Test files should be named with `.test.ts` suffix (e.g., `AITuberOnAirCore.test.ts`)
- For each source file, there should be a corresponding test file

## Running Tests

Tests can be run using Vitest:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Writing Tests

Follow these principles when writing tests:

1. Use the Arrange-Act-Assert pattern
2. Mock external dependencies where appropriate
3. Keep tests independent and isolated
4. Test both success and error cases

Example test structure:

```typescript
import { describe, it, expect } from 'vitest';
import { AITuberOnAirCore } from '../../core/AITuberOnAirCore';

describe('AITuberOnAirCore', () => {
  describe('constructor', () => {
    it('should initialize with valid options', () => {
      // Arrange
      const options = { /* ... */ };
      
      // Act
      const instance = new AITuberOnAirCore(options);
      
      // Assert
      expect(instance).toBeDefined();
    });
  });
});
```

## Test Coverage Requirements

Aim for high test coverage, especially for:

- Core functionality
- Public APIs
- Edge cases
- Error handling 