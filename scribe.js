/**
 * CONTENT SCRIPT - SPECTRUM AI PRO V4.0
 * Monitors page changes and tracks user interactions
 */

'use strict';

console.log('🌐 Content Script: Spectrum AI Pro active on', window.location.href);

// Prevent multiple injections
if (window.spectrumAIActive) {
  console.log('Already active, skipping initialization');
} else {
  window.spectrumAIActive = true;
  initializeContentScript();
}

function initializeContentScript() {
  // Optional: Monitor DOM changes for continuous analysis
  let changeTimeout;
  const observer = new MutationObserver((mutations) => {
    clearTimeout(changeTimeout);
    changeTimeout = setTimeout(() => {
      // Notify background that page has changed
      chrome.runtime.sendMessage({
        type: 'pageChanged',
        changes: mutations.length,
        url: window.location.href
      }).catch(() => {
        // Extension context may be invalidated
      });
    }, 1000);
  });

  // Start observing (disabled by default for performance)
  // observer.observe(document.body, { childList: true, subtree: true });

  // Listen for text selection for quick analysis
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 10 && selection.length < 5000) {
      // Store for potential analysis
      window.lastSelection = selection;
    }
  });

  // Listen for messages from background/sidepanel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getPageContent') {
      sendResponse({
        content: document.body.innerText,
        html: document.documentElement.outerHTML.substring(0, 50000),
        url: window.location.href,
        title: document.title,
        selection: window.lastSelection || ''
      });
    }

    if (message.type === 'highlightElement') {
      highlightElement(message.selector);
    }

    return true;
  });
}

function highlightElement(selector) {
  try {
    const element = document.querySelector(selector);
    if (element) {
      element.style.outline = '3px solid #4f46e5';
      element.style.outlineOffset = '2px';
      setTimeout(() => {
        element.style.outline = '';
        element.style.outlineOffset = '';
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to highlight element:', error);
  }
}

console.log('✅ Content Script: Initialized');
