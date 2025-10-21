// Spectrum AI Pro - Enhanced Service Worker
// Professional on-device AI assistant with improved performance and reliability

// Global state management
let scribeSession = {
    isRecording: false,
    pendingScreenshot: null,
    recordedSteps: [],
    activeTabId: null
};

// Proactive auditing system
const PROACTIVE_AUDIT_ALARM = 'proactive-audit-alarm';
let lastUrlChecked = '';

// =================================================================
// --- Proactive Auditing Logic (Enhanced) ---
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

        // Debounce checks for the same URL
        if (lastUrlChecked === tab.url) return;
        lastUrlChecked = tab.url;

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText,
        }).catch(() => [{}]);

        if (result) {
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
        await chrome.action.setTitle({ title: 'Open Spectrum AI Pro' });
    }
}

// =================================================================
// --- Extension Installation & Setup ---
// =================================================================

chrome.runtime.onInstalled.addListener(async (details) => {
    // Create context menu
    chrome.contextMenus.create({
        id: 'open-side-panel',
        title: 'Open Spectrum AI Pro',
        contexts: ['all']
    });

    // Set up proactive auditing alarm
    chrome.alarms.create(PROACTIVE_AUDIT_ALARM, {
        delayInMinutes: 0.1,
        periodInMinutes: 0.5
    });

    // Welcome message for new users
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
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setTitle({ title: 'Open Spectrum AI Pro' });
    }
});

// =================================================================
// --- Scribe Recording System ---
// =================================================================

// Inject Scribe script for recording
const injectScribeIfNeeded = (tabId, url) => {
    if (scribeSession.isRecording && url?.startsWith('http')) {
        console.log(`Scribe Session: Injecting script into tab ${tabId}`);

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['scribe.js']
        }).then(() => {
            chrome.scripting.insertCSS({
                target: { tabId: tabId },
                files: ['scribe.css']
            });
        }).catch(err => {
            console.warn(`Scribe: Failed to inject script into ${url}. It might be a protected page.`);
        });
    }
};

// Tab update handler for Scribe
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        try {
            const updatedTab = await chrome.tabs.get(tabId);
            if (!updatedTab.url) return;

            // Scribe re-injection and screenshot logic
            injectScribeIfNeeded(tabId, updatedTab.url);

            // Handle pending screenshots
            if (scribeSession.pendingScreenshot && scribeSession.pendingScreenshot.tabId === tabId) {
                await takeScreenshot(tabId);
                scribeSession.pendingScreenshot = null;
            }

            // Record navigation for Scribe
            if (scribeSession.isRecording && scribeSession.activeTabId === tabId) {
                scribeSession.recordedSteps.push({
                    type: 'navigation',
                    url: updatedTab.url,
                    title: updatedTab.title,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Tab update handler error:', error);
        }
    }
});

// Handle tab activation changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    if (scribeSession.isRecording) {
        scribeSession.activeTabId = activeInfo.tabId;

        try {
            const tab = await chrome.tabs.get(activeInfo.tabId);
            injectScribeIfNeeded(activeInfo.tabId, tab.url);
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
            undefined, // Use current window
            { format: 'png', quality: 80 }
        );

        return dataUrl;
    } catch (error) {
        console.error('Screenshot failed:', error);
        return null;
    }
}

// =================================================================
// --- Message Handling ---
// =================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'startScribeRecording':
            startScribeRecording(sender.tab?.id);
            break;

        case 'stopScribeRecording':
            stopScribeRecording();
            break;

        case 'takeScreenshot':
            handleScreenshotRequest(sender.tab?.id);
            break;

        case 'recordAction':
            recordAction(request.data);
            break;

        case 'getScribeSteps':
            sendResponse({ steps: scribeSession.recordedSteps });
            break;

        case 'runQuickAudit':
            // Forward to side panel
            chrome.runtime.sendMessage({
                action: 'runAuditFromPopup'
            });
            break;

        case 'organizeTabsFromPopup':
            // Forward to side panel
            chrome.runtime.sendMessage({
                action: 'organizeTabsFromPopup'
            });
            break;
    }
});

// =================================================================
// --- Scribe Session Management ---
// =================================================================

function startScribeRecording(tabId) {
    scribeSession.isRecording = true;
    scribeSession.activeTabId = tabId;
    scribeSession.recordedSteps = [];

    // Update extension icon
    chrome.action.setIcon({
        path: {
            '16': 'icons/recording16.png',
            '48': 'icons/recording48.png',
            '128': 'icons/recording128.png'
        }
    });

    // Inject Scribe into current tab
    if (tabId) {
        chrome.tabs.get(tabId, (tab) => {
            injectScribeIfNeeded(tabId, tab.url);
        });
    }
}

function stopScribeRecording() {
    scribeSession.isRecording = false;
    scribeSession.activeTabId = null;

    // Reset extension icon
    chrome.action.setIcon({
        path: {
            '16': 'icons/icon16.png',
            '48': 'icons/icon48.png',
            '128': 'icons/icon128.png'
        }
    });
}

function handleScreenshotRequest(tabId) {
    if (tabId) {
        scribeSession.pendingScreenshot = { tabId, timestamp: Date.now() };

        // Trigger page refresh to ensure clean screenshot
        chrome.tabs.reload(tabId);
    }
}

function recordAction(actionData) {
    if (scribeSession.isRecording) {
        scribeSession.recordedSteps.push({
            ...actionData,
            timestamp: Date.now(),
            tabId: scribeSession.activeTabId
        });
    }
}

// =================================================================
// --- Utility Functions ---
// =================================================================

// Clean up on extension suspend
chrome.runtime.onSuspend.addListener(() => {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Open Spectrum AI Pro' });
    chrome.action.setIcon({
        path: {
            '16': 'icons/icon16.png',
            '48': 'icons/icon48.png',
            '128': 'icons/icon128.png'
        }
    });
});

// Handle installation and updates
chrome.runtime.onStartup.addListener(() => {
    // Reset any lingering state
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Open Spectrum AI Pro' });
});

// Error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Prevent the default console error
    event.preventDefault();
});

console.log('Spectrum AI Pro Service Worker loaded successfully! 🚀');