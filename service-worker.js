/**
 * SPECTRUM AI PRO V3.2 - SERVICE WORKER (Fixed)
 *
 * This file handles background tasks:
 * - Fixed: Added `outputLanguage: 'en'` to AI calls.
 * - Fixed: `startDocFlowRecording` now correctly gets tabId from message or sender.
 * - Fixed: `recordAction` logic simplified to prevent duplicate screenshots.
 */

// Global state management
let docFlowSession = {
    isRecording: false,
    recordedSteps: [],
    activeTabId: null
};

// Proactive auditing system
const PROACTIVE_AUDIT_ALARM = 'proactive-audit-alarm';
let lastUrlChecked = '';

// =================================================================
// --- Proactive Auditing Logic (Fixed) ---
// =================================================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === PROACTIVE_AUDIT_ALARM) {
        await runProactiveAudit();
    }
});

async function runProactiveAudit() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id || !tab.url?.startsWith('http')) return;
        if (typeof self.LanguageModel === 'undefined') return;
        if (lastUrlChecked === tab.url) return;
        lastUrlChecked = tab.url;

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText,
        }).catch(() => [{}]);

        if (result) {
            // ★★★ FIX: Added outputLanguage ★★★
            const session = await self.LanguageModel.create({ outputLanguage: 'en' });
            const prompt = `Analyze the following webpage text for critical issues ONLY (Security, Accessibility, Performance).
            Respond with ONLY one of two words: "CRITICAL" if you find a significant issue, or "OK" if not.
            CONTENT:
            ${result.substring(0, 4000)}`;

            const response = await session.prompt(prompt);

            if (response.includes("CRITICAL")) {
                await chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
                await chrome.action.setBadgeText({ text: '!' });
                await chrome.action.setTitle({ title: 'Spectrum AI Pro: Critical issues found!' });
            } else {
                await chrome.action.setBadgeText({ text: '' });
                await chrome.action.setTitle({ title: 'Open Spectrum AI Pro' });
            }
            session.destroy();
        }
    } catch (e) {
        console.error("Proactive Audit failed:", e.message);
        await chrome.action.setBadgeText({ text: '' });
    }
}

// =================================================================
// --- Extension Installation & Setup ---
// =================================================================

chrome.runtime.onInstalled.addListener(async (details) => {
    chrome.contextMenus.create({
        id: 'open-side-panel',
        title: 'Open Spectrum AI Pro',
        contexts: ['all']
    });

    chrome.alarms.create(PROACTIVE_AUDIT_ALARM, {
        delayInMinutes: 0.1,
        periodInMinutes: 0.5
    });

    if (details.reason === 'install') {
        chrome.tabs.create({
            url: chrome.runtime.getURL('setup.html')
        });
    }
});

// =================================================================
// --- Context Menu Handler ---
// =================================================================

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'open-side-panel' && tab.windowId) {
        chrome.sidePanel.open({ windowId: tab.windowId });
    }
});

// =================================================================
// --- Doc Flow Recording System (Fixed) ---
// =================================================================

const injectDocFlowIfNeeded = (tabId, url) => {
    if (docFlowSession.isRecording && url?.startsWith('http')) {
        console.log(`Doc Flow Session: Injecting script into tab ${tabId}`);

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['docflow.js']
        }).then(() => {
            chrome.scripting.insertCSS({
                target: { tabId: tabId },
                files: ['docflow.css']
            });
        }).catch(err => {
            console.warn(`Doc Flow: Failed to inject script into ${url}.`);
        });
    }
};

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (docFlowSession.isRecording && changeInfo.status === 'complete' && tab.url?.startsWith('http')) {

        // Re-inject script on navigation
        injectDocFlowIfNeeded(tabId, tab.url);

        // Record navigation step
        if (docFlowSession.activeTabId === tabId && changeInfo.url) {
            // Check if the last step was also a navigation to the same URL (avoids duplicates)
            const lastStep = docFlowSession.recordedSteps[docFlowSession.recordedSteps.length - 1];
            if (!lastStep || lastStep.type !== 'navigation' || lastStep.url !== tab.url) {
                docFlowSession.recordedSteps.push({
                    type: 'navigation',
                    url: tab.url,
                    title: tab.title,
                    timestamp: Date.now()
                });
                await recordActionScreenshot();
            }
        }
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    if (docFlowSession.isRecording) {
        docFlowSession.activeTabId = activeInfo.tabId;
        try {
            const tab = await chrome.tabs.get(activeInfo.tabId);
            injectDocFlowIfNeeded(activeInfo.tabId, tab.url);
        } catch (error) {
            console.error('Tab activation handler error:', error);
        }
    }
});

// =================================================================
// --- Screenshot Handling ---
// =================================================================

async function takeScreenshot(tabId) {
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(
            undefined,
            { format: 'png', quality: 80 }
        );
        return dataUrl;
    } catch (error) {
        console.error('Screenshot failed:', error.message);
        return null;
    }
}

async function recordActionScreenshot() {
    if (!docFlowSession.isRecording || !docFlowSession.activeTabId) return;

    // Give the page a moment to render after an action
    await new Promise(resolve => setTimeout(resolve, 300));

    const screenshotDataUrl = await takeScreenshot(docFlowSession.activeTabId);
    if (screenshotDataUrl) {
        docFlowSession.recordedSteps.push({
            type: 'screenshot',
            dataUrl: screenshotDataUrl,
            timestamp: Date.now(),
            tabId: docFlowSession.activeTabId
        });
    }
}

// =================================================================
// --- Message Handling (Fixed) ---
// =================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let isAsync = false;

    switch (request.action) {
        // ★★★ FIX: Correctly get tabId from sidepanel or popup ★★★
        case 'startDocFlowRecording':
            const tabId = request.tabId || sender.tab?.id;
            startDocFlowRecording(tabId);
            sendResponse({ success: true });
            break;

        case 'stopDocFlowRecording':
            stopDocFlowRecording();
            sendResponse({ success: true });
            break;

        case 'manualScreenshot':
            isAsync = true;
            recordActionScreenshot().then(() => {
                sendResponse({ success: true });
            });
            break;

        case 'recordAction':
            // This message comes from docflow.js (content script)
            recordAction(request.data);
            sendResponse({ success: true }); // No async needed here
            break;

        case 'getDocFlowSteps':
            sendResponse({ steps: docFlowSession.recordedSteps });
            break;

        // --- Popup message forwarding to side panel ---
        case 'runQuickAudit':
            chrome.runtime.sendMessage({ action: 'runAuditFromPopup' });
            break;

        case 'startDocFlow': // Message from popup.js
            chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
            // Get active tab and send it to the sidepanel to start
            chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
                setTimeout(() => {
                     chrome.runtime.sendMessage({ action: 'startDocFlowRecording', tabId: tab.id });
                }, 200);
            });
            break;

        case 'organizeTabs':
            chrome.runtime.sendMessage({ action: 'organizeTabsFromPopup' });
            break;
    }

    return isAsync;
});


// =================================================================
// --- Doc Flow Session Management (Fixed) ---
// =================================================================

function startDocFlowRecording(tabId) {
    if (!tabId) {
        console.error("Start recording failed: No active tab ID provided.");
        return;
    }

    docFlowSession.isRecording = true;
    docFlowSession.activeTabId = tabId;
    docFlowSession.recordedSteps = [];

    chrome.action.setIcon({
        path: {
            '16': 'icons/recording16.png',
            '48': 'icons/recording48.png',
            '128': 'icons/recording128.png'
        }
    });
    chrome.action.setTitle({ title: "Spectrum AI Pro (Recording...)" });

    if (tabId) {
        chrome.tabs.get(tabId, (tab) => {
            if (tab && tab.url) {
                injectDocFlowIfNeeded(tabId, tab.url);
            }
        });
    }
}

function stopDocFlowRecording() {
    docFlowSession.isRecording = false;
    docFlowSession.activeTabId = null;

    chrome.action.setIcon({
        path: {
            '16': 'icons/icon16.png',
            '48': 'icons/icon48.png',
            '128': 'icons/icon128.png'
        }
    });
    chrome.action.setTitle({ title: "Open Spectrum AI Pro" });
}

function recordAction(actionData) {
    if (docFlowSession.isRecording) {
        docFlowSession.recordedSteps.push({
            ...actionData,
            timestamp: Date.now(),
            tabId: docFlowSession.activeTabId
        });

        // ★★★ FIX: Only screenshot on click/input, not navigation ★★★
        if (actionData.type === 'click' || actionData.type === 'input') {
            recordActionScreenshot();
        }
    }
}

// =================================================================
// --- Utility Functions ---
// =================================================================

chrome.runtime.onSuspend.addListener(() => {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Open Spectrum AI Pro' });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Open Spectrum AI Pro' });
});

console.log('Spectrum AI Pro Service Worker (v3.2) loaded! 🚀');