# Spectrum AI Pro

🚀 Your On-Device AI "Brain Boost" for Chrome 🚀

Spectrum AI Pro is a professional-grade, privacy-first AI assistant built for the Google Chrome Built-in AI Challenge 2025. It integrates three powerful tools into the Chrome Side Panel, all powered by Gemini Nano and the on-device languageModel API.

This extension showcases a privacy-first, high-performance future for web applications. All AI processing happens locally, meaning your data never leaves your device.



## 🚀 The Solution: Privacy-First, On-Device AI

By leveraging the `languageModel` permission and Chrome's built-in AI, Spectrum AI Pro delivers:

* **⚡ Lightning Fast:** AI results are generated instantly with zero network latency
* **💸 Cost-Free:** No API keys, server costs, or rate limits for you or your users
* **✅ Network Resilient:** Core features are available offline, working anytime, anywhere
* **🔒 Inherent Privacy:** No page content, audit results, or browsing habits ever leave your device

## ✨ Core Features

Spectrum AI Pro integrates three powerful tools into your browser:

### 1. Enhanced Auditor

The Auditor performs a deep, 12-point analysis of any webpage and provides actionable insights.

**12-Point Comprehensive Audit:**
* Technical Foundation
* Accessibility (A11y)
* Performance
* Security
* User Experience (UX)
* ...and 7 other key areas

**AI-Powered Features:**
* **Summarize:** Get a concise executive summary of the full audit

* **Proofread:** Correct grammar and clarity on the page
* **Rewrite Title:** Generate 5 SEO-optimized titles for the current page
* **Contextual Chat:** Ask follow-up questions about the audit results

**Export & History:** Save reports as PDF or JSON, and access all past audits from a built-in history log.

### 2. Intelligent Tab Organizer

This module tames tab chaos by using AI to understand, group, and analyze your browsing sessions.

* **AI-Powered Categorization:** Intelligently analyzes all open tabs and suggests logical groups
* **Native Group Creation:** One-click-to-create native Chrome Tab Groups from the AI's suggestions
* **Group-Based AI Actions:**
    * **Summarize Group:** Get a summary of the common themes across a set of tabs
    * **Compare Group:** Ask the AI to compare and contrast the content of tabs within a group

### 3. Doc Flow (AI Workflow Recorder)

Doc Flow watches you perform a task and automatically generates beautiful, step-by-step guides.

* **Automatic Recording:** Records clicks, navigation, and other interactions while you work
* **AI-Generated Guides:** Converts raw actions into clear, human-readable instructions with screenshots
* **Advanced AI Actions:**

    * **Generalize Workflow:** Transforms a specific recording into a reusable template
    * **Generate Q&A:** Creates Q&A based on the workflow for training docs
* **Export:** Download the complete, formatted guide as a PDF

## 🎯 How We Meet the Judging Criteria

* **Technological Execution:** Deep showcase of the `languageModel` (Prompt API) for multiple use cases: generation, summarization, classification, and contextual chat. All processing is 100% on-device.

* **Purpose:** Improves user journeys for developers (Auditor), researchers (Organizer), and support teams (Doc Flow), unlocking capabilities previously impractical due to privacy concerns.

* **Functionality:** Highly scalable, analyzing any webpage, managing dozens of tabs, and recording complex workflows. Local history and JSON/PDF exports make it a true power tool.

* **User Experience:** Clean, tabbed interface, real-time streaming results, and clear status/error handling make the extension powerful yet simple to use.

## 🛠️ Technology Stack

### Core Language
* Vanilla JavaScript (ES6+)
* HTML5
* CSS3

### Core AI API
* Chrome Built-in AI API: Prompt API (via self.LanguageModel.create permission)

### Core Chrome APIs
* chrome.sidePanel
* chrome.scripting
* chrome.tabs & chrome.tabGroups
* chrome.storage.local
* chrome.runtime

### Libraries
* marked.min.js: For rendering Markdown responses
* jspdf.umd.min.js & html2canvas.min.js: For PDF export
* chart.umd.min.js: For visualizing audit data

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

# Spectrum AI Pro
🚀 Your On-Device AI "Brain Boost" for Chrome 🚀  

🎥 **Watch the Demo:** [Spectrum AI Pro - YouTube Demo](https://youtu.be/badMfl5kL2M&t=17s)



## 📄 License

This project is released under the MIT License. This license is permissive, allowing for wide use and modification, which we believe is in the spirit of open-source innovation.

You can find the full license text below:

```
MIT License

Copyright (c) 2025 Vaasu Nikhil Bobba

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
