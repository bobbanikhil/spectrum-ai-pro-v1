// service-worker.js - FIXED: Added all necessary message listeners

// --- Context Menu and Command Listeners ---
chrome.runtime.onInstalled.addListener(() => {
  // Clear all existing menus to prevent duplicates on reload
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'openSidepanel', // Generic open action
      title: 'Open Spectrum AI Sidepanel',
      contexts: ['page', 'selection', 'action'] // Add action context
    });
    chrome.contextMenus.create({
      id: 'runAudit', // Specific action
      title: 'Run Page Audit (Spectrum AI)',
      contexts: ['page']
    });
     chrome.contextMenus.create({
       id: 'startScribe', // Specific action
       title: 'Start Recording Workflow (Spectrum AI)',
       contexts: ['page', 'action']
     });
     chrome.contextMenus.create({
        id: 'organizeTabs',
        title: 'Organize Tabs (Spectrum AI)',
        contexts: ['action']
    });
  });
});


chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || typeof tab.windowId === 'undefined') {
        console.error("Context menu clicked without a valid tab context.");
        return;
    }
    chrome.sidePanel.open({ windowId: tab.windowId });

    // Send a message to the side panel to trigger the specific action
    setTimeout(() => {
        chrome.runtime.sendMessage({
            type: 'context-menu-action',
            action: info.menuItemId
        }).catch(err => console.log("SW: Error sending context menu action:", err.message));
    }, 500); // 500ms delay to allow panel to open
});

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && typeof tabs[0].windowId !== 'undefined') {
      chrome.sidePanel.open({ windowId: tabs[0].windowId });
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'keyboard-command',
          command: command // e.g., "run-audit", "start-scribe"
        }).catch(err => console.log("SW: Error sending keyboard command:", err.message));
      }, 500);
    } else {
        console.error("Keyboard command triggered without an active tab.");
    }
  });
});

// --- Central Message Listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Listener for 'get-tab-content' from side panel
  if (message.type === 'get-tab-content') {
    (async () => {
      const tabId = message.tabId || sender.tab?.id;
      if (typeof tabId !== 'number') {
        sendResponse({ success: false, error: 'Invalid tabId specified.' });
        return;
      }
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => ({
              title: document.title,
              text: document.body.innerText.substring(0, 200000) // Truncate
          })
        });

        if (chrome.runtime.lastError) throw new Error(chrome.runtime.lastError.message);
        if (results && results[0] && results[0].result) {
          sendResponse({ success: true, data: results[0].result });
        } else {
          sendResponse({ success: true, data: { title: "Page content not accessible", text: "" } });
        }
      } catch (e) {
        let error = e.message || 'Unknown error getting tab content.';
        if (error.includes("Cannot access")) error = "Cannot analyze this type of page (e.g., Chrome Store, chrome:// pages).";
        sendResponse({ success: false, error: error });
      }
    })();
    return true; // Indicates asynchronous response
  }

  // 2. Listener for 'create-tab-group' from side panel
  if (message.type === 'create-tab-group') {
    (async () => {
      try {
         if (!message.tabIds || !Array.isArray(message.tabIds) || message.tabIds.length === 0) {
            throw new Error('No valid tabIds provided.');
         }
         const allTabs = await chrome.tabs.query({ currentWindow: true });
         const allTabIds = new Set(allTabs.map(t => t.id));
         const validTabIds = message.tabIds.filter(id => allTabIds.has(id));
         
         if (validTabIds.length === 0) {
             throw new Error('None of the target tabs could be found.');
         }

        const groupId = await chrome.tabs.group({ tabIds: validTabIds });
        await chrome.tabGroups.update(groupId, { title: message.groupName || "AI Group" });
        sendResponse({ success: true, groupId: groupId });
      } catch (e) {
        sendResponse({ success: false, error: e.message || 'Error creating tab group.' });
      }
    })();
    return true; // Indicates asynchronous response
  }

  // 3. Listener for 'scribe-click' from content script
  if (message.type === 'scribe-click') {
      // Forward the click event to the side panel
      chrome.runtime.sendMessage({
          type: 'scribe-click-captured',
          data: message.payload,
          tabId: sender.tab?.id
      }).catch(err => console.log("SW: Error forwarding scribe click:", err.message));
      return false; // No response needed back to content script
  }

  // 4. Ping from popup.js or sidepanel.js
  if (message && message.type === 'ping') {
    console.log("Service worker received ping");
    sendResponse({ ok: true });
    return false; // Sync response
  }
  
  return false; // Default for unhandled messages
});

// --- Tab Update Listener ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Filter for complete loads of main frames with http/https URLs
  if (changeInfo.status === 'complete' && tab.url && 
      (tab.url.startsWith('http:') || tab.url.startsWith('https:'))) {
    console.log(`SW: Tab ${tabId} updated (${tab.url})`);
    
    // Inform the side panel about the update for potential Scribe reinjection
    // FIX: Don't await the promise, just catch errors silently
    chrome.runtime.sendMessage({ type: 'tab-updated', tabId: tabId })
      .catch(err => {
        // Silently ignore "Receiving end does not exist" errors
        if (err.message && !err.message.includes("Receiving end does not exist")) {
          console.warn("SW: Error sending tab-updated message:", err.message);
        }
      });
  }
});


console.log("Spectrum AI Service Worker v3.2.1 started.");