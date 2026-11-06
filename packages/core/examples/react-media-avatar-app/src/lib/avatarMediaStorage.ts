import {
  AVATAR_EMOTIONS,
  type AvatarEmotion,
  validateAvatarMedia,
} from './avatarMedia';

const DATABASE = 'react-media-avatar-app-media';
const STORE = 'media';
interface StoredMedia {
  emotion: AvatarEmotion;
  file: File;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'emotion' });
    };
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Avatar media storage is blocked by another tab.'));
    };
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () =>
        reject(
          transaction.error ?? new Error('Avatar media transaction aborted.'),
        );
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function loadAvatarMedia(): Promise<
  Partial<Record<AvatarEmotion, File>>
> {
  const records = await transact<StoredMedia[]>('readonly', (store) =>
    store.getAll(),
  );
  const files: Partial<Record<AvatarEmotion, File>> = {};
  for (const record of records) {
    if (
      AVATAR_EMOTIONS.includes(record.emotion) &&
      record.file instanceof File &&
      !validateAvatarMedia(record.file)
    ) {
      files[record.emotion] = record.file;
    }
  }
  return files;
}

export async function saveAvatarMedia(
  emotion: AvatarEmotion,
  file: File | null,
): Promise<void> {
  if (file) {
    const error = validateAvatarMedia(file);
    if (error) throw new Error(error);
  }
  if (file)
    await transact('readwrite', (store) => store.put({ emotion, file }));
  else await transact('readwrite', (store) => store.delete(emotion));
}

export async function clearAvatarMedia(): Promise<void> {
  await transact('readwrite', (store) => store.clear());
}
