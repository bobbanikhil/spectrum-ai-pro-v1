/**
 * CONTENT SCRIPT - SPECTRUM AI PRO V3.4
 * Injected onto the page to capture user interactions for Scribe.
 * Handles potential runtime invalidation errors more gracefully.
 * Added user advice on context invalidation error.
 */

'use strict';

if (window.spectrumAIContentScriptActive) {
    console.log('Spectrum AI Scribe: Already active.');
} else {
    window.spectrumAIContentScriptActive = true;
    console.log('🚀 Spectrum AI Scribe: Content script injected.');

    const handleScribeClick = (e) => {
        let target = e.target;
        let details = target.innerText || target.value || target.getAttribute('aria-label') || target.name || target.id || target.tagName;
        details = details ? details.trim().replace(/\s+/g, ' ').substring(0, 100) : `element (${target.tagName})`;
        console.log('Scribe: Click detected on:', details);

        try {
            if (chrome.runtime?.id) {
                chrome.runtime.sendMessage({ action: 'logScribeClick', details: details });
            } else {
                 console.warn("Spectrum AI: Runtime context invalidated. Cannot send click event. Please reload the page to continue recording accurately."); // Added advice
                 document.body.removeEventListener('click', handleScribeClick, true);
                 window.spectrumAIContentScriptActive = false;
            }
        } catch (e) {
             if (e.message.includes("Extension context invalidated") || e.message.includes("Receiving end does not exist")) {
                 console.warn("Spectrum AI: Could not process click event - ", e.message, ". Please reload the page to continue recording accurately."); // Added advice
                 document.body.removeEventListener('click', handleScribeClick, true);
                 window.spectrumAIContentScriptActive = false;
             } else {
                 console.error('Spectrum AI: Unexpected error sending click event:', e);
                 // Optionally remove listener on unexpected errors too?
                 // document.body.removeEventListener('click', handleScribeClick, true);
                 // window.spectrumAIContentScriptActive = false;
             }
        }
        addClickIndicator(e.clientX, e.clientY);
    };

    // Use try...catch for initial listener attachment
    try {
        document.body.addEventListener('click', handleScribeClick, true); // Use capture phase
        console.log("Scribe click listener attached.");
    } catch (e) {
        console.error("Spectrum AI: Failed to attach click listener:", e);
        window.spectrumAIContentScriptActive = false; // Ensure state reflects failure
    }


    function addClickIndicator(x, y) {
        // ... (function unchanged) ...
        try {
            let ripple = document.createElement('div');
            // ... (styles) ...
            ripple.style.position = 'fixed';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            ripple.style.width = '20px';
            // ... (rest of styles) ...
            document.body.appendChild(ripple);
            requestAnimationFrame(() => { /* ... animation ... */ });
            setTimeout(() => { /* ... cleanup ... */ }, 450);
        } catch (e) { /* ... error handling ... */ }
    }
}