// popup.js

// Check AI availability
document.addEventListener('DOMContentLoaded', () => {
    if (typeof self.LanguageModel !== 'undefined') {
        document.getElementById('aiStatus').className = 'status status-ready';
        document.getElementById('aiStatus').textContent = '🟢 AI Ready';
    }
});

// Button actions
document.getElementById('openSidePanel').addEventListener('click', () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
});

document.getElementById('quickAudit').addEventListener('click', () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    // Send message to run audit
    setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'runQuickAudit' });
    }, 100);
});

document.getElementById('startDocFlow').addEventListener('click', () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    setTimeout(() => {
        // trigger Doc Flow recording via service worker
        chrome.runtime.sendMessage({ action: 'startDocFlowRecording' });
    }, 100);
});

document.getElementById('organizeTabs').addEventListener('click', () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'organizeTabs' });
    }, 100);
});
