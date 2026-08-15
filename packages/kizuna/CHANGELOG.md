# @aituber-onair/kizuna

## 0.0.3

### Breaking Changes

- Replaced source-specific interactions with `Interaction`. Callers now pass a
  generic `kind` such as `message`, `reaction`, `gift`, `presence`, or `touch`
  instead of `platform`. `userId` is treated as an opaque application ID.
- Replaced source-specific user fields with a stable bond identity:
  `KizunaUser.type` is now `role` (`owner` or `guest`), and message/day counters
  are now generic interaction, continuity, and favorite-emotion statistics.
- Replaced `KizunaConfig.platforms` and `customRules` with `basePoints` and
  `rules`. Owner `dailyBonus` and `specialCommands` were removed;
  `firstContactBonus` was added.
- Replaced `PointRule.dailyLimit` with `bucketLimit`, which follows the selected
  day, week, session, or custom continuity bucket.
- Removed the public `generateUserId()` and `parseUserId()` helpers. Applications
  now own opaque user IDs and any source-to-ID mapping.
- Removed the `ChatType` and `PlatformPointConfig` exports. Use
  `InteractionKind` and `KizunaConfig.basePoints` instead.
- Changed low-level helper APIs. `UserManager` now requires a `BondEvaluator`
  as its second constructor argument, and `getUserCountByPlatform()` became
  `getUserCountByRole()`. `resetUserPoints()` was removed in favor of signed
  adjustments through `KizunaManager`.
  `PointCalculator.recordRuleApplication()` now requires the relevant
  `Interaction` as its third argument. Prefer `KizunaManager` unless the
  application needs to compose these helpers directly.
- Added required bond output and session lifecycle methods to
  `KizunaManagerInterface`: `getBondSnapshot()`, `getBondContext()`,
  `toRelationshipCapital()`, `beginSession()`, `endSession()`, and `destroy()`.
  Custom implementations and typed mocks must implement these methods.

`PointContext` and `UserType` remain as deprecated aliases for the new
`Interaction` and `UserRole` types, but their old property shapes are not
preserved.

### Added

- Bond stages, configurable levels, recency-based warmth, and continuity
  streaks with day, week, session, or safe-integer custom buckets.
- `getBondSnapshot()`, `getBondContext()`, and
  `toRelationshipCapital()` output APIs for application UI, LLM prompts, and
  downstream relationship gates.
- English, Japanese, and custom bond-context templates.
- `beginSession()` / `endSession()` lifecycle APIs and an injectable `now()`
  clock for deterministic simulations and tests.
- Versioned persistence envelopes that preserve rule limits and session
  counters, serialize concurrent writes, and continue to load legacy user-map
  data.
- A browser bond simulator with four people, five contact kinds, emotion
  selection, simulated time, achievements, event history, and context preview.
- A one-on-one chat demo (`examples/chat-bond-sample`) that runs without any
  LLM or TTS: scripted replies with emotions, an animated intimacy graph, and
  a normalized, scored dictionary classifier (with false-positive guards) as a
  stand-in for the LLM reaction emotion used in real applications.
- Kizuna integrations in the Noise session sample and the Core
  `react-pngtuber-app` example.
- Human-modeled relationship dynamics with `human`, `forgiving`, and `strict`
  presets, signed bond changes, fast warmth, stage buffering, grave-event
  scars, sustained repair, and mood-gated gifts.
- `stage_down`, `scar_created`, and `scar_healed` lifecycle events plus trend,
  atmosphere, and scar memory in bond snapshots and LLM context.

### Changed

- Consolidated all user ownership and updates under `UserManager`.
- Made bond scores signed in motion and floored at zero; positive earnings
  remain separately accumulated in `stats.totalPointsEarned`.
- Added per-bucket diminishing returns, continuity bonuses, demotion
  hysteresis, bounded offense escalation, and one grave event per user and
  continuity bucket. Persisted anti-farming bucket history is bounded, and
  delayed contacts cannot rewrite the current atmosphere or scar lifecycle.
- Made absence affect only explainable warmth decay, never the bond score or
  stage, and documented the no-guilt design stance.
- Hardened continuity against out-of-order contacts and persistence against
  unsafe IDs, lifecycle races, and stale asynchronous writes.
- Rewrote the English and Japanese READMEs around the bond lifecycle, added an
  API and migration guide, and moved storage implementation and security notes
  to `docs/storage.md`. Added a top-level workflow section explaining the
  message round-trip: the LLM acts as sensor (reaction emotion) and actuator
  (bond-aware replies), while Kizuna updates bond state deterministically —
  bond-change amounts are never decided by an LLM.

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

const storage = new ExternalStorageProvider(adapter, { dataDir: './kizuna-data' });
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
