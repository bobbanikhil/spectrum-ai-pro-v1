/**
 * Popup Script V3.7 - User Gesture Fix + Robust Panel Opening
 * Explicitly gets current window ID before opening side panel.
 * Improves error handling and prevents premature popup closing.
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const openSidePanelBtn = document.getElementById('openSidePanel');
    const runQuickAuditBtn = document.getElementById('runQuickAudit');

    // --- Helper function to open the side panel and then close the popup ---
    async function openPanelAndClosePopup(windowId) {
        try {
            console.log(`Popup: Attempting to open side panel for window ID: ${windowId}`);
            // Ensure a valid ID is passed
            if (typeof windowId !== 'number' || windowId <= 0) {
                throw new Error(`Invalid windowId: ${windowId}`);
            }
            await chrome.sidePanel.open({ windowId: windowId });
            console.log(`Popup: sidePanel.open call succeeded for window ID: ${windowId}. Closing popup.`);
            window.close(); // Close popup *only after* opening is successful
        } catch (error) {
            console.error(`Popup: Error during sidePanel.open for window ID ${windowId}:`, error);
            // Provide more user-friendly error messages
            if (error.message.includes("No window with id") || error.message.includes("Invalid window ID")) {
                alert("Error: Could not find the browser window to open the side panel in. Please try clicking the extension icon again.");
            } else if (error.message.includes("user gesture")) {
                 alert("Error: Opening the side panel requires a direct click. Please try again.");
            }
             else {
                alert(`An unexpected error occurred while trying to open the side panel: ${error.message}`);
            }
             // Do NOT close the popup if opening failed, so user can potentially see the alert/console
        }
    }
    // --- End of helper function ---


    if (openSidePanelBtn) {
        openSidePanelBtn.addEventListener('click', async () => {
            console.log("Popup: 'Open Panel' button clicked.");
            try {
                // Explicitly get the current window *before* calling the helper
                const currentWindow = await chrome.windows.getCurrent();
                if (currentWindow && typeof currentWindow.id === 'number') {
                     console.log(`Popup: Got current window ID: ${currentWindow.id}`);
                     await openPanelAndClosePopup(currentWindow.id);
                } else {
                     console.error("Popup: Could not get valid current window information.", currentWindow);
                     alert("Error: Could not identify the current browser window.");
                }
            } catch (error) {
                 console.error("Popup: Error getting current window:", error);
                 alert("An error occurred while trying to access the current browser window.");
            }
        });
    } else {
        console.error("Popup: Could not find the 'openSidePanel' button in popup.html.");
        // Maybe add a visual indicator in the popup itself if elements are missing
    }

    if (runQuickAuditBtn) {
        runQuickAuditBtn.addEventListener('click', async () => {
            console.log("Popup: 'Quick Audit' button clicked.");
            try {
                // 1. Set the pending action
                await chrome.storage.local.set({ pendingAction: 'triggerAudit' });
                console.log("Popup: Set pendingAction 'triggerAudit' in storage.");

                // 2. Explicitly get the current window
                const currentWindow = await chrome.windows.getCurrent();
                if (currentWindow && typeof currentWindow.id === 'number') {
                    console.log(`Popup (Quick Audit): Got current window ID: ${currentWindow.id}`);
                    // 3. Open the side panel using the explicit ID (will close popup on success)
                    await openPanelAndClosePopup(currentWindow.id);
                } else {
                    console.error("Popup (Quick Audit): Could not get valid current window information.", currentWindow);
                    alert("Error: Could not identify the current browser window to start the audit.");
                     // Clear pending action if we can't open the panel
                     try { await chrome.storage.local.remove('pendingAction'); } catch(e){}
                }
            } catch (error) {
                 console.error("Popup (Quick Audit): Error during process:", error);
                 alert(`An error occurred while trying to start the quick audit: ${error.message}`);
                  // Clear pending action on error
                 try { await chrome.storage.local.remove('pendingAction'); } catch (e) {}
                 // Don't close popup on error
            }
        });
    } else {
        console.error("Popup: Could not find the 'runQuickAudit' button in popup.html.");
    }
});

console.log("Popup script loaded (v3.7).");