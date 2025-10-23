/**
 * Spectrum AI Pro V3.4 - Service Worker (Communication & Scribe Fixes)
 * Restores reliable side panel communication via sendMessage.
 * Increases Scribe screenshot debounce to 1000ms.
 */

'use strict';

// Global state for Scribe
let isScribeRecording = false;
let scribeSteps = [];
let activeScribeTabId = null;
let lastScreenshotTime = 0; // For screenshot debounce

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Spectrum AI Pro Enhanced installed/updated:', details.reason);
    setupContextMenus();
    if (details.reason === 'install') {
        // Open setup page on first install
        chrome.runtime.openOptionsPage();
    }
    // Clear any pending actions on update/install - KEEPING THIS as a safety net
    chrome.storage.local.remove(['pendingAction', 'pendingTabId']);
});

// Context menu setup
function setupContextMenus() {
    chrome.contextMenus.removeAll(() => {
        if (chrome.runtime.lastError) {
            console.warn("Error removing context menus:", chrome.runtime.lastError.message);
        }
        chrome.contextMenus.create({
            id: 'spectrum-ai-main',
            title: 'Spectrum AI Pro',
            contexts: ['page', 'selection', 'link']
        });
        chrome.contextMenus.create({
            id: 'audit-page',
            parentId: 'spectrum-ai-main',
            title: 'Audit This Page',
            contexts: ['page']
        });
        chrome.contextMenus.create({
            id: 'start-scribe',
            parentId: 'spectrum-ai-main',
            title: 'Start Scribe Recording',
            contexts: ['page']
        });
        chrome.contextMenus.create({
            id: 'organize-tabs',
            parentId: 'spectrum-ai-main',
            title: 'Organize All Tabs',
            contexts: ['page']
        });
    });
}

// Context menu click handling
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.windowId) {
        console.warn("Context menu clicked without valid tab object.");
        return;
    }
    switch (info.menuItemId) {
        case 'audit-page':
            triggerSidePanelAction('triggerAudit', tab);
            break;
        case 'start-scribe':
            triggerSidePanelAction('startScribeRecording', tab);
            break;
        case 'organize-tabs':
            triggerSidePanelAction('organizeTabs', tab);
            break;
    }
});

// Keyboard shortcut handling
chrome.commands.onCommand.addListener(async (command) => {
     try {
        const tab = await getActiveTab();
        if (!tab) {
             console.warn("Command triggered but no active tab found.");
             return;
        }
        switch (command) {
            case 'run-audit':
                triggerSidePanelAction('triggerAudit', tab);
                break;
            case 'start-scribe':
                triggerSidePanelAction('startScribeRecording', tab);
                break;
            case 'organize-tabs':
                triggerSidePanelAction('organizeTabs', tab);
                break;
        }
    } catch (error) {
        console.error("Error handling command:", command, error);
    }
});


// *** START: RESTORED COMMUNICATION ***
// Helper to open side panel and THEN send a message
async function triggerSidePanelAction(action, tab) {
    if (!tab || !tab.windowId) {
        console.error(`Cannot trigger action ${action}, invalid tab provided.`);
        return;
    }
    try {
        // 1. Open the side panel
        await chrome.sidePanel.open({ windowId: tab.windowId });
        console.log(`Side panel opening for action "${action}"...`);

        // 2. Wait briefly for the panel to potentially initialize its listeners
        await new Promise(resolve => setTimeout(resolve, 300)); // Shorter delay might be okay now

        // 3. Send the message
        try {
             if (chrome.runtime?.id) { // Check runtime validity
                 await chrome.runtime.sendMessage({ action: action, tabId: tab.id });
                 console.log(`Action "${action}" message sent to side panel.`);
             } else {
                  console.warn(`Runtime invalidated before sending action "${action}" message.`);
                  // Fallback: Set pending action if message fails
                  await chrome.storage.local.set({ pendingAction: action, pendingTabId: tab.id });
             }
        } catch (msgError) {
             console.error(`Error sending message for action "${action}" after opening side panel:`, msgError.message);
             // Fallback: Set pending action if message fails (e.g., "Receiving end does not exist")
             if (msgError.message.includes("Receiving end does not exist")) {
                 console.warn("Side panel might not have been ready. Setting pending action as fallback.");
                 await chrome.storage.local.set({ pendingAction: action, pendingTabId: tab.id });
             }
        }

    } catch (error) {
        console.error(`Failed to trigger ${action} (could not open side panel?):`, error.message);
        // Ensure pending action is cleared if opening fails
        await chrome.storage.local.remove(['pendingAction', 'pendingTabId']);
    }
}
// *** END: RESTORED COMMUNICATION ***


// Main message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const senderOrigin = sender.url || `extension context ID ${sender.id}`;
    console.log(`Service Worker received message: ${request.action} from ${senderOrigin}`);

    let isAsync = false; // Flag for async responses

    // Use a switch statement for clarity
    switch (request.action) {
        case 'getTabGroupContent':
            isAsync = true;
            handleGetTabGroupContent(request.tabIds)
                .then(content => sendResponse({ combinedContent: content }))
                .catch(e => sendResponse({ error: e.message }));
            break;

        case 'startScribeRecording':
            isAsync = true;
            (async () => {
                const tabForScribe = sender.tab || await getActiveTab();
                if (tabForScribe) {
                     await handleStartScribe(tabForScribe);
                     sendResponse({ success: true });
                } else {
                     console.error("Cannot start Scribe: No active tab found.");
                     sendResponse({ success: false, error: "No active tab found." });
                }
            })();
            break;

        // *** START: RESTORED SCRIBE STOP COMMUNICATION ***
        case 'stopScribeRecording':
            isAsync = true;
            handleStopScribe() // This now sends its own message when done
                .then(() => sendResponse({ success: true })) // Acknowledge stop *request* received
                .catch(e => sendResponse({ success: false, error: e.message }));
            break;
        // *** END: RESTORED SCRIBE STOP COMMUNICATION ***

        case 'logScribeClick':
            isAsync = true; // logScribeStep is async due to screenshot
             (async () => {
                if (isScribeRecording) {
                    await logScribeStep('Click', request.details);
                }
                sendResponse({ success: true }); // Acknowledge receipt
            })();
            break;

        // Note: 'runQuickAudit' is handled by 'triggerAudit' via triggerSidePanelAction
        // No separate case needed here.

        default:
            console.warn("Received unhandled action in Service Worker:", request.action);
            sendResponse({}); // Send empty response for unhandled actions
            break;
    }

    // Return true if we are handling the response asynchronously
    return isAsync;
});


// ============== ORGANIZER FUNCTIONS ==============

async function handleGetTabGroupContent(tabIds) {
    let combinedContent = '';
    for (const tabId of tabIds) {
        try {
            await chrome.tabs.get(tabId); // Check if tab exists
            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => document.body ? document.body.innerText.substring(0, 3000) : ''
            });
            if (result) {
                combinedContent += `\n--- Content from Tab ${tabId} ---\n${result}\n`;
            }
        } catch (error) {
            // Ignore errors if tab closed or inaccessible
            if (!error.message.includes("No tab with id") && !error.message.includes("Cannot access contents")) {
                console.warn(`Failed to get content from tab ${tabId}:`, error.message);
            }
        }
    }
    return combinedContent.trim();
}

// ============== SCRIBE FUNCTIONS ==============

async function getActiveTab() {
     try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
     } catch (error) {
         console.error("Error getting active tab:", error);
         return null;
     }
}

async function handleStartScribe(tab) {
    if (isScribeRecording) {
        console.warn("Scribe recording already in progress.");
        return;
    }
     if (!tab || !tab.id) {
         console.error("Cannot start Scribe: Invalid tab provided.");
         // Inform side panel about the failure
         try { chrome.runtime.sendMessage({ action: 'scribeStartFailed', error: "Invalid tab provided." }); } catch (e) {}
         return;
     }
    isScribeRecording = true;
    scribeSteps = [];
    activeScribeTabId = tab.id;
    lastScreenshotTime = 0; // Reset screenshot timer
    console.log(`Starting Scribe recording on tab ${activeScribeTabId}`);

    // Inject content script using scripting API
    try {
        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
            console.warn(`Cannot inject Scribe script into ${tab.url}`);
            await logScribeStep('Start', `Started on restricted page: ${tab.url}`);
            // Don't inject, but recording *is* technically active
            return;
        }

        await chrome.scripting.executeScript({
            target: { tabId: activeScribeTabId },
            files: ['scribe-content.js'],
            // world: 'MAIN' // Consider MAIN world if isolation causes issues, but default ISOLATED is safer
        });
        await chrome.scripting.insertCSS({
            target: { tabId: activeScribeTabId },
            files: ['scribe.css']
        });
        console.log(`Scribe script injected into tab ${activeScribeTabId}`);
        await logScribeStep('Start', `Started recording on page: ${tab.title || tab.url}`);

    } catch (e) {
        console.error(`Failed to inject scribe script into tab ${activeScribeTabId}:`, e.message);
        isScribeRecording = false;
        activeScribeTabId = null;
         try {
             // Send failure message back to side panel
              if (chrome.runtime?.id) { // Check validity
                 chrome.runtime.sendMessage({ action: 'scribeStartFailed', error: e.message });
              }
         } catch (sendError) {
             console.error("Failed to send scribeStartFailed message:", sendError);
         }
    }
}


// *** START: RESTORED SCRIBE STOP COMMUNICATION ***
async function handleStopScribe() {
    if (!isScribeRecording) return;
    console.log("Stopping Scribe recording.");
    isScribeRecording = false;
    activeScribeTabId = null; // Clear active tab ID
    lastScreenshotTime = 0;

    // Send final steps back to the side panel
    try {
        if (chrome.runtime?.id) { // Check validity
            await chrome.runtime.sendMessage({
                action: 'scribeRecordingStopped', // Side panel should listen for this again
                steps: scribeSteps
            });
            console.log("Scribe steps sent to side panel.");
        } else {
            console.warn("Runtime invalidated before sending Scribe steps.");
            // Maybe store steps locally if sending fails? For recovery?
        }
    } catch (e) {
        console.error("Failed to send scribe steps to side panel:", e.message);
        // Handle error - maybe notify user or store locally
    }
    // *** END: RESTORED SCRIBE STOP COMMUNICATION ***

    // Clean up CSS (best effort)
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
             if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                 try {
                     await chrome.scripting.removeCSS({
                         target: { tabId: tab.id },
                         files: ['scribe.css']
                     });
                 } catch (removeCssError) {
                      // More specific error checks
                      if (!removeCssError.message.includes("No CSS detected") &&
                          !removeCssError.message.includes("Cannot access contents") &&
                          !removeCssError.message.includes("No tab with id"))
                      {
                           console.warn(`Could not remove Scribe CSS from tab ${tab.id}:`, removeCssError.message);
                      }
                 }
            }
        }
    } catch (e) {
        console.warn("Error during Scribe CSS cleanup query:", e.message);
    }
}


async function logScribeStep(action, details) {
    if (!isScribeRecording) return;

    // *** START: SCREENSHOT DEBOUNCE FIX ***
    // Increased cooldown to 1 second
    const now = Date.now();
    let screenshotDataUrl = null;
    if (now - lastScreenshotTime > 1000) { // Increased debounce time
        try {
            screenshotDataUrl = await captureScreenshot();
            if (screenshotDataUrl) { // Only update time if capture was successful
                lastScreenshotTime = now;
            }
        } catch (e) {
            // Error already logged in captureScreenshot
        }
    } else {
        console.log("Skipping screenshot due to rapid clicks (debounce).");
    }
    // *** END: SCREENSHOT DEBOUNCE FIX ***


    scribeSteps.push({
        action: action,
        details: details,
        timestamp: Date.now(),
        screenshotDataUrl: screenshotDataUrl // May be null
    });
    console.log('Scribe step logged:', action, details ? `"${details.substring(0, 50)}..."` : '(No details)');
}

async function captureScreenshot() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.windowId || tab.id == null) { // Added null check for id
             console.warn("Cannot capture screenshot: No valid active tab found.");
             return null;
        }

        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
             console.warn(`Cannot capture screenshot of restricted URL: ${tab.url}`);
             return null;
        }

        // Check if tab status is complete - might help with dragging error
        if (tab.status !== 'complete') {
            console.warn(`Skipping screenshot: Tab status is '${tab.status}', not 'complete'.`);
            return null;
        }

        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'jpeg',
            quality: 70 // Slightly lower quality for size
        });
        return dataUrl;
    } catch (error) {
        if (error.message.includes("MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND") ||
            error.message.includes("Tabs cannot be edited right now") ||
            error.message.includes("Cannot access contents of url") ||
            error.message.includes("No tab with id")) // Added common errors
        {
            console.warn(`Skipping screenshot: ${error.message}`);
        } else {
            console.error('Failed to capture screenshot:', error); // Log unexpected errors
        }
        return null;
    }
}


// --- SCRIBE: Content Script Injection on Navigation ---
// This is needed for multi-page recordings. It only injects, doesn't log steps.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isScribeRecording && changeInfo.status === 'complete' && tab.url) {
        // Avoid injecting into restricted pages
        if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
            console.log(`Scribe: Navigation detected on tab ${tabId}. Re-injecting scripts.`);
            (async () => {
                try {
                    // Always try to inject, catch error if already injected
                    try {
                        await chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            files: ['scribe-content.js']
                        });
                         console.log(`Scribe content script re-injected into tab ${tabId}.`);
                    } catch(e) {
                         // Ignore "Cannot create duplicate script context" or similar errors
                         if (!e.message.includes("duplicate script context") && !e.message.includes("Cannot access contents")) {
                             console.warn(`Non-duplicate error during JS re-injection on tab ${tabId}:`, e.message);
                         } else {
                             console.log(`Scribe content script likely already present on tab ${tabId}.`);
                         }
                    }

                    // Always try to insert CSS, catch error if already there
                     try {
                        await chrome.scripting.insertCSS({
                            target: { tabId: tabId },
                            files: ['scribe.css']
                        });
                        console.log(`Scribe CSS re-inserted into tab ${tabId}.`);
                    } catch (e) {
                         // Ignore specific, expected errors when CSS might already exist or tab is inaccessible temporarily
                         if (!e.message.includes("Internal error") && // Might occur if CSS is already injected
                             !e.message.includes("Cannot access contents") &&
                             !e.message.includes("No tab with id") &&
                             !e.message.includes("Frame not found"))
                         {
                              console.warn(`Error during CSS re-insertion on tab ${tabId}:`, e.message);
                         } else {
                              console.log(`Scribe CSS likely already present or tab briefly inaccessible on tab ${tabId}.`);
                         }
                    }

                } catch (e) {
                    // Catch errors if the tab becomes inaccessible during the process
                     if (!e.message.includes("Cannot access contents") && !e.message.includes("No tab with id")) {
                         console.error(`Error during Scribe re-injection check/process on tab ${tabId}:`, e.message);
                    }
                }
            })();
        } else {
            console.log(`Scribe: Navigation detected on tab ${tabId} to restricted URL. Skipping injection.`);
        }
    }
});


// Listeners for onActivated and onRemoved remain commented out as requested.

console.log('Spectrum AI Pro Service Worker Initialized (v3.4)');