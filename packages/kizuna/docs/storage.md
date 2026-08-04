# Kizuna storage

Kizuna keeps state in memory by default. Pass a storage provider when bond
state must survive a process or page lifetime.

```typescript
const kizuna = new KizunaManager(config, storageProvider, 'character:bond:v1');
await kizuna.initialize();
```

The storage key is always required. Treat it as a namespace for one character
and one data schema. Call `initialize()` before reading state, and call
`destroy()` when the manager is no longer needed so its cleanup timer stops.

## Browser storage

`LocalStorageProvider` stores the complete Kizuna persistence envelope under
one browser `localStorage` key.

```typescript
import {
  KizunaManager,
  LocalStorageProvider,
  createDefaultKizunaConfig,
} from '@aituber-onair/kizuna';

const storage = new LocalStorageProvider({
  enableCompression: false,
  enableEncryption: false,
  maxStorageSize: 5 * 1024 * 1024,
});

const kizuna = new KizunaManager(
  createDefaultKizunaConfig(),
  storage,
  'character:bond:v1',
);

await kizuna.initialize();
```

`maxStorageSize` is an implementation guard, not a guaranteed browser quota,
and it does not reserve capacity. `canStore()` applies the configured
processing before comparing sizes. During `save()`, the current implementation
passes an already processed string to `canStore()`, so compression or
encryption is applied a second time for this check and its quota probe; the
value finally written is processed once. The check is therefore conservative
and is not an exact persisted-byte measurement when either option is enabled.
Browser quotas vary, and a write can still fail with `QuotaExceededError`.

### Built-in "compression"

`enableCompression` currently applies Base64 encoding. It is reversible, but
it is not data compression and usually increases UTF-8 JSON size by roughly
one third.

```typescript
const storage = new LocalStorageProvider({
  enableCompression: true,
});
```

Leave it disabled when storage size is the goal. For real compression, wrap a
storage provider with a codec designed for compression and test the size and
latency with representative data.

### Built-in "encryption"

`enableEncryption` currently applies a repeating-key XOR transform followed
by Base64 encoding. This is obfuscation, not cryptographic protection. It does
not provide authenticated encryption, tamper detection, secure key handling,
or protection against an attacker who can read the application code or
browser storage.

```typescript
const storage = new LocalStorageProvider({
  enableEncryption: true,
  encryptionKey: runtimeSecret,
});
```

If `enableEncryption` is true but `encryptionKey` is missing, the provider does
not encrypt the value. Do not hardcode a production secret in browser code.
Use a server-side store or a design based on the Web Crypto API when the data
needs real confidentiality and integrity.

When both options are enabled, saving runs Base64 encoding first, then XOR and
another Base64 encoding. Loading reverses that order. The combination usually
increases size further.

## External storage

`ExternalStorageProvider` accepts an adapter instead of importing file-system
APIs. This keeps the Kizuna package free of runtime-specific dependencies.

```typescript
import {
  ExternalStorageProvider,
  KizunaManager,
  createDefaultKizunaConfig,
  type ExternalStorageAdapter,
} from '@aituber-onair/kizuna';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const adapter: ExternalStorageAdapter = {
  readFile: (filePath) => fs.readFile(filePath, 'utf8'),
  writeFile: (filePath, data) => fs.writeFile(filePath, data, 'utf8'),
  deleteFile: (filePath) => fs.unlink(filePath),
  listFiles: (directory) => fs.readdir(directory),
  ensureDir: (directory) => fs.mkdir(directory, { recursive: true }).then(() => undefined),
  exists: async (targetPath) => {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  },
  getFileStats: async (filePath) => {
    const stats = await fs.stat(filePath);
    return { size: stats.size };
  },
  joinPath: (...parts) => path.join(...parts),
};

const storage = new ExternalStorageProvider(adapter, {
  dataDir: './kizuna-data',
  prettyJson: true,
  autoCreateDir: true,
});

const kizuna = new KizunaManager(
  createDefaultKizunaConfig(),
  storage,
  'character-bond-v1',
);

await kizuna.initialize();
```

The constructor order is `(adapter, config)`. `ExternalStorageProvider`
sanitizes the storage key into a JSON filename. Characters outside letters,
digits, `_`, and `-` become `_`, so choose keys that remain distinct after
sanitization.

The adapter contract is:

```typescript
interface ExternalStorageAdapter {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, data: string): Promise<void>;
  deleteFile(filePath: string): Promise<void>;
  listFiles(dirPath: string): Promise<string[]>;
  ensureDir(dirPath: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getFileStats?(filePath: string): Promise<{ size: number }>;
  joinPath(...components: string[]): string;
}
```

## Storage factories

`createStorageProvider(options?, externalAdapter?)` and
`createDefaultStorageProvider(externalAdapter?)` select a provider from the
detected runtime.

```typescript
const storage = createStorageProvider(
  {
    browser: { maxStorageSize: 2 * 1024 * 1024 },
    external: { dataDir: './kizuna-data' },
  },
  adapter,
);
```

In a non-browser runtime, pass an external adapter. Without one, the current
factory falls back to `LocalStorageProvider`, whose constructor throws when
`localStorage` is unavailable.

## Persistence format

Kizuna writes a versioned envelope:

```typescript
interface PersistenceEnvelope {
  format: '@aituber-onair/kizuna';
  version: 1;
  users: Record<string, unknown>;
  sessionCounter: number;
  limitRecords: Array<{
    userId: string;
    ruleId: string;
    lastApplied: number;
    bucketKey: string;
    bucketCount: number;
  }>;
}
```

`users` contains bond state. `sessionCounter` prevents restored session buckets
from moving backwards. `limitRecords` preserves rule cooldown and per-bucket
limit behavior across restarts.

Version 0.0.3 also accepts the legacy plain user-map shape on load. New writes
always use the envelope. Storage writes are serialized through an internal
queue so an older asynchronous write cannot overwrite a newer snapshot.

Kizuna logs and contains provider failures during automatic load/save so a
storage outage does not stop the interaction flow. Call provider methods
directly when an application needs storage failures to be surfaced as control
flow, and monitor Kizuna error logs in production.

## Retention and cleanup

The manager periodically applies `config.storage`:

```typescript
config.storage = {
  maxUsers: 1_000,
  dataRetentionDays: 90,
  cleanupIntervalHours: 24,
};
```

Old guest records are removed after the retention period. If the user count
still exceeds `maxUsers`, the oldest guest records are removed first. Owner
records are preserved by cleanup. Cleanup modifies in-memory state; a later
persisted interaction stores the resulting snapshot.

## Operational checklist

- Use a stable, non-secret storage key that is unique per character and schema.
- Call `initialize()` before reads and `destroy()` during shutdown or unmount.
- Treat browser storage as user-controlled and quota-limited.
- Keep built-in compression off when reducing size is the objective.
- Treat built-in encryption as obfuscation only.
- Supply an adapter outside browser environments.
- Back up or migrate persisted data before changing IDs or the storage key.
- Test retention, quota, corruption, and concurrent writes with realistic data.
