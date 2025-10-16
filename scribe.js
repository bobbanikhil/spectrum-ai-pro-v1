// scribe.js - Spectrum AI V2.2 - Production Ready

(() => {
    // Prevents the script from being injected multiple times on the same page.
    if (window.scribeInjected) return;
    window.scribeInjected = true;
  
    let isRedispatching = false;
  
    // Create the visual "REC ●" overlay to indicate recording is active.
    const overlay = document.createElement('div');
    overlay.id = 'scribe-recorder-overlay';
    overlay.textContent = 'REC ●';
    document.body.appendChild(overlay);
  
    /**
     * Intelligently describes the HTML element that was clicked.
     * This creates the human-readable action text (e.g., "Clicked on button with text 'Submit'").
     * @param {HTMLElement} element - The element that was clicked.
     * @returns {string} A description of the element.
     */
    function getElementDescription(element) {
      if (element.ariaLabel) return `element with label "${element.ariaLabel}"`;
      if (element.innerText && element.innerText.trim()) {
        return `${element.tagName.toLowerCase()} with text "${element.innerText.substring(0, 50).trim()}"`;
      }
      if (element.title) return `element with title "${element.title}"`;
      if (element.id) return `${element.tagName.toLowerCase()} #${element.id}`;
      if (element.className && typeof element.className === 'string') {
          return `a ${element.tagName.toLowerCase()} with class "${element.className.split(' ')[0]}"`;
      }
      return `a ${element.tagName.toLowerCase()} element`;
    }
    
    /**
     * After capturing the user's click, this function programmatically re-triggers
     * the click to ensure the original page functionality (like navigation) still occurs.
     * @param {HTMLElement} element - The element to click.
     */
    function reDispatchClick(element) {
        const newClickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        // A brief delay helps ensure the original click event has fully propagated.
        setTimeout(() => {
          isRedispatching = true;
          element.dispatchEvent(newClickEvent);
          isRedispatching = false;
        }, 50);
    }
  
    /**
     * The main handler that intercepts all clicks on the page during a recording session.
     */
    async function handleClick(e) {
      if (isRedispatching) return;
  
      // We stop the original click immediately to process it first.
      e.stopImmediatePropagation();
      e.preventDefault();
  
      const element = e.target;
      
      // Send the action description and other details to the service worker.
      chrome.runtime.sendMessage({
          action: 'logScribeAction',
          detail: {
              action: `Clicked on ${getElementDescription(element)}`,
              element: element.tagName,
          }
      });
  
      // Re-dispatch the click to let the page behave as expected.
      reDispatchClick(element);
    }
  
    // Add the master click listener to the entire document.
    document.addEventListener('click', handleClick, { capture: true });
  
    // Listen for a message from the service worker to stop the recording.
    chrome.runtime.onMessage.addListener(request => {
      if (request.action === 'stopScribe') {
        // Clean up by removing the listener and the overlay.
        document.removeEventListener('click', handleClick, { capture: true });
        if (overlay) overlay.remove();
        window.scribeInjected = false;
      }
      return false;
    });
  })();