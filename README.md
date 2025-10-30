# Spectrum AI Pro



🚀 Your On-Device AI "Brain Boost" for Chrome 🚀Spectrum AI Pro is a professional, on-device AI assistant designed to give your browser a "brain boost." It provides a full suite of tools for web auditing, content analysis, and workflow automation, all powered by Google's Gemini Nano and Chrome's built-in AI APIs.



Spectrum AI Pro is a professional-grade, privacy-first AI assistant built for the Google Chrome Built-in AI Challenge 2025. It integrates three powerful tools into the Chrome Side Panel, all powered by Gemini Nano and the on-device languageModel API.This extension showcases a privacy-first, high-performance future for web applications. All AI processing happens locally, meaning your data never leaves your device.



This project solves the "privacy gap" of cloud AI. It provides powerful analysis and automation tools that can safely run on sensitive, internal, or authenticated webpages because your data never leaves your device.## 🚀 The Solution: Privacy-First, On-Device AI

Spectrum AI Pro solves the core trade-off between powerful AI features and user privacy. By leveraging the `languageModel` permission and Chrome's built-in AI, it delivers:

*   **⚡ Lightning Fast:** AI results are generated instantly with zero network latency.
*   **💸 Cost-Free:** No API keys, server costs, or rate limits for you or your users.
*   **✅ Network Resilient:** Core features are available offline, working anytime, anywhere.

## 🏆 How Spectrum AI Pro Impresses the Judges

## ✨ Core Features

This project was built to directly excel against the hackathon's judging criteria:Spectrum AI Pro is a multi-tool packed into one side panel, with three primary modules:



### Purpose (Addresses a Real Need)### 1. Enhanced Auditor

Spectrum AI Pro unlocks new, practical capabilities previously impossible on the web. Professionals can now:The Auditor performs a deep, 12-point analysis of any webpage and provides a full suite of AI tools to act on the results.



- Audit internal/authenticated sites without security risks**12-Point Comprehensive Audit:** Runs a streaming analysis covering:

- Record proprietary workflows without fear of data leaks*   Technical Foundation

- Automate tedious tasks (like documentation and research analysis) with zero cost and 100% privacy*   Accessibility (A11y)

*   Performance

### Technological Execution (Deep API Use)*   Security

This isn't just a simple prompt. We deeply showcase the Prompt API (self.LanguageModel.create) by using it to implement the functionality of all the other APIs:*   User Experience (UX)

*   ...and 7 other key areas.

- **Summarizer**: Used in the Auditor and Tab Organizer

- **Writer/Rewriter**: Used in the Auditor (for SEO titles) and Doc Flow (for generating guides)**Real-time Streaming:** Watch the report generate live in the side panel, complete with scores and actionable advice.

- **Classifier**: A custom-prompted classifier powers the Tab Organizer

- **Streaming**: The Auditor's report streams in real-time for a best-in-class UX**Context-Aware AI Actions:**

*   **Summarize:** Get a concise executive summary of the full audit.

### User Experience (Polished & Integrated)*   **Proofread:** Correct grammar and clarity on the page.

The UI is clean, professional, and lives seamlessly in the chrome.sidePanel. It features real-time streaming, export functions (PDF/JSON), and an interactive chat, making the AI a true assistant.*   **Rewrite Title:** Generate 5 SEO-optimized titles for the current page.

*   **Contextual Chat:** Ask follow-up questions about the audit results to get deeper insights.

### Functionality (Scalable & Robust)

This is a multi-tool "pro" app, not a single-feature demo. It's scalable to any webpage, any number of tabs, and any user workflow, demonstrating a robust and feature-complete vision.**Export & History:** Save reports as PDF or JSON, and access all past audits from a built-in history log.



## ✨ Features### 2. Intelligent Tab Organizer

This module tames tab chaos by using AI to understand, group, and analyze your browsing sessions.

Spectrum AI Pro is a suite of three on-device AI tools:

*   **AI-Powered Categorization:** Intelligently analyzes all open tabs and suggests logical groups.

### 1. The Enhanced Auditor*   **Native Group Creation:** One-click-to-create native Chrome Tab Groups from the AI's suggestions.

- Performs a deep, 12-point analysis of any webpage and gives you an instant, interactive report*   **Group-Based AI Actions:**

- **12-Point Analysis**: Streams a complete report covering Technical, Accessibility, Performance, Security, and UX    *   **Summarize Group:** Get a summary of the common themes across a set of tabs.

- **AI Actions**: Instantly Summarize the audit, Rewrite SEO Titles, or Start a Chat to ask follow-up questions about the results    *   **Compare Group:** Ask the AI to compare and contrast the content of tabs within a group.

- **Export & History**: Save reports as PDF/JSON or view them in your local history

### 3. Doc Flow (AI Workflow Recorder)

### 2. The Intelligent Tab OrganizerDoc Flow watches you perform a task and automatically generates a beautiful, step-by-step guide.

- Solves "tab chaos" by using AI to find patterns in your browsing

- **AI Categorization**: Intelligently analyzes all open tabs and suggests logical groups*   **Automatic Recording:** Records clicks, navigation, and other interactions while you work.

- **One-Click Grouping**: Creates native Chrome Tab Groups from the AI's suggestions*   **AI-Generated Guides:** After stopping the recording, Doc Flow uses AI to generate clear, human-readable instructions for each step, complete with screenshots.

- **Group AI Actions**: Summarize the common themes of a tab group or ask the AI to compare/contrast the pages*   **Advanced AI Actions:**

    *   **Generalize Workflow:** Transforms a specific recording into a reusable, general-purpose template.

### 3. Doc Flow (AI Workflow Recorder)    *   **Generate Q&A:** Creates a list of common questions and answers based on the workflow, perfect for training or help docs.

- Automatically generates step-by-step guides and Standard Operating Procedures (SOPs) just by watching you work*   **Export:** Download the complete, formatted guide as a PDF.

- **Automatic Recording**: Records clicks, navigation, and text input as you perform a task

- **AI-Generated Guides**: Converts your raw action log into a human-readable, step-by-step guide with screenshots

- **Privacy-First**: The on-device model makes it safe to record workflows on sensitive internal software## 🎯 How We Meet the Judging Criteria

*   **Technological Execution:** I deeply showcase the `languageModel` (Prompt API) for multiple, advanced use cases: generation (audit, doc flow guide), summarization (audit, tabs), classification (tabs), and contextual chat. All processing is 100% on-device.

## 🛠️ Technology Stack*   **Purpose:** This project directly improves common user journeys for developers (Auditor), researchers (Organizer), and support/ops teams (Doc Flow), unlocking capabilities previously impractical on the web due to privacy concerns.

*   **Functionality:** The app is highly scalable, analyzing any webpage, managing dozens of tabs, and recording complex workflows. Local history and JSON/PDF exports make it a true power tool.

### Core Language*   **User Experience:** A clean, tabbed interface, real-time streaming results, and clear status/error handling make the extension powerful yet simple to use.

- Vanilla JavaScript (ES6+)

- HTML5

- CSS3## ⚖️ License

This project is open-source and available under the MIT License.

### Core AI API
- Chrome Built-in AI API: Primarily the Prompt API (via self.LanguageModel.create permission)

### Core Chrome APIs
- chrome.sidePanel
- chrome.scripting
- chrome.tabs & chrome.tabGroups
- chrome.storage.local
- chrome.runtime

### Libraries
- marked.min.js: For rendering the AI's Markdown responses
- jspdf.umd.min.js & html2canvas.min.js: For PDF export
- chart.umd.min.js: For visualizing audit data

## 🛑 JUDGES: CRITICAL TESTING INSTRUCTIONS 🛑

This is the most important section! The on-device AI requires Chrome 127+ and specific flags.

### Step 1: Enable Chrome AI Flags

1. Open your Chrome browser (must be Version 127 or newer)
2. Go to chrome://flags in your address bar
3. Find and Enable these two flags:
   - #prompt-api-for-gemini-nano
   - #optimization-guide-on-device-model
4. Click the Relaunch button at the bottom

### Step 2: Load the Extension & Verify AI Model

1. Download this repository as a ZIP file and unzip it
2. Go to chrome://extensions
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the unzipped project folder
5. **THIS IS THE KEY STEP**: The extension includes a setup page. Click the extension's icon and select "Verify Setup" (or open setup.html from the extension's details)
6. This page will automatically check the status of your AI model. Please wait until it says "✅ AI Model is Ready!" (This can take a few minutes the first time as Chrome downloads the model)

### Step 3: Run the App!

1. Once the model is ready, open the Chrome Side Panel
2. Select "Spectrum AI Pro" from the dropdown
3. You're ready to test!

## 📄 License

This project is released under the MIT License. This license is permissive, allowing for wide use and modification, which we believe is in the spirit of open-source innovation.

You can find the full license text below:

```
MIT License

Copyright (c) 2025 Nikhil Bobbana

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
