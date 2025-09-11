# GAS Example (Google Forms → Gmail Draft, OpenAI `gpt-4.1-nano`, Non‑Streaming)

This example creates a **“thank‑you + key‑points”** reply **as a Gmail draft immediately after a Google Form is submitted**, using `@aituber-onair/chat` from Google Apps Script (GAS).

* **Trigger:** Installable `onFormSubmit` bound to the **Form**
* **Mail target:** The responder’s address via `getRespondentEmail()` (when **Collect email addresses** is enabled)
* **Model:** OpenAI **`gpt-4.1-nano`** (date‑pinned alias optional)
* **Networking:** Uses the UMD bundle + `installGASFetch()`; **streaming is not used** (`runOnceText`)

---

## Why the UMD Bundle Is Required

Google Apps Script has environment constraints:

* **No npm/Node.js:** cannot `npm install` or `require()`
* **File‑based loading:** external libraries must be copied as script files
* **No ES Modules/CommonJS:** legacy IIFE/UMD formats only

Therefore, you should build the UMD bundle and paste it into the GAS project.

---

## What This Example Does

1. A responder submits a Google Form.
2. An **installable Form trigger** fires your function with a `FormResponse` event.
3. The script collects the Q\&A text and calls OpenAI **`gpt-4.1-nano`** via `@aituber-onair/chat` (UMD + `installGASFetch()` + `runOnceText`).
4. The script creates a **Gmail draft** to the responder that includes a polite thank‑you and a concise 3‑bullet summary.

---

## Prerequisites

* A Google account with access to **Google Forms** and **Gmail**
* GAS runtime: **V8** (default for new projects)
* An **OpenAI API key** saved in **Script Properties** as `OPENAI_API_KEY`
* Your Form’s **Settings → Responses → Collect email addresses** set to **ON** (recommended: **Verified**) so `getRespondentEmail()` returns an address

---

## Setup Instructions

### 1) Create / open the Form‑bound script

Open the Form → **More (⋮) → Script editor** to create a **container‑bound** Apps Script project.

### 2) Add the `@aituber-onair/chat` UMD bundle

**Option A — Build from source (recommended)**

```bash
# At monorepo root
npm ci
npm -w @aituber-onair/chat run build
# → packages/chat/dist/umd/aituber-onair-chat(.min).js
```

In the Apps Script editor:

* Click “＋” → **Script** → rename to `lib_aituber.js`
* Open `packages/chat/dist/umd/aituber-onair-chat.min.js` locally
* **Copy all contents** and paste into `lib_aituber.js` → Save

**Option B — Use a CDN (alternative)**

```javascript
// Run this once (or on startup) to load the UMD bundle at runtime
function setupLibrary() {
  const r = UrlFetchApp.fetch(
    'https://unpkg.com/@aituber-onair/chat/dist/umd/aituber-onair-chat.min.js'
  );
  eval(r.getContentText()); // AITuberOnAirChat becomes global
}
```

> If you choose the CDN approach, ensure the bundle is loaded **before** calling any chat APIs (e.g., call `setupLibrary()` in your setup step or at the beginning of the handler). For triggers, the **build‑and‑paste** approach is still recommended.

### 3) Add the example code

* Click “＋” → **Script** → create `Code.gs`
* Paste the **example code** for this sample (OpenAI **`gpt-4.1-nano`** version you prepared) and save

  * The example should use `installGASFetch()` and `runOnceText()`
  * Provider/model should be set to `provider: 'openai'`, `model: 'gpt-4.1-nano'` (or a date‑pinned alias)

### 4) Store your OpenAI key in Script Properties

Editor → **Project Settings** → **Script properties** → add key `OPENAI_API_KEY` with your OpenAI API key.

### 5) Enable “Collect email addresses” in your Form

Form → **Settings → Responses → Collect email addresses** → turn **ON** (choose **Verified** if appropriate).
This allows `FormResponse.getRespondentEmail()` to provide the recipient address.

### 6) Create the installable Form trigger

Run the helper function provided in the example (e.g., `setupTrigger_autoReply()`) **once** to create an **onFormSubmit** trigger for the Form.
Alternatively, in the Apps Script UI: **Triggers (clock icon) → Add Trigger**

* Function: `autoReply_onFormSubmit`
* Event source: **From form**
* Event type: **On form submit**

### 7) Test

* Submit a response to the Form
* Open Gmail → **Drafts** and confirm a draft titled e.g.
  **“Thank you for your response — {Form title}”**
* Review logs (Executions) if something fails

---

## Model Selection

* **Default:** `gpt-4.1-nano`
* **Optional:** Use a date‑pinned alias (e.g., `gpt-4.1-nano-YYYY-MM-DD`) for deterministic behavior over time
* You may add a fallback (e.g., to `gpt-4.1-mini`) inside the example code if rate limits occur

---

## Manifest (Optional)

Most projects run fine without a custom manifest. If you want one, enable **Project Settings → Show “appsscript.json”** and add:

```json
{
  "timeZone": "Asia/Tokyo",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

If you need to explicitly control OAuth scopes for distribution, add `"oauthScopes"` with the minimal set required.

---

## Notes

* **Non‑Streaming:** GAS does not support streaming responses. Use `runOnceText` (one‑shot).
* **Quotas:** Apps Script has daily quotas for `UrlFetchApp`, Gmail, total execution time, etc. Plan volume accordingly.
* **Security:** Keep API keys in **Script Properties**; do not hard‑code secrets.
* **clasp:** For local editing and CI, you can manage files with the `clasp` CLI (`push`/`pull`).
* **CDN vs local UMD:** CDN loading is convenient but requires network at runtime; the **copied UMD file** is more robust for triggers.

---

## Troubleshooting

* **No draft created**

  * Ensure the trigger is attached to the **Form** (installable **onFormSubmit**), not just a spreadsheet.
  * Confirm the script has been authorized on first run (Permissions dialog).
* **Empty recipient address**

  * Verify **Collect email addresses** is ON; otherwise `getRespondentEmail()` will be empty.
* **Authorization / scope warnings**

  * If distributing broadly, explicitly declare the minimal OAuth scopes in `appsscript.json`.
* **Quota exceeded**

  * Reduce frequency, batch submissions, or add a fallback model and stricter summarization prompts.

---

## Suggested Folder Structure

```
packages/
  chat/
    examples/
      gas-forms-autodraft-openai/
        README.md            # ← this file
        Code.gs              # ← example code using gpt-4.1-nano
        lib_aituber.js       # ← UMD bundle (built or loaded via CDN)
        appsscript.json      # ← optional manifest
```
