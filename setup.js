'use strict';

/// ==== TEMPORARY MODIFICATION in setup.js ====

async function checkAIAvailability() {
    const statusIcon = document.getElementById('aiStatusIcon');
    const statusDesc = document.getElementById('aiStatusDesc');
    const enableBtn = document.getElementById('enableAIBtn');
     try {
        if (!statusIcon || !enableBtn) return;
        statusIcon.className = 'requirement-icon checking'; statusIcon.textContent = '⏳'; statusDesc.textContent = 'Checking AI status...';
        let available = false; let availabilityStatus = 'unknown';

        // *** CHANGE: Only check for self.LanguageModel ***
        const LangModelCapExists = typeof self.LanguageModel !== 'undefined';
        console.log(`Setup Modified Check: self.LanguageModel exists = ${LangModelCapExists}`);

        if (!LangModelCapExists) {
            console.warn("`self.LanguageModel` API structure not found in setup.");
            statusDesc.textContent = 'API structure missing. Check flags & relaunch.';
            available = false;
        } else {
            console.log("Checking model availability via self.LanguageModel.availability() in setup...");
            availabilityStatus = await self.LanguageModel.availability();
            console.log("Model availability status in setup:", availabilityStatus);
            if (availabilityStatus === 'no' || availabilityStatus === 'unavailable') {
                console.error(`AI Model availability reported as '${availabilityStatus}' in setup.`);
                statusDesc.textContent = `Model '${availabilityStatus}'. Check flags/relaunch.`;
                available = false;
            } else if (availabilityStatus === 'after-download') {
                 console.warn("AI Model needs download. API exists.");
                 statusDesc.textContent = `Model requires download (may take time after relaunch).`;
                 available = true; // API structure is present
            }
             else if (availabilityStatus === 'readily' || availabilityStatus === 'available') {
                 try {
                     // *** CHANGE: Call create directly on LanguageModel ***
                     const s = await self.LanguageModel.create({ outputLanguage: 'en' });
                     await s.destroy();
                     console.log("self.LanguageModel.create() check successful in setup.");
                     available = true;
                 } catch (sessionError) {
                     console.error("Test session creation failed in setup:", sessionError);
                     available = false; statusDesc.textContent = `Session test failed: ${sessionError.message}`;
                 }
            } else {
                 console.warn("Unknown AI availability status:", availabilityStatus);
                 statusDesc.textContent = `Unknown status: ${availabilityStatus}. Check flags.`;
                 available = false;
            }
        }

        if (available) {
            statusIcon.className = 'requirement-icon check';
            statusIcon.textContent = '✓';
            // Show more specific status
             if (availabilityStatus === 'after-download') {
                 // Keep the download message
                 statusDesc.textContent = `Model downloading/pending. Relaunch Chrome if needed.`;
                 // Keep button enabled to show instructions again
                 enableBtn.textContent = 'Enable AI Features (Instructions)';
                 enableBtn.disabled = false;
             } else { // readily or available
                 statusDesc.textContent = 'AI features detected & ready!';
                 enableBtn.textContent = 'AI Features Detected';
                 enableBtn.disabled = true;
                 enableBtn.style.opacity = '0.6';
             }
        } else {
            statusIcon.className = 'requirement-icon warning';
            statusIcon.textContent = '!';
            // Keep specific error messages if set above
            if (!statusDesc.textContent.includes('Model') && !statusDesc.textContent.includes('Session') && !statusDesc.textContent.includes('API')) {
                 statusDesc.textContent = 'AI not detected. Click button for setup.';
            }
            enableBtn.textContent = 'Enable AI Features (Instructions)';
            enableBtn.disabled = false;
        }
    } catch (error) {
        statusIcon.className = 'requirement-icon warning';
        statusIcon.textContent = '!';
        statusDesc.textContent = 'AI check failed. Click button for setup.';
        enableBtn.textContent = 'Enable AI Features (Instructions)';
        enableBtn.disabled = false;
        console.error('AI check failed:', error.message, error.name);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Enable AI features button
    document.getElementById('enableAIBtn').addEventListener('click', () => {
        // Open Chrome flags pages in new tabs
        chrome.tabs.create({
            url: 'chrome://flags/#prompt-api-for-gemini-nano' // Correct flag name
        });
        chrome.tabs.create({
            url: 'chrome://flags/#optimization-guide-on-device-model' // Second required flag
        });
        // Provide clearer instructions in an alert
        alert(
            "Two flag pages should have opened.\n\n" +
            "Please **ENABLE** BOTH flags:\n" +
            "1. `#prompt-api-for-gemini-nano`\n" +
            "2. `#optimization-guide-on-device-model`\n\n" +
            "After enabling BOTH, click the **'Relaunch'** button at the bottom of the flags page.\n\n" +
            "**IMPORTANT:** Make sure Chrome closes completely and restarts."
            );
    });

    // Open side panel button
    document.getElementById('openSidePanelBtn').addEventListener('click', () => {
        // Try to open side panel, handle potential errors
        try {
            chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
            // Close setup page *only* if side panel opens successfully
             setTimeout(() => window.close(), 100); // Small delay before closing
        } catch (e) {
            console.error("Could not open side panel:", e);
            alert("Could not automatically open side panel. Please click the extension icon in your toolbar.");
        }
    });

    // Initialize AI check on load
    checkAIAvailability();

    // Re-check when the page gains focus
    window.addEventListener('focus', checkAIAvailability);
    // Also re-check periodically
    setInterval(checkAIAvailability, 5000); // Check every 5 seconds
});

console.log("Setup script loaded (v3.2)");