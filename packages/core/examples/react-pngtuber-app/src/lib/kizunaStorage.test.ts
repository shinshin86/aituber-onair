// @vitest-environment jsdom

import {
  KizunaManager,
  LocalStorageProvider,
  createDefaultKizunaConfig,
} from '@aituber-onair/kizuna';
import { describe, expect, it, vi } from 'vitest';
import {
  attemptPngTuberKizunaStorageClear,
  clearPngTuberKizunaStorage,
  PNGTUBER_KIZUNA_STORAGE_KEY,
  tryCreateKizunaStorageProvider,
} from './kizunaStorage';

describe('tryCreateKizunaStorageProvider', () => {
  it('returns the provider when storage is available', () => {
    const provider = { remove: vi.fn() };

    const result = tryCreateKizunaStorageProvider(() => provider, vi.fn());

    expect(result).toBe(provider);
  });

  it('falls back without throwing when storage is unavailable', () => {
    const error = new Error('localStorage is unavailable');
    const onUnavailable = vi.fn();

    const result = tryCreateKizunaStorageProvider(() => {
      throw error;
    }, onUnavailable);

    expect(result).toBeUndefined();
    expect(onUnavailable).toHaveBeenCalledWith(error);
  });
});

describe('clearPngTuberKizunaStorage', () => {
  it('removes only the PNGTuber Kizuna storage key', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);

    await clearPngTuberKizunaStorage({ remove });

    expect(remove).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith(PNGTUBER_KIZUNA_STORAGE_KEY);
  });

  it('does nothing when persistence is unavailable', async () => {
    await expect(clearPngTuberKizunaStorage(null)).resolves.toBeUndefined();
  });
});

describe('attemptPngTuberKizunaStorageClear', () => {
  it('retains a failed provider so the next reset retries removal', async () => {
    const error = new Error('remove failed');
    const remove = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);
    const storageProvider = { remove };

    const firstAttempt = await attemptPngTuberKizunaStorageClear(
      storageProvider,
    );
    const secondAttempt = await attemptPngTuberKizunaStorageClear(
      firstAttempt.storageProvider,
    );

    expect(firstAttempt).toEqual({
      storageCleared: false,
      storageProvider,
      error,
    });
    expect(secondAttempt).toEqual({
      storageCleared: true,
      storageProvider,
    });
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenNthCalledWith(
      1,
      PNGTUBER_KIZUNA_STORAGE_KEY,
    );
    expect(remove).toHaveBeenNthCalledWith(
      2,
      PNGTUBER_KIZUNA_STORAGE_KEY,
    );
  });
});

describe('Kizuna localStorage persistence', () => {
  it('restores saved bond data in a new manager', async () => {
    localStorage.clear();
    const now = Date.parse('2026-08-16T00:00:00Z');
    const config = createDefaultKizunaConfig();
    config.now = () => now;
    const storageProvider = new LocalStorageProvider();
    const manager = new KizunaManager(
      config,
      storageProvider,
      PNGTUBER_KIZUNA_STORAGE_KEY,
    );

    await manager.processInteraction({
      userId: 'form:owner',
      kind: 'message',
      message: 'hello',
      isOwner: true,
      timestamp: now,
    });
    const savedSnapshot = manager.getBondSnapshot('form:owner');
    manager.destroy();

    const restoredManager = new KizunaManager(
      config,
      new LocalStorageProvider(),
      PNGTUBER_KIZUNA_STORAGE_KEY,
    );
    await restoredManager.initialize();

    expect(restoredManager.getBondSnapshot('form:owner')).toEqual(
      savedSnapshot,
    );
    restoredManager.destroy();
    localStorage.clear();
  });
});
