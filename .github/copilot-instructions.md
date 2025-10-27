## Quick orientation

- Purpose: Help AI coding agents become productive in this Chrome extension quickly by describing the architecture, developer workflows, and project-specific patterns.
- Entry points: `sidepanel.html` (UI), `service-worker.js` (background/service worker), `popup.js` (quick actions), `manifest.json` (permissions/commands), and content scripts under `Content Scripts/` (notably `scribe-content.js`).

## Big-picture architecture (why & how)

- Single MV* style side panel UI driven by modular JS in `JavaScript Modules/` (core logic lives in `sidepanel-core.js`). The side panel is the primary user surface; the service worker routes global commands/context menu events.
- On-device AI is managed centrally by `AIManager` in `JavaScript Modules/sidepanel-core.js` (look for aiManager.initialize()/prompt()/promptStreaming()). When extending AI behavior, reuse this manager rather than re-initializing the API.
- Scribe (workflow recorder) captures clicks via a content script: `Content Scripts/scribe-content.js`. The side panel injects this using `chrome.scripting.executeScript` and listens for messages of type `scribe-click-captured`.
- Tab/group orchestration uses the chrome.tabs & chrome.tabGroups APIs from the organizer module (see `JavaScript Modules/sidepanel-core.js` and related organizer files). Exports and PDFs leverage `External Libraries/jspdf.umd.min.js`.

## Key developer workflows (how to run & debug)

- Load unpacked extension: open `chrome://extensions/`, enable Developer mode, click "Load unpacked" and select this repo folder.
- Enable AI flags (required on some Chrome builds): `chrome://flags/#prompt-api-for-gemini-nano` and `chrome://flags/#optimization-guide-on-device-model` (not project files but required for ai.languageModel availability).
- Keyboard shortcuts (defined in `manifest.json`): `Ctrl+Shift+A` (run audit), `Ctrl+Shift+S` (start scribe), `Ctrl+Shift+O` (organize tabs). Use these to exercise code paths quickly.
- Debugging tips:
  - Inspect the service worker via chrome://extensions -> "Service worker" -> Inspect to view logs in `service-worker.js`.
  - Open the side panel UI then right-click -> Inspect to debug `sidepanel` scripts (console shows `sidepanel-core.js`, `sidepanel-scribe.js`, etc.).
  - Use the popup (`popup.html` / `popup.js`) to trigger `chrome.sidePanel.open()` and messages sent via `chrome.runtime.sendMessage`.

## Project-specific conventions & patterns

- Single global AppState object exported from `sidepanel-core.js` as `window.AppState`. Use it to read/write runtime state (e.g., `AppState.scribeSteps`, `AppState.settings`).
- Messages: The code uses specific message types over `chrome.runtime.sendMessage` / onMessage listeners. Examples: `scribe-click-captured`, `get-tab-content`, `context-menu-action`, `ping`, `tab-updated`. When adding features, follow these message names and shape.
- AI prompts: AI interactions are centralized through `aiManager.prompt(...)` and `aiManager.streamPrompt(...)`. Keep prompts concise and place system-level context in `AIManager.initialize()` where `systemPrompt` is configured.
- Storage keys & limits: Settings and history use `chrome.storage.local`. Default settings live in `loadSettings()` and `AppState.settings`. History items respect a `maxHistory` (default 100). When adding persisted data, follow the same shaped objects (id, url, date, report, data).
- Content script injection: `injectScribeContentScript(tabId)` inserts CSS (`scribe.css`) then executes `scribe-content.js`. Re-inject on navigation using `tabs.onUpdated` events or the service worker message `tab-updated`.

## Integration points & external dependencies

- Manifest permissions: `sidePanel`, `scripting`, `activeTab`, `storage`, `tabs`, `tabGroups`, `languageModel`, `downloads`, `notifications`. Check `manifest.json` before adding APIs.
- Web accessible resources: `scribe.css`, `sidepanel.css`, `scribe-content.js`, `init_marked.js` are exposed to pages per `manifest.json` (used by injected content scripts).
- External libs: `External Libraries/jspdf.umd.min.js` and `External Libraries/chart.umd.min.js` — include them in `sidepanel.html` where PDF/chart features are needed.

## Concrete examples agents will likely implement

- Add a new audit rule: integrate with `initializeAuditor()` in `sidepanel-core.js`, append structured JSON to `AppState.auditData`, and call the same rendering helpers used by existing audit pages.
- Capture a custom content property from a tab: send a `get-tab-content` runtime message (existing code expects this type) and return { success, data } to the caller.
- Add a contextual organizer action: follow current pattern in organizer code — produce JSON [{groupName, tabIds, confidence}] then call `chrome.tabs.group` and `chrome.tabGroups.update` to materialize groups.

## Small conventions to follow

- Prefer the existing utility helpers: `showError(msg)`, `showSuccess(msg)`, `getCurrentTab()` — they add consistent UI feedback.
- Preserve UI state via `AppState` instead of scattering state across DOM-only variables.
- Use `try/catch` around all chrome.* async calls and surface errors via `showError()`.
- Respect screenshot debounce: scribe uses a `SCREENSHOT_DEBOUNCE` (1s) — reuse the same behavior when adding capture logic.

---

If you'd like, I can now open a draft of this file in the editor or adjust the tone/length. Any specific area you want the agent instructions to expand (prompts, tests, or example PR tasks)?
