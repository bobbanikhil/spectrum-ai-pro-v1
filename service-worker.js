// service-worker.js - v3.2.1 Production
// Handles background tasks, context menus, commands, and message passing.

// --- Context Menu and Command Setup ---
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Spectrum AI Service Worker: onInstalled event.', details.reason);
  // Remove existing menus to prevent duplicates after updates
  await chrome.contextMenus.removeAll();

  // Create context menus
  chrome.contextMenus.create({
    id: 'openSidepanel',
    title: 'Open Spectrum AI Sidepanel',
    contexts: ['page', 'selection', 'action']
  });
  chrome.contextMenus.create({
    id: 'runAudit',
    title: 'Run Page Audit (Spectrum AI)',
    contexts: ['page', 'action']
  });
   chrome.contextMenus.create({
     id: 'startScribe',
     title: 'Start Recording Workflow (Spectrum AI)',
     contexts: ['page', 'action']
   });
   chrome.contextMenus.create({
     id: 'organizeTabs',
     title: 'Organize Tabs (Spectrum AI)',
     contexts: ['action']
   });

  // Open setup page on first install
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

// --- Context Menu Click Handler ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab || typeof tab.windowId === 'undefined') {
        console.error("SW: Context menu clicked without a valid tab context.");
        return;
    }
    try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
        // Send a message after a short delay to give the side panel time to initialize
        setTimeout(() => {
            chrome.runtime.sendMessage({
                type: 'context-menu-action',
                action: info.menuItemId // The ID of the clicked menu item
            }).catch(err => {
                 // Common error if panel isn't ready or was closed quickly
                 if (err.message?.includes("Receiving end does not exist")) return;
                 console.warn("SW: Error sending context menu action (side panel might not be open/ready):", err.message);
            });
        }, 300); // 300ms delay, adjust if needed
    } catch (error) {
        console.error("SW: Error opening side panel or sending message:", error);
    }
});

// --- Keyboard Command Handler ---
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && typeof tab.windowId !== 'undefined') {
      await chrome.sidePanel.open({ windowId: tab.windowId });
       // Send a message after a delay
       setTimeout(() => {
         chrome.runtime.sendMessage({
           type: 'keyboard-command',
           command: command // The command name from manifest.json
         }).catch(err => {
              if (err.message?.includes("Receiving end does not exist")) return;
              console.warn("SW: Error sending keyboard command (side panel might not be open/ready):", err.message);
         });
       }, 300);
    } else {
        console.error("SW: Keyboard command triggered without an active tab.");
    }
  } catch(error) {
     console.error("SW: Error handling command:", command, error);
  }
});

// --- Central Message Listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Use async immediately to handle promises and keep channel open
  (async () => {
    try {
      console.log(`SW: Received message type: ${message?.type} from ${sender.tab ? 'tab ' + sender.tab.id : 'extension'}`);

      switch (message?.type) {
        case 'get-tab-content':
          if (!message.tabId) throw new Error("Missing tabId for get-tab-content");
          await handleGetTabContent(message.tabId, sendResponse);
          break;

        case 'create-tab-group':
          if (!message.tabIds || !message.groupName) throw new Error("Missing tabIds or groupName for create-tab-group");
          await handleCreateTabGroup(message.tabIds, message.groupName, sendResponse);
          break;

        case 'scribe-click': // From scribe-content.js
           if (!message.payload) throw new Error("Missing payload for scribe-click");
           // Forward to sidepanel if it's open
           chrome.runtime.sendMessage({
               type: 'scribe-click-captured',
               data: message.payload,
               tabId: sender.tab?.id
           }).catch(err => {
              if (err.message?.includes("Receiving end does not exist")) {
                 console.log("SW: Scribe click received, but sidepanel not open.");
                 // Optionally, stop the content script here if needed
              } else {
                 console.warn("SW: Error forwarding scribe click to sidepanel:", err.message);
              }
           });
           sendResponse({ success: true }); // Acknowledge receipt
           break;

        case 'ping': // From popup or sidepanel checking readiness
          console.log("SW: Responding to ping.");
          sendResponse({ ok: true });
          break;

        default:
          console.warn('SW: Received unknown message type:', message?.type);
          // Only send response if sendResponse is still valid
          if (sendResponse) sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error(`SW: Error handling message type ${message?.type}:`, error);
      // Only send response if sendResponse is still valid
      if (sendResponse) sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to indicate you wish to send a response asynchronously
  return true;
});


// --- Tab Update Listener ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Filter for complete loads of main frames with http/https URLs
  if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https:'))) {
     console.log(`SW: Tab ${tabId} updated (${tab.url})`);
     // Inform the side panel about the update for potential Scribe reinjection
     chrome.runtime.sendMessage({ type: 'tab-updated', tabId: tabId })
       .catch(err => {
            // Ignore errors if the side panel isn't open
            if (err.message?.includes("Receiving end does not exist")) return;
            console.warn("SW: Error sending tab-updated message:", err.message);
       });
  }
});

// --- Helper Functions ---

// Function to get content from a specific tab
async function handleGetTabContent(tabId, sendResponse) {
    console.log(`SW: Attempting to get content from tab ${tabId}`);
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => ({
                title: document.title,
                text: document.body.innerText.substring(0, 15000) // Limit content length
            })
        });

        if (chrome.runtime.lastError) {
             throw new Error(`Scripting error: ${chrome.runtime.lastError.message}`);
        }

        if (results && results[0] && results[0].result) {
            console.log(`SW: Successfully retrieved content from tab ${tabId}`);
            sendResponse({ success: true, data: results[0].result });
        } else {
            // This might happen on pages where content scripts cannot run (e.g., PDF viewer, protected pages)
            throw new Error('Could not execute script or get result from tab.');
        }
    } catch (error) {
        console.error(`SW: Failed to get content from tab ${tabId}:`, error);
        sendResponse({ success: false, error: `Cannot access page content. It might be a restricted page or require permissions. (${error.message})` });
    }
}


// Function to create a tab group
async function handleCreateTabGroup(tabIds, groupName, sendResponse) {
   console.log(`SW: Creating group "${groupName}" with tabs:`, tabIds);
   try {
       // Filter out invalid tab IDs just in case
       const validTabIds = [];
       for (const tabId of tabIds) {
           try {
               await chrome.tabs.get(tabId); // Check if tab exists
               validTabIds.push(tabId);
           } catch {
               console.warn(`SW: Tab ID ${tabId} not found, skipping.`);
           }
       }

       if (validTabIds.length === 0) {
           throw new Error("No valid tabs found to group.");
       }

       const groupId = await chrome.tabs.group({ tabIds: validTabIds });
       await chrome.tabGroups.update(groupId, { title: groupName, collapsed: false });
       console.log(`SW: Group ${groupId} created and named "${groupName}".`);
       sendResponse({ success: true, groupId: groupId });
   } catch (error) {
       console.error(`SW: Failed to create tab group:`, error);
       sendResponse({ success: false, error: `Could not create tab group. ${error.message}` });
   }
}

console.log("🚀 Spectrum AI Service Worker v3.2.1 started successfully.");