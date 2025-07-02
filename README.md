# AITuber OnAir
[![CI](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml/badge.svg)](https://github.com/shinshin86/aituber-onair/actions/workflows/ci.yml)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/shinshin86/aituber-onair)

![AITuber OnAir Toolkit - logo](./images/AITuber_OnAir_Toolkit.png)

[日本語版はこちら](./README_ja.md)

Welcome to the **AITuber OnAir** monorepo! This repository contains various packages and tools that power AI-driven virtual streaming and related features.

Currently, the primary package available is:

- [**@aituber-onair/core**](./packages/core/README.md)
  A TypeScript library for generating text and audio responses in AI Tuber streaming scenarios. It provides seamless integration with various AI and speech APIs, as well as memory and conversation context management.
  ```
  npm install @aituber-onair/core
  ```

## Getting Started

1. **Clone the repository**  
   ```bash
   git clone https://github.com/shinshin86/aituber-onair.git
   cd aituber-onair
   ```

2. **Install dependencies**  
   This monorepo uses **npm workspaces**. Simply run:
   ```bash
   npm install
   ```

3. **Build all packages**  
   ```bash
   npm run build
   ```
   - This runs the build script for each package in the `packages/` directory.

4. **Test all packages**  
   ```bash
   npm run test
   ```
   - Runs the test suite for each package.

5. **Format all packages**
   ```bash
   npm run fmt
   ```
   - Runs the format for each package.

## Project Structure

```
aituber-onair/
├── packages/
│   └── core/
│       ├── src/
│       ├── test/
│       └── package.json
├── package.json
├── README.md
└── ...
```

- **packages/core**: The main library (`@aituber-onair/core`) providing AI conversation and voice features.

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management and automated releases.

### Creating a Release

#### Automated Release (Recommended)

1. **Create a changeset for your changes**
   ```bash
   npm run changeset
   ```
   - Select the packages that were modified
   - Choose the appropriate version bump (patch/minor/major)
   - Write a clear description of the changes

2. **Commit the changeset file**
   ```bash
   git add .changeset/
   git commit -m "Add changeset for [your feature]"
   ```

3. **Push to GitHub and create a PR**
   - After merging to main, the GitHub Action will automatically create a "Version Packages" PR
   - This PR will include all pending changesets

4. **Merge the Version PR**
   - Review and merge the "Version Packages" PR
   - This will automatically:
     - Update package versions
     - Update CHANGELOG.md files
     - Create git tags
     - Publish packages to npm

#### Manual Release (if needed)

For a complete manual release workflow:

1. **Create changeset for your changes**
   ```bash
   npm run changeset
   ```

2. **Update package versions**
   ```bash
   npm run changeset:version
   ```

3. **Release (build, test, and publish)**
   ```bash
   npm run release
   ```

Alternative individual operations:
```bash
# Check what would be published
npm run changeset:publish -- --dry-run

# Manually publish packages (after changeset:version)
npm run changeset:publish
```

**Note**: `npm run release` executes `build → test → publish` in sequence. If any step fails, the process stops and packages won't be published.

## License

This project is open-sourced under the [MIT License](./LICENSE).

## Special Thanks

This project is based on [the work referenced below](https://x.com/shinshin86/status/1862806042603847905). Without the contributions of these pioneers, I would not have been able to create it.