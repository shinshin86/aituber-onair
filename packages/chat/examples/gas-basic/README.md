# GAS Example (Non-Streaming)

This example demonstrates how to use `@aituber-onair/chat` from Google Apps Script (GAS) using the UMD bundle and the provided GAS fetch adapter.

## Why UMD Bundle is Required

Google Apps Script has several environment constraints:
- **No npm/Node.js support**: Cannot use `npm install` or `require()`
- **File-based library loading**: External libraries must be copied as script files
- **No ES Modules/CommonJS**: Only supports legacy IIFE/UMD formats

Therefore, we need to build a UMD bundle and manually copy it into the GAS project.

## Prerequisites
- Google Apps Script runtime: V8
- An API key (e.g., OpenAI) stored in Script Properties as `OPENAI_API_KEY`

## Setup Instructions

### Option 1: Build from Source (Recommended)

1) **Install dependencies and build the chat package**:
```bash
# At the repository root directory
npm ci                                    # Install all dependencies for the monorepo
npm -w @aituber-onair/chat run build     # Build only the chat package (generates CJS + ESM + UMD)
```

This creates `packages/chat/dist/umd/aituber-onair-chat.js` (~105KB).

2) **Copy the UMD file into your GAS project**:
   - Open Apps Script editor (script.google.com)
   - Create a new script file: Click "+" button → "Script"
   - Rename the file to `lib.js`
   - Open `packages/chat/dist/umd/aituber-onair-chat.js` in your local editor
   - Copy all content and paste it into the GAS `lib.js` file
   - Save the file
   
   *Alternative: Use clasp CLI to push files automatically (`clasp push`)*

### Option 2: Use CDN (Alternative)

If you prefer not to build from source, you can fetch the UMD bundle from CDN:

```javascript
// In your GAS project, create a setup function
function setupLibrary() {
  const response = UrlFetchApp.fetch('https://unpkg.com/@aituber-onair/chat/dist/umd/aituber-onair-chat.min.js');
  const libraryCode = response.getContentText();
  
  // Save to Script Properties or evaluate directly
  eval(libraryCode);
  
  // Now AITuberOnAirChat is available globally
}
```

**Note**: CDN approach requires internet access during script execution.

## Usage

3) **Add the example files**:
   
   **Create main.js:**
   - In the GAS editor, create another new script file: Click "+" button → "Script"
   - Rename it to `main.js`  
   - Copy the content from `packages/chat/examples/gas-basic/main.js` and paste it
   - Save the file
   
   **Add appsscript.json (V8 Runtime Configuration):**
   - In the GAS editor, click the gear icon (⚙️) "Project Settings" 
   - Check "Show 'appsscript.json' manifest file in editor"
   - Now you'll see `appsscript.json` appear in the file list
   - Click on `appsscript.json` to edit it
   - Replace the content with the content from `packages/chat/examples/gas-basic/appsscript.json`
   - Save the file

4) Run the function:
- Open the Apps Script editor and run `testChat`.
- Check the logs for the response.

## Notes
- Streaming is not supported on GAS. Use `runOnceText` or `chatOnce(..., false)`.
- The adapter `installGASFetch()` injects a minimal fetch backed by `UrlFetchApp`.

