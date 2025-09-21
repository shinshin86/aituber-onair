# React Basic Example

This example shows how to wire `useBushitsuClient` inside a Vite + React project.

## Prerequisites

- Node.js 20+
- A running Bushitsu server (HTTP base URL, e.g. `http://localhost:8080`)

## Quick Setup

1. Scaffold a new Vite project (TypeScript + React):

   ```bash
   npm create vite@latest bushitsu-react -- --template react-ts
   cd bushitsu-react
   ```

2. Install dependencies:

   ```bash
   npm install
   npm install @aituber-onair/bushitsu-client
   ```

3. Replace the generated `src/App.tsx` and `src/main.tsx` with the files from this directory.

4. Create `.env.local` and set the connection details:

   ```bash
   VITE_BUSHITSU_SERVER_URL=http://localhost:8080
   VITE_BUSHITSU_ROOM=lobby
   VITE_BUSHITSU_USER=ReactUser
   ```

5. Run the dev server:

   ```bash
   npm run dev
   ```

You should see connection status updates and an input box for sending chat messages.

## Files

- `src/App.tsx` – React component that connects to Bushitsu and renders a simple chat UI.
- `src/main.tsx` – Standard ReactDOM entry point.

Adjust the styling or state management as needed for your application.
