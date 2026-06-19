import { useCallback, useEffect, useRef, useState } from 'react';
import type { PetManifest } from '../types/settings';

interface StoredPetAsset {
  manifest: PetManifest;
  spritesheet: Blob;
  spritesheetFileName: string;
  savedAt: number;
}

export interface ActivePetAsset {
  manifest: PetManifest;
  spritesheetUrl: string;
  savedAt: number;
}

const PET_DB_NAME = 'react-pet-app-assets';
const PET_DB_VERSION = 1;
const PET_STORE_NAME = 'pet-assets';
const CUSTOM_PET_KEY = 'custom-pet';

function openPetDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PET_DB_NAME, PET_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PET_STORE_NAME)) {
        db.createObjectStore(PET_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readStoredPet(): Promise<StoredPetAsset | null> {
  const db = await openPetDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PET_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PET_STORE_NAME);
    const request = store.get(CUSTOM_PET_KEY);

    request.onsuccess = () =>
      resolve((request.result as StoredPetAsset | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function writeStoredPet(asset: StoredPetAsset): Promise<void> {
  const db = await openPetDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PET_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PET_STORE_NAME);
    const request = store.put(asset, CUSTOM_PET_KEY);

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

async function deleteStoredPet(): Promise<void> {
  const db = await openPetDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PET_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PET_STORE_NAME);
    const request = store.delete(CUSTOM_PET_KEY);

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

function createActivePetAsset(stored: StoredPetAsset): ActivePetAsset {
  return {
    manifest: stored.manifest,
    spritesheetUrl: URL.createObjectURL(stored.spritesheet),
    savedAt: stored.savedAt,
  };
}

async function parsePetManifest(file: File): Promise<PetManifest> {
  const manifest = JSON.parse(await file.text()) as PetManifest;

  if (!manifest || typeof manifest !== 'object') {
    throw new Error('pet.json must be a JSON object.');
  }

  return manifest;
}

export function usePetAssets() {
  const objectUrlRef = useRef<string | null>(null);
  const [activePet, setActivePet] = useState<ActivePetAsset | null>(null);
  const [petAssetError, setPetAssetError] = useState('');
  const [isLoadingPetAsset, setIsLoadingPetAsset] = useState(true);

  const replaceActivePet = useCallback((stored: StoredPetAsset | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!stored) {
      setActivePet(null);
      return;
    }

    const nextPet = createActivePetAsset(stored);
    objectUrlRef.current = nextPet.spritesheetUrl;
    setActivePet(nextPet);
  }, []);

  useEffect(() => {
    let active = true;

    const loadPet = async () => {
      try {
        const stored = await readStoredPet();
        if (active) {
          replaceActivePet(stored);
        }
      } catch (error) {
        if (active) {
          setPetAssetError(
            error instanceof Error ? error.message : String(error),
          );
        }
      } finally {
        if (active) {
          setIsLoadingPetAsset(false);
        }
      }
    };

    void loadPet();

    return () => {
      active = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [replaceActivePet]);

  const registerPetAsset = useCallback(
    async (manifestFile: File, spritesheetFile: File) => {
      setPetAssetError('');

      try {
        const manifest = await parsePetManifest(manifestFile);
        const stored: StoredPetAsset = {
          manifest: {
            ...manifest,
            spritesheetPath: spritesheetFile.name,
          },
          spritesheet: spritesheetFile,
          spritesheetFileName: spritesheetFile.name,
          savedAt: Date.now(),
        };

        await writeStoredPet(stored);
        replaceActivePet(stored);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setPetAssetError(message);
        throw error;
      }
    },
    [replaceActivePet],
  );

  const clearPetAsset = useCallback(async () => {
    setPetAssetError('');
    await deleteStoredPet();
    replaceActivePet(null);
  }, [replaceActivePet]);

  return {
    activePet,
    petAssetError,
    isLoadingPetAsset,
    registerPetAsset,
    clearPetAsset,
  };
}
