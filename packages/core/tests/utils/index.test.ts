import { describe, it, expect } from 'vitest';

describe('Utils Index Exports', () => {
  it('should export screenshot utilities', async () => {
    const { captureScreenshot, dataUrlToBlob } = await import(
      '../../src/utils'
    );

    expect(typeof captureScreenshot).toBe('function');
    expect(typeof dataUrlToBlob).toBe('function');
  });

  it('should export screenplay utilities', async () => {
    const { textToScreenplay, screenplayToText, textsToScreenplay } =
      await import('../../src/utils');

    expect(typeof textToScreenplay).toBe('function');
    expect(typeof screenplayToText).toBe('function');
    expect(typeof textsToScreenplay).toBe('function');
  });

  it('should export storage utilities', async () => {
    const { LocalStorageMemoryStorage, createMemoryStorage } = await import(
      '../../src/utils'
    );

    expect(typeof LocalStorageMemoryStorage).toBe('function');
    expect(typeof createMemoryStorage).toBe('function');
  });

  it('should export all expected utilities', async () => {
    const utils = await import('../../src/utils');

    const expectedExports = [
      'captureScreenshot',
      'dataUrlToBlob',
      'textToScreenplay',
      'screenplayToText',
      'textsToScreenplay',
      'LocalStorageMemoryStorage',
      'IndexedDBMemoryStorage',
      'createMemoryStorage',
    ];

    expectedExports.forEach((exportName) => {
      expect(utils).toHaveProperty(exportName);
      expect(utils[exportName]).toBeDefined();
    });
  });

  it('should not export unexpected utilities', async () => {
    const utils = await import('../../src/utils');

    // These should not be exported
    const unexpectedExports = [
      'EMOTION_REGEX',
      'EMOTION_CLEANUP_REGEX',
      'mockLocalStorage',
    ];

    unexpectedExports.forEach((exportName) => {
      expect(utils).not.toHaveProperty(exportName);
    });
  });
});
