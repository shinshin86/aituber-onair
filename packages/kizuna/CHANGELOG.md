# @aituber-onair/kizuna

## 0.0.2

### Major Changes

- **🔥 BREAKING: Browser Compatibility Refactoring** - Complete architectural overhaul for modern browser compatibility
  - Removed `FileSystemStorageProvider` and all Node.js dependencies (`node:fs`, `node:path`)
  - Fixed Vite build errors: "Module 'node:fs' has been externalized for browser compatibility"
  - Package now works seamlessly with Vite, Webpack, and other modern bundlers

### Minor Changes

- **✨ Dependency Injection Architecture** - New `ExternalStorageProvider` with user-provided file system adapters
  - Flexible storage system where users control file system implementation
  - Maintains Node.js support through dependency injection pattern
  - Automatic fallback to `LocalStorageProvider` when no adapter provided

- **📁 Package Structure Alignment** - Unified configuration with manneri package
  - Simplified TypeScript configuration (removed dual CommonJS/ESM builds)
  - Added `biome.json` for consistent code quality across packages
  - Updated `package.json` structure for better npm compatibility

- **📚 Comprehensive Documentation Updates**
  - Complete README rewrite with browser compatibility focus
  - Added Japanese documentation (`README.ja.md`) updates
  - Migration guide from v0.0.1 to v0.0.2 with practical examples
  - Updated `CLAUDE.md` with kizuna package documentation

- **🛠️ Developer Experience Improvements**
  - All lint errors resolved with proper exclusion of `dist/` directory
  - Improved test coverage for new dependency injection architecture
  - Better error messages and type safety

### Breaking Changes

- **Removed**: `FileSystemStorageProvider` class
- **Removed**: Automatic Node.js file system operations
- **Required**: Users must provide `ExternalStorageAdapter` for Node.js environments
- **Changed**: Storage factory now requires explicit adapter for file operations

### Migration Guide

```typescript
// OLD (v0.0.1) - No longer available
import { FileSystemStorageProvider } from '@aituber-onair/kizuna';
const storage = new FileSystemStorageProvider({ dataDir: './data' });

// NEW (v0.0.2+) - Dependency injection
import { ExternalStorageProvider, type ExternalStorageAdapter } from '@aituber-onair/kizuna';
import { promises as fs } from 'fs';
import path from 'path';

const adapter: ExternalStorageAdapter = {
  async readFile(filePath) { return await fs.readFile(filePath, 'utf-8'); },
  async writeFile(filePath, data) { await fs.writeFile(filePath, data, 'utf-8'); },
  // ... implement other required methods
};

const storage = new ExternalStorageProvider({ dataDir: './kizuna-data' }, adapter);
```

### Benefits

- ✅ **Browser Compatible** - Works with all modern bundlers and frameworks
- ✅ **Zero Node.js Dependencies** - Clean browser builds without polyfills
- ✅ **Flexible Architecture** - Users control file system implementation
- ✅ **Universal Package** - Supports browser, Node.js, Deno, and Bun environments
- ✅ **Better Performance** - Smaller bundle size without unused Node.js modules

## 0.0.1

### Minor Changes

- Initial alpha release of Kizuna (絆) - A sophisticated bond system for managing relationships between users and AI characters
- Core features include user management, point calculation, and multiple storage providers
- Supports both file system and local storage for maximum flexibility
- Cross-platform compatibility with automatic environment detection
- TypeScript support with full type definitions
- Zero external dependencies for maximum portability