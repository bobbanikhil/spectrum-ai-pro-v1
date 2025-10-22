/**
 * Spectrum AI Pro Enhanced - Service Worker
 * Handles background tasks and extension lifecycle events
 */

// Extension installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Spectrum AI Pro Enhanced installed/updated:', details.reason);

    // Set up context menus
    setupContextMenus();

    // Show welcome notification for new installations
    if (details.reason === 'install') {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Spectrum AI Pro Enhanced',
            message: 'Extension installed successfully! Click the icon to get started.'
        });
    }
});

// Context menu setup
function setupContextMenus() {
    // Remove existing menus
    chrome.contextMenus.removeAll(() => {
        // Main context menu
        chrome.contextMenus.create({
            id: 'spectrum-ai-main',
            title: 'Spectrum AI Pro Enhanced',
            contexts: ['page', 'selection', 'link']
        });

        // Audit submenu
        chrome.contextMenus.create({
            id: 'audit-page',
            parentId: 'spectrum-ai-main',
            title: '🔍 Audit This Page',
            contexts: ['page']
        });

        // Scribe submenu
        chrome.contextMenus.create({
            id: 'start-scribe',
            parentId: 'spectrum-ai-main',
            title: '📝 Start Workflow Recording',
            contexts: ['page']
        });

        // Quick actions
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
    switch (info.menuItemId) {
        case 'audit-page':
            runQuickAudit(tab);
            break;
        case 'start-scribe':
            startScribeRecording(tab);
            break;
        case 'organize-tabs':
            organizeAllTabs();
            break;
    }
});

// Keyboard shortcut handling
chrome.commands.onCommand.addListener((command) => {
    console.log('Command received:', command);

    switch (command) {
        case 'run-audit':
            runQuickAuditFromShortcut();
            break;
        case 'start-scribe':
            startScribeFromShortcut();
            break;
        case 'organize-tabs':
            organizeAllTabs();
            break;
    }
});

// Quick audit functionality
async function runQuickAudit(tab) {
    try {
        // Open side panel
        await chrome.sidePanel.open({ windowId: tab.windowId });

        // Send message to side panel to run audit
        chrome.runtime.sendMessage({
            action: 'triggerAudit',
            tabId: tab.id
        });

    } catch (error) {
        console.error('Quick audit failed:', error);
        showNotification('Audit Failed', 'Unable to run quick audit. Please try again.');
    }
}

async function runQuickAuditFromShortcut() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            runQuickAudit(tab);
        }
    } catch (error) {
        console.error('Quick audit from shortcut failed:', error);
    }
}

// Scribe recording functionality
async function startScribeRecording(tab) {
    try {
        // Open side panel
        await chrome.sidePanel.open({ windowId: tab.windowId });

        // Switch to scribe tab and start recording
        chrome.runtime.sendMessage({
            action: 'startScribeRecording',
            tabId: tab.id
        });

    } catch (error) {
        console.error('Scribe recording failed:', error);
        showNotification('Recording Failed', 'Unable to start workflow recording.');
    }
}

async function startScribeFromShortcut() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            startScribeRecording(tab);
        }
    } catch (error) {
        console.error('Scribe from shortcut failed:', error);
    }
}

// Tab organization
async function organizeAllTabs() {
    try {
        const tabs = await chrome.tabs.query({ windowType: 'normal' });
        if (tabs.length < 2) {
            showNotification('Not Enough Tabs', 'You need at least 2 tabs to organize.');
            return;
        }

        // Open side panel and trigger organization
        await chrome.sidePanel.open({ windowId: tabs[0].windowId });

        chrome.runtime.sendMessage({
            action: 'organizeTabs'
        });

    } catch (error) {
        console.error('Tab organization failed:', error);
        showNotification('Organization Failed', 'Unable to organize tabs. Please try again.');
    }
}

// Message handling from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background message received:', request.action);

    switch (request.action) {
        case 'getTabGroupContent':
            handleGetTabGroupContent(request.tabIds, sendResponse);
            return true; // Indicates async response

        case 'injectScribe':
            handleInjectScribe(request.tabId, sendResponse);
            return true;

        case 'stopScribe':
            handleStopScribe(request.tabId);
            break;

        case 'runQuickAudit':
            runQuickAuditFromShortcut();
            break;
    }
});

// Get content from multiple tabs for contextual analysis
async function handleGetTabGroupContent(tabIds, sendResponse) {
    try {
        let combinedContent = '';

        for (const tabId of tabIds) {
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        return {
                            title: document.title,
                            url: window.location.href,
                            content: document.body.innerText.substring(0, 2000)
                        };
                    }
                });

                if (results && results[0] && results[0].result) {
                    const result = results[0].result;
                    combinedContent += `\n---\nTitle: ${result.title}\nURL: ${result.url}\n\n${result.content}\n`;
                }
            } catch (error) {
                console.warn(`Failed to get content from tab ${tabId}:`, error);
            }
        }

        sendResponse({ combinedContent: combinedContent.trim() });
    } catch (error) {
        console.error('Failed to get tab group content:', error);
        sendResponse({ combinedContent: '' });
    }
}

// Inject Scribe content script
async function handleInjectScribe(tabId, sendResponse) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['scribe.js']
        });
        sendResponse({ success: true });
    } catch (error) {
        console.error('Failed to inject scribe script:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Stop Scribe recording
function handleStopScribe(tabId) {
    chrome.tabs.sendMessage(tabId, { action: 'stopScribeRecording' }).catch(error => {
        console.log('Stop scribe message failed (might be expected):', error);
    });
}

// Utility functions
function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message
    });
}

// Tab management helpers
async function getTabInfo(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        return {
            id: tab.id,
            title: tab.title,
            url: tab.url,
            favIconUrl: tab.favIconUrl
        };
    } catch (error) {
        console.error('Failed to get tab info:', error);
        return null;
    }
}

// Cleanup on extension disable/uninstall
chrome.runtime.onSuspend.addListener(() => {
    console.log('Spectrum AI Pro Enhanced suspending...');
    // Cleanup any ongoing processes
});

// Handle tab updates for Scribe recording
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Handle tab updates if needed for Scribe functionality
    if (changeInfo.status === 'complete') {
        // Tab finished loading, could be used for Scribe step detection
    }
});

// Handle tab removal for cleanup
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    // Cleanup any tab-specific data if needed
});

// Periodic cleanup of old data
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanup') {
        // Perform periodic cleanup tasks
        cleanupOldData();
    }
});

async function cleanupOldData() {
    try {
        // Clean up old history items (older than 30 days)
        const { history = [] } = await chrome.storage.local.get('history');
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        const filteredHistory = history.filter(item => {
            const itemDate = new Date(item.date).getTime();
            return itemDate > thirtyDaysAgo;
        });

        if (filteredHistory.length !== history.length) {
            await chrome.storage.local.set({ history: filteredHistory });
            console.log(`Cleaned up ${history.length - filteredHistory.length} old history items`);
        }
    } catch (error) {
        console.error('Cleanup failed:', error);
    }
}

// Initialize service worker
console.log('Spectrum AI Pro Service Worker initialized');