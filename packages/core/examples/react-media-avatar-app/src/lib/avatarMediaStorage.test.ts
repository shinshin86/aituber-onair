// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAvatarMedia,
  loadAvatarMedia,
  saveAvatarMedia,
} from './avatarMediaStorage';

function mockDatabase() {
  const records = new Map<string, { emotion: string; file: File }>();
  const close = vi.fn();
  const createObjectStore = vi.fn();
  let abort = false;
  let openingError = false;
  let upgrade = true;
  const factory = {
    open: vi.fn(() => {
      const request = {
        result: database,
        error: new Error('open failed'),
        onupgradeneeded: () => {},
        onsuccess: () => {},
        onerror: () => {},
      };
      queueMicrotask(() => {
        if (openingError) {
          request.onerror();
          return;
        }
        if (upgrade) {
          request.onupgradeneeded();
          upgrade = false;
        }
        request.onsuccess();
      });
      return request;
    }),
  };
  const database = {
    close,
    createObjectStore,
    transaction: vi.fn(() => {
      const pending = new Map(records);
      const transaction = {
        error: new Error('transaction failed'),
        oncomplete: () => {},
        onerror: () => {},
        onabort: () => {},
        objectStore: () => ({
          getAll: () => ({ result: [...pending.values()] }),
          put: (record: { emotion: string; file: File }) => {
            pending.set(record.emotion, record);
            return { result: record.emotion };
          },
          delete: (emotion: string) => {
            pending.delete(emotion);
            return { result: undefined };
          },
          clear: () => {
            pending.clear();
            return { result: undefined };
          },
        }),
      };
      queueMicrotask(() => {
        if (abort) transaction.onabort();
        else {
          records.clear();
          for (const [key, value] of pending) records.set(key, value);
          transaction.oncomplete();
        }
      });
      return transaction;
    }),
  };
  vi.stubGlobal('indexedDB', factory);
  return {
    database,
    records,
    factory,
    failTransaction: () => {
      abort = true;
    },
    failOpening: () => {
      openingError = true;
    },
  };
}

describe('avatar media IndexedDB storage', () => {
  let mock: ReturnType<typeof mockDatabase>;
  beforeEach(() => {
    mock = mockDatabase();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates the store and restores files through a newly opened connection', async () => {
    const file = new File(['gif'], 'happy.gif', { type: 'image/gif' });
    await saveAvatarMedia('happy', file);
    const restored = await loadAvatarMedia();
    expect(restored).toEqual({ happy: file });
    expect(mock.database.createObjectStore).toHaveBeenCalledWith('media', {
      keyPath: 'emotion',
    });
    expect(mock.database.close).toHaveBeenCalledTimes(2);
  });
  it('replaces one emotion, removes one emotion and resets all uploads', async () => {
    const first = new File(['gif'], 'first.gif');
    const replacement = new File(['webm'], 'next.webm');
    await saveAvatarMedia('happy', first);
    await saveAvatarMedia('neutral', first);
    await saveAvatarMedia('happy', replacement);
    expect((await loadAvatarMedia()).happy).toBe(replacement);
    await saveAvatarMedia('happy', null);
    expect(await loadAvatarMedia()).toEqual({ neutral: first });
    await clearAvatarMedia();
    expect(await loadAvatarMedia()).toEqual({});
  });
  it('rejects an aborted write and retains committed data', async () => {
    const file = new File(['gif'], 'neutral.gif');
    await saveAvatarMedia('neutral', file);
    mock.failTransaction();
    await expect(clearAvatarMedia()).rejects.toThrow('transaction failed');
    expect(mock.records.get('neutral')?.file).toBe(file);
    expect(mock.database.close).toHaveBeenCalledTimes(2);
  });
  it('reports opening errors and unavailable IndexedDB', async () => {
    mock.failOpening();
    await expect(loadAvatarMedia()).rejects.toThrow('open failed');
    vi.stubGlobal('indexedDB', undefined);
    await expect(loadAvatarMedia()).rejects.toThrow();
  });
  it('rejects invalid uploads and skips invalid stored records', async () => {
    const invalid = new File(['svg'], 'avatar.svg', { type: 'image/svg+xml' });
    await expect(saveAvatarMedia('happy', invalid)).rejects.toThrow();
    expect(mock.factory.open).not.toHaveBeenCalled();
    mock.records.set('happy', { emotion: 'happy', file: invalid });
    mock.records.set('thinking', {
      emotion: 'thinking',
      file: new File(['gif'], 'avatar.gif'),
    });
    expect(await loadAvatarMedia()).toEqual({});
  });
});
