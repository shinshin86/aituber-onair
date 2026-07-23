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
   - Rename the file to `lib.gs`
   - Open `packages/chat/dist/umd/aituber-onair-chat.js` in your local editor
   - Copy all content and paste it into the GAS `lib.gs` file
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

   **Manifest (Optional):**
   - Most new GAS projects already run on the V8 runtime; no manifest is required.
   - If you want to customize settings (e.g., time zone, exception logging), enable the manifest in Project Settings and add an `appsscript.json` manually. A minimal example:

```json
{
  "timeZone": "Asia/Tokyo",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

4) Run the function:
- Open the Apps Script editor and run `testChat`.
- Check the logs for the response.

## Notes
- Streaming is not supported on GAS. Use `runOnceText` or `chatOnce(..., false)`.
- The adapter `installGASFetch()` injects a minimal fetch backed by `UrlFetchApp`.

## Applied Recipe: Google Forms → Gmail Draft (`forms-autodraft-openai.js`)

`forms-autodraft-openai.js` is an applied recipe built on the same UMD bundle
setup described above. It creates a **"thank-you + key-points"** reply as a
**Gmail draft immediately after a Google Form is submitted**:

1. A responder submits a Google Form.
2. An installable **onFormSubmit** trigger bound to the Form fires the handler.
3. The script collects the Q&A text and calls OpenAI **`gpt-4.1-nano`** via
   the UMD bundle (`installGASFetch()` + `runOnceText`; non-streaming).
4. A Gmail draft addressed to the responder is created with a polite thank-you
   and a concise 3-bullet summary.

### Additional Prerequisites

- A Google account with access to **Google Forms** and **Gmail**.
- An OpenAI API key stored in Script Properties as `OPENAI_API_KEY`.
- The Form's **Settings → Responses → Collect email addresses** set to **ON**
  (recommended: **Verified**) so `getRespondentEmail()` returns an address.

### Setup

1. Open the Form → **More (⋮) → Script editor** to create a
   **container-bound** Apps Script project.
2. Add the UMD bundle as a script file, following the same steps as the basic
   example above (build-and-paste is more robust for triggers than CDN
   loading).
3. Create a script file and paste the content of `forms-autodraft-openai.js`.
4. Add `OPENAI_API_KEY` in **Project Settings → Script properties**.
5. Run `setupTrigger_autoReply()` once to create the installable
   **onFormSubmit** trigger (or add it manually via **Triggers → Add Trigger**
   with function `autoReply_onFormSubmit`, event source **From form**, event
   type **On form submit**).
6. Submit a test response and check Gmail **Drafts** (and the Apps Script
   **Executions** log if something fails).

### Recipe Notes

- **Model**: defaults to `gpt-4.1-nano`; use a date-pinned alias for
  deterministic behavior, or add a fallback (e.g., `gpt-4.1-mini`) if rate
  limits occur.
- **No draft created**: ensure the trigger is attached to the **Form**
  (installable onFormSubmit) and the script was authorized on first run.
- **Empty recipient address**: verify **Collect email addresses** is ON;
  otherwise `getRespondentEmail()` returns an empty string.
- **Quotas**: Apps Script has daily quotas for `UrlFetchApp`, Gmail, and total
  execution time; plan volume accordingly.
