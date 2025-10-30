// popup.js

// A helper function to robustly open the side panel
function openSidePanel() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      // Use the active tab's ID to open the panel
      chrome.sidePanel.open({ tabId: tabs[0].id });
    } else {
      // Fallback for other contexts (e.g., if no active tab)
      chrome.sidePanel.open();
    }
  });
}

// Check AI availability
document.addEventListener('DOMContentLoaded', () => {
    if (typeof self.LanguageModel !== 'undefined') {
        document.getElementById('aiStatus').className = 'status status-ready';
        document.getElementById('aiStatus').textContent = '🟢 AI Ready';
    }
});

// Button actions
document.getElementById('openSidePanel').addEventListener('click', () => {
    openSidePanel();
});

document.getElementById('quickAudit').addEventListener('click', () => {
    openSidePanel();
    // Send message to run audit
    setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'runQuickAudit' });
    }, 100);
});

document.getElementById('startDocFlow').addEventListener('click', () => {
    openSidePanel();
    setTimeout(() => {
        // trigger Doc Flow recording via service worker
        chrome.runtime.sendMessage({ action: 'startDocFlowRecording' });
    }, 100);
});

document.getElementById('organizeTabs').addEventListener('click', () => {
    openSidePanel();
    setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'organizeTabs' });
    }, 100);
});