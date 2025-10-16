// service-worker.js - Spectrum AI V2.2 - Production Ready & Corrected

let scribeSession = {
    isRecording: false,
    pendingScreenshot: null
};

// --- INITIALIZATION & SETUP ---
chrome.runtime.onInstalled.addListener(() => {
    // Create the context menu item when the extension is installed.
    chrome.contextMenus.create({
        id: 'open-side-panel',
        title: 'Open Spectrum AI',
        contexts: ['all']
    });
    // Open the setup page on first install to guide the user.
    chrome.runtime.openOptionsPage();
});

// --- EVENT LISTENERS ---
// This makes the extension icon in the toolbar open the side panel.
chrome.action.onClicked.addListener(tab => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// This makes the right-click context menu item open the side panel.
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'open-side-panel') {
        chrome.sidePanel.open({ windowId: tab.windowId });
    }
});


// --- SCRIBE & NAVIGATION LOGIC ---
const injectScribeIfNeeded = (tabId) => {
    if (scribeSession.isRecording) {
        // We inject the scripts to capture user actions.
        chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['scribe.js']
            })
            .then(() => {
                // After injecting the script, we inject the CSS for the recording overlay.
                chrome.scripting.insertCSS({
                    target: { tabId: tabId },
                    files: ['scribe.css']
                });
            })
            .catch(() => {}); // Suppress errors for restricted pages like chrome://
    }
};

const takePendingScreenshot = () => {
    if (!scribeSession.pendingScreenshot) return;
    const { windowId, detail } = scribeSession.pendingScreenshot;
    scribeSession.pendingScreenshot = null; // Clear the request immediately to prevent duplicates.

    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
            chrome.runtime.sendMessage({ action: 'scribeStepFailed', error: "Capture failed." });
            return;
        }
        // Send the captured screenshot and action details to the side panel.
        chrome.runtime.sendMessage({
            action: 'scribeStepCaptured',
            data: { ...detail, screenshotUrl: dataUrl }
        });
    });
};

// Listen for navigation completion to reinject Scribe or take a pending screenshot.
chrome.webNavigation.onCompleted.addListener(details => {
    if (details.frameId === 0) { // Ensure this is the main frame, not an iframe.
        injectScribeIfNeeded(details.tabId);
        // If a screenshot was requested just before a navigation, take it now.
        if (scribeSession.pendingScreenshot && scribeSession.pendingScreenshot.tabId === details.tabId) {
            setTimeout(takePendingScreenshot, 300); // A small delay ensures the page has fully rendered.
        }
    }
});

// --- MESSAGE ROUTER ---
// This handles all communication between the side panel and the service worker.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        switch (request.action) {
            case "injectScribe":
                scribeSession.isRecording = true;
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) injectScribeIfNeeded(tab.id);
                break;

            case "stopScribe":
                scribeSession.isRecording = false;
                scribeSession.pendingScreenshot = null;
                // CORRECTED: Query for all http/https tabs to send the stop message.
                const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
                for (const t of tabs) {
                    try {
                        // This message tells the injected scribe.js to clean itself up.
                        await chrome.tabs.sendMessage(t.id, { action: "stopScribe" });
                    } catch (e) { /* Ignore errors if the tab is not accessible or closed */ }
                }
                break;

            case "logScribeAction":
                if (scribeSession.isRecording && sender.tab) {
                    // An action was logged. This might trigger navigation, so we prepare a pending screenshot.
                    scribeSession.pendingScreenshot = {
                        tabId: sender.tab.id,
                        windowId: sender.tab.windowId,
                        detail: request.detail
                    };
                    // Fallback timer for Single Page Applications where onCompleted might not fire.
                    setTimeout(() => {
                        if (scribeSession.pendingScreenshot && scribeSession.pendingScreenshot.tabId === sender.tab.id) {
                            takePendingScreenshot();
                        }
                    }, 800);
                }
                break;

            case "getTabGroupContent":
                const { tabIds } = request;
                let combinedContent = '';
                for (const tabId of tabIds) {
                    try {
                        const [{ result }] = await chrome.scripting.executeScript({
                            target: { tabId },
                            func: () => ({ title: document.title, url: location.href, content: document.body.innerText })
                        });
                        if (result) {
                            combinedContent += `Page Title: ${result.title}\nURL: ${result.url}\nContent:\n${result.content.substring(0, 4000)}\n\n---\n\n`;
                        }
                    } catch (e) {
                        combinedContent += `Page ID ${tabId}: Could not access content.\n\n---\n\n`;
                    }
                }
                sendResponse({ combinedContent });
                break;
        }
    })();
    return true; // This is crucial to keep the message channel open for an async `sendResponse`.
});