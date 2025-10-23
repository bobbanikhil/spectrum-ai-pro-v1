/**
 * CONTENT SCRIPT - SPECTRUM AI PRO V3.3
 * Injected onto the page to capture user interactions for Scribe.
 * Handles potential runtime invalidation errors more gracefully.
 */

'use strict';

// Prevent multiple injections
if (window.spectrumAIContentScriptActive) {
    console.log('Spectrum AI Scribe: Already active.');
} else {
    window.spectrumAIContentScriptActive = true;
    console.log('🚀 Spectrum AI Scribe: Content script injected.');

    // Define the click handler function
    const handleScribeClick = (e) => {
        // Find the most specific element clicked
        let target = e.target;

        // Try to get meaningful text
        let details = target.innerText || target.value || target.getAttribute('aria-label') || target.name || target.id || target.tagName;

        // Clean up and truncate
        if (details) {
            details = details.trim().replace(/\s+/g, ' ').substring(0, 100);
        } else {
            details = `element (${target.tagName})`;
        }

        console.log('Scribe: Click detected on:', details);

        // Send this click event to the service worker
        try {
            // Check if runtime is still valid before sending
            if (chrome.runtime?.id) {
                chrome.runtime.sendMessage({
                    action: 'logScribeClick',
                    details: details
                });
            } else {
                 console.warn("Spectrum AI: Runtime context invalidated. Cannot send click event.");
                 // *** START: CONTEXT INVALIDATED FIX ***
                 // If runtime is invalid, remove this listener to stop errors
                 document.body.removeEventListener('click', handleScribeClick, true);
                 window.spectrumAIContentScriptActive = false;
                 // *** END: CONTEXT INVALIDATED FIX ***
            }
        } catch (e) {
             // Catch errors specifically related to the connection being closed
             if (e.message.includes("Extension context invalidated") || e.message.includes("Receiving end does not exist")) {
                 console.warn("Spectrum AI: Could not process click event - ", e.message);
                 // *** START: CONTEXT INVALIDATED FIX ***
                 // Remove listener to prevent further errors from this "zombie" script
                 document.body.removeEventListener('click', handleScribeClick, true);
                 window.spectrumAIContentScriptActive = false; // Mark as inactive
                 // *** END: CONTEXT INVALIDATED FIX ***
             } else {
                 console.error('Spectrum AI: Unexpected error sending click event:', e);
             }
        }

        // Add a visual indicator for the click
        addClickIndicator(e.clientX, e.clientY);
    };

    // Add the click listener to the entire document
    document.body.addEventListener('click', handleScribeClick, true); // Use capture phase

    function addClickIndicator(x, y) {
        try {
            let ripple = document.createElement('div');
            ripple.style.position = 'fixed';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            ripple.style.width = '20px';
            ripple.style.height = '20px';
            ripple.style.border = '2px solid var(--accent, #3b82f6)'; // Use CSS var with fallback
            ripple.style.borderRadius = '50%';
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.opacity = '1';
            ripple.style.zIndex = '2147483647'; // Max z-index
            ripple.style.pointerEvents = 'none';
            ripple.style.transition = 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'; // Smoother transition

            document.body.appendChild(ripple);

            // Animate outwards and fade
            requestAnimationFrame(() => {
                 ripple.style.transform = 'translate(-50%, -50%) scale(3)';
                 ripple.style.opacity = '0';
            });


            // Clean up the element after animation
            setTimeout(() => {
                if (document.body.contains(ripple)) {
                    document.body.removeChild(ripple);
                }
            }, 450); // Match transition duration + delay
        } catch (e) {
            // Ignore errors if CSP blocks style injection etc.
             console.warn("Could not add click indicator:", e.message);
        }
    }

    console.log("Scribe click listener attached.");
}