// ============================================
// SPECTRUM AI PRO ENHANCED v3.2 - MAIN (FIXED & DEBUGGED)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[DEBUG] DOMContentLoaded event fired.'); // <<< DEBUG LOG
  try {
    // Determine AI Manager (Real or Mock)
    if (typeof globalThis.ai === 'undefined' || !globalThis.ai.languageModel) {
      console.warn('⚠️ AI API not available. Using Mock AI Manager.');
      // Ensure MockAIManager class is defined (should be bundled before this)
      if (typeof MockAIManager === 'undefined') {
         console.error("FATAL: MockAIManager class is not defined. Bundle order might be wrong.");
         alert("Extension critical error: MockAIManager not found. Check console."); // Alert user directly
         return; // Stop execution
      }
      aiManager = new MockAIManager();
    } else {
      console.log('ℹ️ Using real AI Manager.');
       // Ensure AIManager class is defined (should be bundled before this)
      if (typeof AIManager === 'undefined') {
         console.error("FATAL: AIManager class is not defined. Bundle order might be wrong.");
         alert("Extension critical error: AIManager not found. Check console."); // Alert user directly
         return; // Stop execution
      }
      aiManager = new AIManager();
    }
    window.aiManager = aiManager; // Expose globally

    console.log('🌈 Initializing Spectrum AI Pro Enhanced...');

    // --- Initialization Order ---
    console.log('[DEBUG] 1. Loading settings...');
    // Ensure loadSettings is defined (should be bundled from utils.js)
    if (typeof loadSettings !== 'function') {
      console.error("FATAL: loadSettings function not found. Bundle order might be wrong.");
      alert("Extension critical error: loadSettings not found. Check console.");
      return;
    }
    await loadSettings();
    console.log('[DEBUG] Settings loaded:', window.AppState?.settings); // Use window.AppState for safety

    console.log('[DEBUG] 2. Initializing AI Manager...');
    const aiReady = await aiManager.initialize(); // Handles banner display
    console.log(`[DEBUG] AI Ready status: ${aiReady}`);

    // Dismiss button for AI Warning Banner
    const aiWarningDismiss = document.getElementById('aiWarningDismiss');
    if (aiWarningDismiss) {
      aiWarningDismiss.addEventListener('click', () => {
        const banner = document.getElementById('aiWarningBanner');
        if (banner) banner.style.display = 'none';
      });
    } else {
       console.warn("[DEBUG] AI Warning Dismiss button not found.");
    }

    console.log('[DEBUG] 3. Initializing Core UI...');
    // Ensure core UI functions are defined (should be bundled from sidepanel-core.js)
    if (typeof initializeUI !== 'function' || typeof initializeTabNavigation !== 'function' || typeof initializeViewModes !== 'function') {
       console.error("FATAL: Core UI initialization functions not found. Bundle order might be wrong.");
       alert("Extension critical error: Core UI functions missing. Check console.");
       return;
    }
    initializeUI(); // Applies dark mode etc.
    initializeTabNavigation(); // Sets up tab switching
    initializeViewModes(); // Sets up view mode switching

    console.log('[DEBUG] 4. Initializing Modules...');
    // Ensure module init functions are defined
     if (typeof initializeAuditor !== 'function' || typeof initializeOrganizer !== 'function' ||
         typeof initializeScribe !== 'function' || typeof initializeHistory !== 'function' ||
         typeof initializeChat !== 'function' || typeof initializeModal !== 'function') {
       console.warn("One or more module initialization functions might be missing. Check bundle order if modules fail.");
       // Don't stop execution, but warn
    }
    // Call initializers safely
    if (typeof initializeAuditor === 'function') initializeAuditor(); else console.error("[DEBUG] initializeAuditor missing");
    if (typeof initializeOrganizer === 'function') initializeOrganizer(); else console.error("[DEBUG] initializeOrganizer missing");
    if (typeof initializeScribe === 'function') initializeScribe(); else console.error("[DEBUG] initializeScribe missing");
    if (typeof initializeHistory === 'function') initializeHistory(); else console.error("[DEBUG] initializeHistory missing"); // This calls loadHistory internally
    if (typeof initializeChat === 'function') initializeChat(); else console.error("[DEBUG] initializeChat missing"); // This calls initializeChatWelcome internally
    if (typeof initializeModal === 'function') initializeModal(); else console.error("[DEBUG] initializeModal missing");

    console.log('[DEBUG] 5. Setting up Message Listener...');
     // Ensure handler is defined (should be bundled from sidepanel-core.js)
    if (typeof handleRuntimeMessage !== 'function') {
       console.error("FATAL: handleRuntimeMessage function not found. Bundle order wrong.");
       alert("Extension critical error: Message handler missing. Check console.");
       return;
    }
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);

    console.log('✅✅ Spectrum AI Pro Initialized and Ready! ✅✅');

  } catch (error) {
    // Catch any error during the entire initialization
    console.error('💥💥 FATAL INITIALIZATION ERROR:', error);
    // Display a prominent error message to the user in the UI
    const bodyElement = document.body;
    if (bodyElement) {
        bodyElement.innerHTML = `
            <div style="padding: 20px; color: #f87171; background: #4c1d1d; border: 1px solid #ef4444; border-radius: 8px; margin: 20px;">
                <h2>Extension Initialization Failed</h2>
                <p>Something went wrong during startup. Please check the extension console for details.</p>
                <p><strong>Error:</strong> ${error.message}</p>
                <p>Try reloading the extension or restarting Chrome.</p>
            </div>
        `;
    }
     // Optionally alert the user too
     alert(`Extension Initialization Failed: ${error.message}. Check the extension console.`);
  }
  console.log('[DEBUG] DOMContentLoaded event handler finished.'); // <<< DEBUG LOG
});