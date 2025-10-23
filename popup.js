'use strict';

document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('openSidePanel').addEventListener('click', () => {
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
        window.close();
    });

    document.getElementById('runQuickAudit').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'runQuickAudit' });
        window.close();
    });

    // Auto-close after 5 seconds if no interaction
    let autoCloseTimer = setTimeout(() => {
        window.close();
    }, 5000);

    document.addEventListener('click', () => {
        clearTimeout(autoCloseTimer);
    });
});