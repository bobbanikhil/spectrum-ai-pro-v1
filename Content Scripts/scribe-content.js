// ============================================
// SPECTRUM AI PRO ENHANCED v3.2
// Content Script - Click Event Capture
// ============================================

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__SPECTRUM_SCRIBE_INJECTED__) {
    return;
  }
  window.__SPECTRUM_SCRIBE_INJECTED__ = true;
  console.log('🎬 Scribe content script injected and active');

  let isCapturing = true;

  // Add visual indicator
  const indicator = document.createElement('div');
  indicator.id = 'spectrum-scribe-indicator';
  indicator.innerHTML = '🔴 Recording';
  // Styles are now injected via scribe.css
  document.body.appendChild(indicator);

  // Click event handler
  function handleClick(event) {
    if (!isCapturing || !event.target) return;
    
    // Ignore clicks on the indicator itself
    if (event.target.id === 'spectrum-scribe-indicator') return;

    const element = event.target;

    // Extract element details
    const elementData = {
      tagName: element.tagName,
      id: element.id || '',
      className: element.className || '',
      text: element.innerText?.substring(0, 100) || element.textContent?.substring(0, 100) || '',
      ariaLabel: element.getAttribute('aria-label') || '',
      placeholder: element.getAttribute('placeholder') || '',
      type: element.type || '',
      name: element.name || '',
      value: typeof element.value === 'string' ? element.value.substring(0, 50) : '',
      href: element.href || '',
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Add visual feedback
    highlightElement(element);

    // Send to service worker
    try {
      chrome.runtime.sendMessage({
        type: 'scribe-click', // FIXED: Send 'scribe-click'
        payload: elementData
      });
    } catch (err) {
      console.log('Scribe: Error sending click message (extension context likely invalidated):', err.message);
      cleanup(); // Stop listening if extension context is lost
    }
  }

  // Highlight clicked element
  function highlightElement(element) {
    const originalOutline = element.style.outline;
    const originalBg = element.style.backgroundColor;
    
    element.style.outline = '3px solid #3b82f6';
    element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';

    setTimeout(() => {
      try {
        element.style.outline = originalOutline;
        element.style.backgroundColor = originalBg;
      } catch (e) {
        // Element might be gone
      }
    }, 1000);
  }
  
  function cleanup() {
      isCapturing = false;
      indicator.remove();
      document.removeEventListener('click', handleClick, true);
      window.__SPECTRUM_SCRIBE_INJECTED__ = false; // Allow re-injection
      console.log('🛑 Scribe recording stopped and listeners removed from page.');
  }

  // Attach click listener
  document.addEventListener('click', handleClick, true);

  // Listen for cleanup message from side panel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'stop-scribe-recording') {
      cleanup();
      sendResponse({ ok: true });
    }
  });
})();