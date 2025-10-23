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

    async function captureScreenshot() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'captureVisibleTab' });
            return response?.screenshotDataUrl || null;
        } catch (e) {
            console.error("Spectrum AI: Failed to capture screenshot:", e);
            return null;
        }
    }

    const handleScribeClick = async (e) => {
        let target = e.target;
        let details = '';
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            details = `Input field: ${target.name || target.id || target.placeholder || 'N/A'}`; 
        } else if (target.tagName === 'A') {
            details = `Link: ${target.innerText.substring(0, 50) || target.href || 'N/A'}`; 
        } else if (target.tagName === 'BUTTON') {
            details = `Button: ${target.innerText.substring(0, 50) || target.id || 'N/A'}`; 
        } else if (target.id) {
            details = `Element with ID: ${target.id}`; 
        } else if (target.className) {
            details = `Element with class: ${target.className.split(' ')[0]}`; 
        } else {
            details = target.innerText ? `Text: ${target.innerText.substring(0, 50)}` : `Element: ${target.tagName}`; 
        }
        details = details.trim().replace(/\s+/g, ' ').substring(0, 100);
        console.log('Scribe: Click detected on:', details);

        const screenshotDataUrl = await captureScreenshot();
        try {
            if (chrome.runtime?.id) {
                chrome.runtime.sendMessage({ action: 'logScribeClick', details: details, screenshotDataUrl: screenshotDataUrl });
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