// popup.js - FIXED: Proper readiness check with retry mechanism

document.addEventListener('DOMContentLoaded', () => {
    const openSidePanelButton = document.getElementById('openSidePanel');
    const runQuickAuditButton = document.getElementById('runQuickAudit');
  
    if (openSidePanelButton) {
      openSidePanelButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.sidePanel.open({ tabId: tabs[0].id });
          }
        });
      });
    }
  
    if (runQuickAuditButton) {
      runQuickAuditButton.addEventListener('click', async () => {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if (tabs[0]) {
            // Open side panel first
            await chrome.sidePanel.open({ tabId: tabs[0].id });
            
            // FIXED: Wait for side panel to be ready with retry mechanism
            await waitForSidePanelReady();
            
            // Send command once ready
            chrome.runtime.sendMessage({
              type: 'command',
              payload: {
                command: 'run-audit'
              }
            });
          }
        });
      });
    }
  });
  
  // FIXED: Proper readiness check function with exponential backoff
  async function waitForSidePanelReady(maxAttempts = 10, initialDelay = 100) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'ping' });
        if (response && response.ok) {
          console.log(`✅ Side panel ready after ${attempt} attempts`);
          return true;
        }
      } catch (error) {
        console.log(`Attempt ${attempt}/${maxAttempts}: Side panel not ready yet`);
      }
      
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc.
      const delay = initialDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.warn('⚠️ Side panel may not be fully ready, sending command anyway');
    return false;
  }
  