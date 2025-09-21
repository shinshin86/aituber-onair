# Node.js Basic Example

This example demonstrates how to use `createNodeBushitsuClient` together with a Node.js WebSocket implementation (`ws`).

## Prerequisites

- Node.js 20+
- A Bushitsu-compatible WebSocket server reachable from your machine

## Install dependencies

```bash
npm install
npm install ws
```

## Run the example

```bash
node --loader ts-node/esm examples/node-basic/index.ts
```

Set the following environment variables before running the script:

- `BUSHITSU_SERVER_URL` – Base HTTP(S) URL of the Bushitsu server (e.g. `http://localhost:8787`)
- `BUSHITSU_ROOM` – Target room name
- `BUSHITSU_USER_NAME` – Display name to join with

## What the script does

- Connects to the Bushitsu WebSocket endpoint
- Logs incoming chat messages
- Sends a greeting message once the connection opens
- Listens for Ctrl+C to disconnect cleanly

Feel free to modify `examples/node-basic/index.ts` to experiment with sending periodic messages or integrating with other services.
