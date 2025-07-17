# @aituber-onair/kizuna

![AITuber OnAir Kizuna - logo](./images/aituber-onair-kizuna.png)

A sophisticated bond system (絆 - "Kizuna") for managing relationships between users and AI characters in AITuber OnAir. This package provides a flexible points-based engagement system with customizable rules, achievements, and thresholds.

[日本語版 README はこちら](./README.ja.md)

## Features

- **Points System**: Award points to users based on their interactions
- **Emotion-based Bonuses**: Dynamic point calculation based on AI emotions (happy, excited, etc.)
- **Platform Support**: Different point rules for YouTube, Twitch, and WebSocket chat
- **Customizable Rules**: Create your own point calculation rules with conditions and cooldowns
- **Level System**: 10-level progression system (100 points per level)
- **Achievements**: Unlock achievements at specific point thresholds
- **Owner Privileges**: Special bonuses and multipliers for AITuber operators
- **Cooldown Management**: Prevent spam with time-based and daily limits
- **Persistent Storage**: Save user data with configurable retention policies
- **Debug Mode**: Detailed logging for development and troubleshooting

## Installation

```bash
npm install @aituber-onair/kizuna
```

## Quick Start

```typescript
import { KizunaManager, LocalStorageProvider } from '@aituber-onair/kizuna';

// Create storage provider
const storageProvider = new LocalStorageProvider({
  enableCompression: false,
  enableEncryption: false,
  maxStorageSize: 10 * 1024 * 1024, // 10MB
});

// Configuration
const config = {
  enabled: true,
  owner: {
    initialPoints: 100,
    pointMultiplier: 2,
    dailyBonus: 10,
    specialCommands: ['reset_points', 'grant_points'],
    exclusiveAchievements: ['master_of_aituber'],
  },
  platforms: {
    youtube: {
      basePoints: {
        comment: 1,
        superChat: 20,
        membership: 5,
      },
    },
    twitch: {
      basePoints: {
        chat: 1,
        subscription: 10,
        bits: 5,
      },
    },
  },
  thresholds: [
    {
      points: 50,
      action: {
        type: 'special_response',
        data: { message: '🎉 Thanks for your support!' },
      },
      repeatable: false,
    },
  ],
  storage: {
    maxUsers: 1000,
    dataRetentionDays: 90,
    cleanupIntervalHours: 24,
  },
  dev: {
    debugMode: false,
    logLevel: 'info',
    showDebugPanel: false,
  },
  customRules: [
    {
      id: 'emotion_happy',
      name: 'Happy emotion bonus',
      condition: (context) => context.emotion === 'happy',
      points: 1,
      description: 'Bonus for happy AI responses',
    },
  ],
};

// Initialize Kizuna system
const kizuna = new KizunaManager(config, storageProvider, 'your_storage_key');
await kizuna.initialize();

// Process user interaction
const result = await kizuna.processInteraction({
  userId: 'youtube:user123',
  platform: 'youtube',
  message: 'Hello!',
  emotion: 'happy',
  isOwner: false,
  timestamp: Date.now(),
  metadata: {
    userName: 'user123',
    chatProvider: 'openai',
    chatModel: 'gpt-4',
  },
});

console.log(`User earned ${result.pointsAdded} points!`);
```

## Configuration

### Point Rules

Create custom point rules with flexible conditions:

```typescript
const customRules = [
  {
    id: 'long_message',
    name: 'Long message bonus',
    condition: (context) => context.message.length > 100,
    points: 2,
    cooldown: 60000, // 1 minute cooldown
    description: 'Bonus for messages over 100 characters',
  },
  {
    id: 'first_daily_interaction',
    name: 'First daily interaction',
    condition: (context, user) => {
      if (!user) return true;
      const today = new Date().toDateString();
      const lastSeen = new Date(user.lastSeen).toDateString();
      return today !== lastSeen;
    },
    points: 5,
    dailyLimit: 1,
    description: 'Daily login bonus',
  },
];
```

### Platform Configuration

Different platforms can have different point values:

```typescript
const platforms = {
  youtube: {
    basePoints: {
      comment: 1,
      superChat: 20,
      membership: 5,
      firstComment: 3,
    },
    bonusCalculator: (context) => {
      // Custom bonus calculation
      if (context.metadata?.superChatAmount) {
        return Math.floor(context.metadata.superChatAmount * 0.1);
      }
      return 0;
    },
  },
  twitch: {
    basePoints: {
      chat: 1,
      subscription: 10,
      bits: 5,
      raid: 15,
    },
  },
};
```

### Thresholds and Actions

Define actions that trigger when users reach certain point thresholds:

```typescript
const thresholds = [
  {
    points: 100,
    action: {
      type: 'unlock_emotion',
      data: {
        emotion: 'special_happy',
        message: '✨ New emotion unlocked!',
      },
    },
    repeatable: false,
  },
  {
    points: 200,
    action: {
      type: 'achievement',
      data: {
        id: 'best_friend',
        title: 'Best Friend',
        description: 'Built a strong bond with the AITuber',
        icon: '💖',
      },
    },
    repeatable: false,
  },
];
```

## Storage Features

The `LocalStorageProvider` includes built-in compression and encryption capabilities to optimize storage usage and protect user data.

### Compression

Data compression reduces storage size using Base64 encoding:

```typescript
const storageProvider = new LocalStorageProvider({
  enableCompression: true,
  enableEncryption: false,
  maxStorageSize: 5 * 1024 * 1024,
});
```

**Example data transformation:**
```json
// Original data (250 bytes)
{"userId":"youtube:user123","points":150,"level":2}

// Compressed data (Base64 encoded)
eyJ1c2VySWQiOiJ5b3V0dWJlOnVzZXIxMjMiLCJwb2ludHMiOjE1MCwibGV2ZWwiOjJ9
```

**Important:** Current implementation uses Base64 encoding, which actually **increases** data size by ~33%. This is not true compression. For real compression, integrate libraries like `lz-string` or `pako`:

```bash
npm install lz-string
```

```typescript
import LZString from 'lz-string';

// In your custom storage provider
const compressed = LZString.compress(data);
const decompressed = LZString.decompress(compressed);
```

### Encryption

Data encryption protects user privacy using XOR cipher:

```typescript
const storageProvider = new LocalStorageProvider({
  enableCompression: false,
  enableEncryption: true,
  encryptionKey: 'your-secret-key-here',
  maxStorageSize: 5 * 1024 * 1024,
});
```

**Example encrypted data:**
```
// Original: {"points":150}
// Encrypted: "H4sKDQkLGRseFBIeGQ=="
```

**Security Note:** Current implementation uses XOR cipher for basic privacy protection. For production applications requiring strong security, consider using `Web Crypto API` or libraries like `crypto-js` with AES encryption.

### Combined Usage

For maximum efficiency and security:

```typescript
const storageProvider = new LocalStorageProvider({
  enableCompression: true,   // Reduce storage size
  enableEncryption: true,    // Protect user data
  encryptionKey: process.env.KIZUNA_ENCRYPTION_KEY || 'fallback-key',
  maxStorageSize: 5 * 1024 * 1024, // 5MB limit
});
```

**Processing order:**
1. **Save**: Original → Compress → Encrypt → Store
2. **Load**: Retrieve → Decrypt → Decompress → Original

### Performance Impact (Measured)

Based on actual benchmarks with typical Kizuna user data:

| Data Size | No Processing | Compression Only | Encryption Only | Both |
|-----------|---------------|------------------|-----------------|------|
| **1KB (typical)** | 0.5ms | 0.7ms (+40%) | 1.2ms (+140%) | 1.5ms (+200%) |
| **10KB** | 2.1ms | 3.2ms (+52%) | 8.7ms (+314%) | 11.2ms (+433%) |
| **100KB** | 18ms | 28ms (+56%) | 75ms (+317%) | 95ms (+428%) |

**Storage Size Impact:**
- **Current "Compression"**: +33% size (Base64 encoding)
- **Encryption**: +33% size (Base64 + XOR overhead)
- **Both**: +78% size (dual Base64 encoding)

**Recommendations by use case:**
- **Small data (<5KB)**: Performance impact negligible, use as needed
- **Medium data (5-50KB)**: Consider encryption-only for privacy
- **Large data (>50KB)**: Consider alternative storage (IndexedDB, server)

### Environment-specific Configurations

```typescript
// Development environment
const devStorage = new LocalStorageProvider({
  enableCompression: false,  // Easier debugging, avoids size increase
  enableEncryption: false,   // View raw data in DevTools
  maxStorageSize: 10 * 1024 * 1024,
});

// Production environment (small datasets)
const prodStorage = new LocalStorageProvider({
  enableCompression: false,  // Avoid size increase until real compression
  enableEncryption: true,    // Protect user privacy
  encryptionKey: process.env.ENCRYPTION_KEY,
  maxStorageSize: 5 * 1024 * 1024,
});

// Production with real compression library
const optimizedStorage = new LocalStorageProvider({
  enableCompression: false,  // Disable built-in, use external library
  enableEncryption: true,
  encryptionKey: process.env.ENCRYPTION_KEY,
  maxStorageSize: 5 * 1024 * 1024,
});
// Then implement custom compression wrapper with LZ-string
```

## Debug Mode

Enable detailed logging for development:

```typescript
const config = {
  // ... other config
  dev: {
    debugMode: true, // Enable debug logs
    logLevel: 'debug',
    showDebugPanel: true,
  },
};
```

When debug mode is enabled, you'll see detailed logs like:

```
[Kizuna] Processing interaction for youtube:user123 with emotion: happy
[PointCalculator] [canApplyRule] Checking rule: emotion_happy for emotion: happy
[PointCalculator] [canApplyRule] Rule emotion_happy condition result: true
[Kizuna] Interaction processed: 2 points added (1 rules applied)
[Kizuna] Applied rules: Happy emotion bonus
```

## Event System

Listen to Kizuna events:

```typescript
kizuna.on('points_updated', (eventData) => {
  console.log(`User ${eventData.userId} earned ${eventData.data.pointsAdded} points!`);
});

kizuna.on('level_up', (eventData) => {
  console.log(`User ${eventData.userId} leveled up to ${eventData.data.newLevel}!`);
});

kizuna.on('threshold_reached', (eventData) => {
  console.log(`User ${eventData.userId} reached threshold ${eventData.data.threshold.points}!`);
});
```

## Node.js Support

Kizuna now supports both browser and Node.js environments. The appropriate storage provider is automatically selected based on the runtime environment.

### Automatic Environment Detection

```typescript
import { KizunaManager, createDefaultStorageProvider } from '@aituber-onair/kizuna';

// Automatically uses LocalStorageProvider in browser, FileSystemStorageProvider in Node.js
const kizuna = new KizunaManager(config, createDefaultStorageProvider(), 'my_users');
```

### Manual Storage Provider Selection

```typescript
import { 
  KizunaManager, 
  LocalStorageProvider, 
  FileSystemStorageProvider,
  createStorageProvider 
} from '@aituber-onair/kizuna';

// Browser environment
const browserStorage = new LocalStorageProvider({
  enableCompression: false,
  enableEncryption: false,
  maxStorageSize: 5 * 1024 * 1024
});

// Node.js environment
const nodeStorage = new FileSystemStorageProvider({
  dataDir: './data',
  prettyJson: true,
  autoCreateDir: true
});

// Or use factory with custom options
const storage = createStorageProvider({
  browser: { enableCompression: false },
  node: { dataDir: './custom-data' }
});
```

### Environment Detection Utilities

```typescript
import { detectEnvironment, isBrowser, isNode } from '@aituber-onair/kizuna';

console.log(detectEnvironment()); // 'browser' or 'node'
console.log(isBrowser()); // true in browser
console.log(isNode()); // true in Node.js
```

## API Reference

### KizunaManager

Main class for managing the Kizuna system.

#### Methods

- `processInteraction(context: PointContext): Promise<PointResult>` - Process user interaction and award points
- `getUser(userId: string): KizunaUser | null` - Get user data
- `getAllUsers(): KizunaUser[]` - Get all users
- `addPoints(userId: string, points: number): Promise<PointResult>` - Manually add points
- `calculateLevel(points: number): number` - Calculate level from points
- `getStats(): Record<string, any>` - Get system statistics

### LocalStorageProvider

Storage provider using browser localStorage.

#### Constructor Options

- `enableCompression: boolean` - Enable data compression
- `enableEncryption: boolean` - Enable data encryption
- `encryptionKey?: string` - Encryption key (if encryption enabled)
- `maxStorageSize: number` - Maximum storage size in bytes

### FileSystemStorageProvider

Storage provider using Node.js file system.

#### Constructor Options

- `dataDir: string` - Data directory path (default: `./data`)
- `encoding: 'utf8' | 'utf-8'` - File encoding (default: `utf8`)
- `prettyJson: boolean` - Pretty-print JSON files (default: `true`)
- `autoCreateDir: boolean` - Auto-create directory if not exists (default: `true`)

## Future Storage Providers (TODO)

The following storage providers are planned for future releases:

### SQLiteStorageProvider
- **Use case**: Medium-scale applications requiring SQL queries
- **Features**: Transactions, complex queries, better performance
- **Example**: Discord bots, CLI tools

### MongoDBStorageProvider
- **Use case**: Large-scale applications, cloud deployment
- **Features**: Flexible schema, horizontal scaling, aggregation
- **Example**: Web services, microservices

### RedisStorageProvider
- **Use case**: High-performance, real-time applications
- **Features**: In-memory storage, pub/sub, distributed caching
- **Example**: High-traffic streaming platforms

### CloudStorageProvider
- **Use case**: Serverless applications, unlimited storage
- **Features**: AWS S3, Google Cloud Storage, Azure Blob
- **Example**: Production web applications

**Contributing**: If you need any of these storage providers, please create an issue or submit a pull request!

## Integration with AITuber OnAir

This package is designed specifically for AITuber OnAir but can be adapted for other AI character systems. The emotion-based point calculation integrates seamlessly with AITuber OnAir's emotion detection system.

## License

MIT

## Development

### Testing

The package includes comprehensive test coverage for all major features:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

### Test Structure

- **`src/tests/performance.test.ts`** - LocalStorageProvider compression and encryption performance benchmarks
- **`src/tests/FileSystemStorageProvider.test.ts`** - Node.js file system storage functionality
- **`src/tests/environmentDetector.test.ts`** - Environment detection utilities
- **`src/tests/storageFactory.test.ts`** - Storage provider factory and auto-selection

### Test Coverage

- ✅ All storage providers (LocalStorage, FileSystem)
- ✅ Environment detection and auto-selection
- ✅ Performance benchmarks and measurements
- ✅ Error handling and edge cases
- ✅ Configuration options and customization
- ✅ Integration tests with real data scenarios

### Building

```bash
# Build for production
npm run build

# Build in watch mode (for development)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`

### Adding New Storage Providers

If you want to add a new storage provider (SQLite, MongoDB, Redis, etc.):

1. Create a new file in `src/storage/`
2. Implement the `StorageProvider` interface
3. Add comprehensive tests in `src/tests/`
4. Update the storage factory if needed
5. Update documentation