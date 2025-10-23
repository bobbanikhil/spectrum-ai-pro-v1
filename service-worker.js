/**
 * Spectrum AI Pro V3.1 - Service Worker
 * Handles background tasks, Scribe recording, error handling.
 * AI Session creation is primarily handled by the side panel using self.ai.
 */

'use strict';

// Global state for Scribe
let isScribeRecording = false;
let scribeSteps = [];
let activeScribeTabId = null;

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Spectrum AI Pro Enhanced installed/updated:', details.reason);
    setupContextMenus();
    if (details.reason === 'install') {
        // Open setup page on first install
        chrome.runtime.openOptionsPage();
    }
});

// Context menu setup
function setupContextMenus() {
    chrome.contextMenus.removeAll(() => {
        // Check chrome.runtime.lastError to ensure cleanup was successful if needed
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
            title: '🔍 Audit This Page',
            contexts: ['page']
        });
        chrome.contextMenus.create({
            id: 'start-scribe',
            parentId: 'spectrum-ai-main',
            title: '📝 Start Scribe Recording',
            contexts: ['page']
        });
        chrome.contextMenus.create({
            id: 'organize-tabs',
            parentId: 'spectrum-ai-main',
            title: '📂 Organize All Tabs',
            contexts: ['page']
        });
    });
}

// Context menu click handling
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.windowId) { // Added check for windowId
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


// Helper to open side panel and send a message
// Helper to open side panel and send a message
async function triggerSidePanelAction(action, tab) {
    if (!tab || !tab.windowId) {
        console.error(`Cannot trigger action ${action}, invalid tab provided.`);
        return;
    }
    try {
        // Attempt to open the side panel
        await chrome.sidePanel.open({ windowId: tab.windowId });

        // Add a delay to allow the side panel listener to potentially set up
        // *** INCREASED DELAY HERE ***
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay

        // Send the message, wrapped in try/catch for connection errors
        try {
             // Check if runtime is still valid before sending
             if (chrome.runtime?.id) {
                 await chrome.runtime.sendMessage({ action: action, tabId: tab.id });
                 console.log(`Action "${action}" sent to side panel.`);
             } else {
                 console.warn(`Runtime invalidated before sending action "${action}".`);
             }
        } catch (msgError) {
             console.error(`Error sending message for action "${action}" after opening side panel:`, msgError.message);
             // Potentially retry or notify user if critical
             if (msgError.message.includes("Receiving end does not exist")) {
                 console.warn("Side panel might not have been ready. Consider increasing delay or retrying.");
             }
        }

    } catch (error) {
        // Log specific errors, e.g., if the side panel is already open or fails to open
        console.error(`Failed to trigger ${action} (could not open side panel?):`, error.message);
        // Optionally notify the user if the action couldn't be triggered
        // showNotification("Action Failed", `Could not trigger ${action}. Please try opening the side panel manually.`);
    }
}

// Main message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Log sender origin for debugging connection issues
    const senderOrigin = sender.url || `extension context ID ${sender.id}`;
    console.log(`Service Worker received message: ${request.action} from ${senderOrigin}`);

    // Use an async IIFE to handle potential promises
    (async () => {
        try {
            switch (request.action) {
                // 'checkAI' and 'createAISession' are now primarily handled in sidepanel/setup
                // The service worker focuses on coordination and non-AI tasks
                case 'checkAI':
                     // We can only provide a basic check from SW
                     const swCanAccess = typeof chrome.ai !== 'undefined'; // Use this as a proxy
                     console.warn("Service Worker AI check is basic. Rely on sidepanel/setup for full check using self.ai.");
                     sendResponse({ available: swCanAccess });
                     break;

                case 'getTabGroupContent':
                    const content = await handleGetTabGroupContent(request.tabIds);
                    sendResponse({ combinedContent: content });
                    break;
                case 'startScribeRecording':
                    const tabForScribe = sender.tab || await getActiveTab();
                    if (tabForScribe) {
                         await handleStartScribe(tabForScribe);
                         sendResponse({ success: true });
                    } else {
                         console.error("Cannot start Scribe: No active tab found.");
                         sendResponse({ success: false, error: "No active tab found." });
                    }
                    break;
                case 'stopScribeRecording':
                    await handleStopScribe();
                    sendResponse({ success: true });
                    break;
                case 'logScribeClick':
                    if (isScribeRecording) {
                        await logScribeStep('Click', request.details);
                    }
                    // Acknowledge receipt even if not recording
                    sendResponse({ success: true });
                    break;
                case 'runQuickAudit':
                     const tabForAudit = await getActiveTab();
                     if (tabForAudit) {
                        triggerSidePanelAction('triggerAudit', tabForAudit);
                     } else {
                         console.error("Cannot run Quick Audit: No active tab found.");
                     }
                    // No direct response needed, action is triggered
                    break;
                default:
                    console.warn("Received unhandled action in Service Worker:", request.action);
                    // Send an empty response for unhandled actions to avoid errors in sender
                    sendResponse({});
                    break;
            }
        } catch (e) {
            console.error(`Error handling action "${request.action}" in Service Worker:`, e.message, e.stack);
            // Ensure a response is sent even in case of error
            sendResponse({ error: e.message });
        }
    })();

    // Return true to indicate you wish to send a response asynchronously
    return true;
});


// ============== ORGANIZER FUNCTIONS ==============

async function handleGetTabGroupContent(tabIds) {
    let combinedContent = '';
    for (const tabId of tabIds) {
        try {
            // Ensure the tab still exists before scripting
            await chrome.tabs.get(tabId);
            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                 // Make sure function is self-contained
                func: () => document.body ? document.body.innerText.substring(0, 3000) : ''
            });
            if (result) {
                combinedContent += `\n--- Content from Tab ${tabId} ---\n${result}\n`;
            }
        } catch (error) {
            console.warn(`Failed to get content from tab ${tabId} (may have closed or is inaccessible):`, error.message);
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
         return;
     }
    isScribeRecording = true;
    scribeSteps = [];
    activeScribeTabId = tab.id;
    console.log(`Starting Scribe recording on tab ${activeScribeTabId}`);

    // Inject content script using scripting API
    try {
        // Ensure not injecting into restricted URLs
        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
            console.warn(`Cannot inject Scribe script into ${tab.url}`);
            await logScribeStep('Start', `Started on restricted page: ${tab.url}`);
            return; // Don't inject, just log start
        }

        await chrome.scripting.executeScript({
            target: { tabId: activeScribeTabId },
            files: ['scribe-content.js']
        });
        await chrome.scripting.insertCSS({
            target: { tabId: activeScribeTabId },
            files: ['scribe.css']
        });
        console.log(`Scribe script injected into tab ${activeScribeTabId}`);
        await logScribeStep('Start', `Started recording on page: ${tab.title || tab.url}`);

    } catch (e) {
        console.error(`Failed to inject scribe script into tab ${activeScribeTabId}:`, e.message);
        // If injection fails, stop recording immediately
        isScribeRecording = false;
        activeScribeTabId = null;
        // Optionally notify the side panel
         try {
             if (chrome.runtime?.id) {
                 chrome.runtime.sendMessage({ action: 'scribeStartFailed', error: e.message });
             }
         } catch (sendError) {
             console.error("Failed to send scribeStartFailed message:", sendError);
         }
    }
}


async function handleStopScribe() {
    if (!isScribeRecording) return;
    console.log("Stopping Scribe recording.");
    isScribeRecording = false;
    activeScribeTabId = null; // Clear active tab ID

    // Send final steps to side panel
    try {
        // Check if runtime is still valid
        if (chrome.runtime?.id) {
            await chrome.runtime.sendMessage({
                action: 'scribeRecordingStopped',
                steps: scribeSteps
            });
            console.log("Scribe steps sent to side panel.");
        } else {
            console.warn("Runtime invalidated before sending Scribe steps.");
        }
    } catch (e) {
        console.error("Failed to send scribe steps to side panel:", e.message);
    }

    // Clean up: Attempt to remove CSS (JS removal isn't standard via scripting API post-injection)
    // Note: This might fail if the tab navigated or closed, hence the try...catch
    try {
        // Get all tabs to try removing CSS from potential Scribe tabs if activeTabId was lost
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
             if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                 try {
                     await chrome.scripting.removeCSS({
                         target: { tabId: tab.id },
                         files: ['scribe.css']
                     });
                 } catch (removeCssError) {
                      // Ignore errors like "No CSS detected" or inaccessible tabs
                      if (!removeCssError.message.includes("No CSS detected") && !removeCssError.message.includes("Cannot access")) {
                           console.warn(`Could not remove Scribe CSS from tab ${tab.id}:`, removeCssError.message);
                      }
                 }
            }
        }
    } catch (e) {
        console.warn("Error during Scribe CSS cleanup:", e.message);
    }
}


async function logScribeStep(action, details) {
    if (!isScribeRecording) return;

    let screenshotDataUrl = null;
    try {
        screenshotDataUrl = await captureScreenshot();
    } catch (e) {
        console.warn("Could not capture screenshot for Scribe step:", e.message);
    }


    scribeSteps.push({
        action: action,
        details: details,
        timestamp: Date.now(),
        screenshotDataUrl: screenshotDataUrl // May be null if capture failed
    });
    console.log('Scribe step logged:', action, details ? details.substring(0, 50) + '...' : '');
}

async function captureScreenshot() {
    try {
        // Make sure we capture the currently active tab where interaction likely happened
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.windowId) return null; // Ensure tab and windowId are valid

        // Check if the tab is accessible
        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
             console.warn(`Cannot capture screenshot of restricted URL: ${tab.url}`);
             return null;
        }

        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'jpeg',
            quality: 75 // Slightly lower quality for smaller size
        });
        return dataUrl;
    } catch (error) {
        console.error('Failed to capture screenshot:', error.message);
        // Common errors: "Tab not found", "Cannot access contents of url"
        return null;
    }
}

// Scribe: Listen for tab navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only act if recording and the status is 'complete' for the active Scribe tab
    if (isScribeRecording && tabId === activeScribeTabId && changeInfo.status === 'complete') {
        // Check URL again before logging and injecting
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
            console.log(`Scribe: Navigation detected in recording tab ${tabId} to ${tab.url}`);
            (async () => {
                 // Log navigation step first
                await logScribeStep('Navigate', `Mapsd to: ${tab.title || tab.url}`);
                // Then try to re-inject script for further clicks on the new page
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: activeScribeTabId },
                        files: ['scribe-content.js']
                    });
                    await chrome.scripting.insertCSS({
                        target: { tabId: activeScribeTabId },
                        files: ['scribe.css']
                    });
                     console.log(`Scribe script re-injected into tab ${activeScribeTabId} after navigation.`);
                } catch (e) {
                    // Ignore errors if tab becomes inaccessible after navigation
                    if (!e.message.includes('Cannot access') && !e.message.includes('No tab') && !e.message.includes('No matching script')) {
                        console.error('Failed to re-inject scribe script after navigation:', e.message);
                    }
                }
            })();
        } else {
            // Log navigation to a restricted page but don't inject
             console.log(`Scribe: Navigation detected in recording tab ${tabId} to restricted URL ${tab.url}`);
             (async () => {
                 await logScribeStep('Navigate', `Mapsd to restricted page: ${tab.url}`);
             })();
        }
    }
});


// Scribe: Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
    if (isScribeRecording) {
        console.log(`Scribe: Tab focus changed to ${activeInfo.tabId}`);
        // Update the active tab ID *if* it's different
        if (activeScribeTabId !== activeInfo.tabId) {
            activeScribeTabId = activeInfo.tabId;
            (async () => {
                try {
                     const tab = await chrome.tabs.get(activeScribeTabId);
                     await logScribeStep('Switch Tab', `Switched to tab: ${tab.title || tab.url}`);
                     // Inject script into the newly focused tab if it's not restricted
                     if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
                         try {
                              await chrome.scripting.executeScript({
                                   target: { tabId: activeScribeTabId },
                                   files: ['scribe-content.js']
                              });
                              await chrome.scripting.insertCSS({
                                   target: { tabId: activeScribeTabId },
                                   files: ['scribe.css']
                              });
                              console.log(`Scribe script injected into newly activated tab ${activeScribeTabId}`);
                         } catch (injectError) {
                              console.warn(`Could not inject Scribe script into activated tab ${activeScribeTabId}:`, injectError.message);
                         }
                     } else {
                         console.warn(`Newly activated tab ${activeScribeTabId} is restricted: ${tab.url}`);
                     }
                } catch (error) {
                     console.error("Error logging tab switch or injecting script:", error);
                     // If we can't get tab info, maybe it closed? Stop recording?
                     // await handleStopScribe(); // Consider stopping if the tab is gone
                }
            })();
        }
    }
});

// Scribe: Handle tab removal
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (isScribeRecording && tabId === activeScribeTabId) {
        console.log(`Scribe: Recorded tab ${tabId} was closed. Stopping recording.`);
        (async () => {
            // Log the closure as the last step
            await logScribeStep('Close Tab', `Recorded tab was closed.`);
            await handleStopScribe(); // Stop recording as the main tab is gone
        })();
    }
});


console.log('Spectrum AI Pro Service Worker Initialized (v3.1)');