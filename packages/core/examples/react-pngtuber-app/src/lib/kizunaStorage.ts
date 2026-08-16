export const PNGTUBER_KIZUNA_STORAGE_KEY = 'react-pngtuber-bond';

interface KizunaStorageRemover {
  remove: (key: string) => Promise<void>;
}

export type KizunaStorageClearResult<T extends KizunaStorageRemover> =
  | {
      storageCleared: true;
      storageProvider: T | null;
    }
  | {
      storageCleared: false;
      storageProvider: T | null;
      error: unknown;
    };

export function tryCreateKizunaStorageProvider<T>(
  createStorageProvider: () => T,
  onUnavailable: (error: unknown) => void,
): T | undefined {
  try {
    return createStorageProvider();
  } catch (error) {
    onUnavailable(error);
    return undefined;
  }
}

export async function clearPngTuberKizunaStorage(
  storageProvider: KizunaStorageRemover | null,
): Promise<void> {
  if (!storageProvider) return;
  await storageProvider.remove(PNGTUBER_KIZUNA_STORAGE_KEY);
}

export async function attemptPngTuberKizunaStorageClear<
  T extends KizunaStorageRemover,
>(storageProvider: T | null): Promise<KizunaStorageClearResult<T>> {
  try {
    await clearPngTuberKizunaStorage(storageProvider);
    return { storageCleared: true, storageProvider };
  } catch (error) {
    return { storageCleared: false, storageProvider, error };
  }
}
