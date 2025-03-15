# AITuber OnAir
**Currently under development. Please stay tuned for updates and releases soon!**

![AITuber OnAir Toolkit - logo](./images/AITuber_OnAir_Toolkit.png)

Welcome to the **AITuber OnAir** monorepo! This repository contains various packages and tools that power AI-driven virtual streaming and related features.

Currently, the primary package available is:

- [**[WIP] @aituber-onair/core**](./packages/core)  
  A TypeScript library for generating text and audio responses in AI Tuber streaming scenarios. It provides seamless integration with various AI and speech APIs, as well as memory and conversation context management.

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
   npm run build --workspaces
   ```
   - This runs the build script for each package in the `packages/` directory.

4. **Test all packages**  
   ```bash
   npm run test --workspaces
   ```
   - Runs the test suite for each package.

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

Future packages (e.g., `@aituber-onair/voice-engines`) will be added here as well.

## License

This project is open-sourced under the [MIT License](./LICENSE).