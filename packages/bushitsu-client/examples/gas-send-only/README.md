# Google Apps Script Send-Only Example

This example shows how to use `createGasBushitsuMessageSender` inside Google Apps Script to send chat messages to a Bushitsu server.

## Setup

1. Create a new project in the Apps Script editor.
2. Add the compiled library bundle (`@aituber-onair/bushitsu-client` → `dist/esm/gas/index.js`) or copy the source from this example into your project.
3. Set the following script properties (or hard-code them while prototyping):
   - `BUSHITSU_ENDPOINT` – HTTPS endpoint that bridges to your Bushitsu server (expects JSON payload).
   - `BUSHITSU_ROOM`
   - `BUSHITSU_USER_NAME`

## Example

The `Code.gs` file contains two helper functions:

- `sendHello()` – Sends a one-off message using project properties.
- `sendWithCustomPayload()` – Shows how to override the payload format when your endpoint requires a custom contract.

You can trigger either function from the Apps Script editor (`Run` menu) or wire them to time-based triggers.

## Endpoint Contract

The default payload is:

```json
{
  "room": "<room>",
  "userName": "<user>",
  "text": "<message>",
  "mentionTo": "<optional>"
}
```

If your bridge expects a different schema, implement `payloadBuilder` as demonstrated in the example.
