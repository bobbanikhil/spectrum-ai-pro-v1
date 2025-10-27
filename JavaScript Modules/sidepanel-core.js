// ============================================
// SPECTRUM AI PRO ENHANCED v3.2.1
// Core Module - State, Utilities, UI Init (DEBUGGED)
// ============================================

console.log('🌈 Loading Core Module...');

// ===== GLOBAL STATE =====
const AppState = {
  currentTab: 'auditor',
  currentView: 'split',
  auditData: null,
  auditReport: null,
  organizerGroups: null,
  selectedGroup: null,
  scribeSteps: [],
  scribeRecording: false,
  settings: null,
  charts: {},
  auditHistory: [],
};

// ===== AI SESSION MANAGEMENT =====
var aiManager; // Declared globally

// ===== UTILITY FUNCTIONS =====
// Assume functions like showStatus, showError, etc., are defined above in the bundle

// --- UI Initialization Functions ---

function initializeUI() {
  console.log('[DEBUG] > Running initializeUI...'); // <<< DEBUG LOG
  if (!AppState.settings) {
      console.warn("Settings not loaded before initializeUI called.");
      return;
  }
  if (AppState.settings.darkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  if (!AppState.settings.animations) {
    document.body.classList.add('no-animations');
  } else {
    document.body.classList.remove('no-animations');
  }
  console.log('[DEBUG] < Finished initializeUI.'); // <<< DEBUG LOG
}

function initializeTabNavigation() {
  console.log('[DEBUG] > Running initializeTabNavigation...'); // <<< DEBUG LOG
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');

  if (!tabLinks.length || !tabContents.length) {
      console.error("Tab navigation elements not found.");
      return;
  }

  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      console.log(`[DEBUG] Tab clicked: ${link.dataset.tab}`); // <<< DEBUG LOG
      const targetTabId = link.dataset.tab;
      if (!targetTabId || AppState.currentTab === targetTabId) return;

      tabLinks.forEach(l => l.classList.remove('active'));
      tabContents.forEach(c => { c.classList.remove('active'); c.hidden = true; });

      link.classList.add('active');
      const targetContent = document.getElementById(targetTabId);
      if (targetContent) {
        targetContent.classList.add('active');
        targetContent.hidden = false;
        console.log(`Switched to tab: ${targetTabId}`);
      } else {
         console.error(`Tab content not found for id: ${targetTabId}`);
      }
      AppState.currentTab = targetTabId;
      updateChatVisibility();
    });
  });

  const initialActiveTab = document.querySelector('.tab-link.active');
  const initialTabId = initialActiveTab?.dataset.tab || 'auditor';
  tabContents.forEach(c => { c.hidden = (c.id !== initialTabId); });
  AppState.currentTab = initialTabId;
  updateChatVisibility();
  console.log('[DEBUG] < Finished initializeTabNavigation.'); // <<< DEBUG LOG
}

function initializeViewModes() {
  console.log('[DEBUG] > Running initializeViewModes...'); // <<< DEBUG LOG
  const viewModeButtons = document.querySelectorAll('.view-mode-btn');
  const appContainer = document.querySelector('.app-container');

  if (!appContainer) {
      console.error("Critical Error: '.app-container' element not found! View modes cannot be applied.");
      return;
  }
   if (!viewModeButtons.length) {
      console.error("View mode buttons (.view-mode-btn) not found.");
      return;
   }

  viewModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      console.log(`[DEBUG] View mode clicked: ${btn.dataset.mode}`); // <<< DEBUG LOG
      viewModeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;

      appContainer.classList.remove('view-split', 'view-results', 'view-chat');
      appContainer.classList.add(`view-${mode}`);
      AppState.currentView = mode;
      console.log(`Switched to view mode: ${mode}`);
    });
  });

   const initialActiveButton = document.querySelector('.view-mode-btn.active');
   const initialMode = initialActiveButton?.dataset.mode || 'split';
   appContainer.classList.add(`view-${initialMode}`);
   AppState.currentView = initialMode;
   console.log('[DEBUG] < Finished initializeViewModes.'); // <<< DEBUG LOG
}

function updateChatVisibility() {
  // Only proceed if AppState is fully initialized
  if (!AppState || typeof AppState.currentTab === 'undefined') {
    console.warn("[DEBUG] updateChatVisibility called before AppState is ready.");
    return;
  }

  const chats = {
    auditor: 'auditorChatContainer',
    organizer: 'organizerChatContainer',
    scribe: 'scribeChatContainer'
  };
  Object.entries(chats).forEach(([tab, id]) => {
    const el = document.getElementById(id);
    if (el) {
       el.style.display = tab === AppState.currentTab ? 'flex' : 'none';
    } else {
        // Log warning only if it's the expected active chat
        if (tab === AppState.currentTab) {
           console.warn(`[DEBUG] Chat container '${id}' not found for active tab '${tab}'.`);
        }
    }
  });
}


function handleRuntimeMessage(message, sender, sendResponse) {
  console.log("Sidepanel received message:", message?.type, "from", sender.tab ? `tab ${sender.tab.id}` : "extension context");

  (async () => {
    try {
      switch (message?.type) {
        case 'ping':
          console.log("Sidepanel responding to ping");
          sendResponse({ ok: true });
          break;

        case 'scribe-click-captured':
          if (typeof handleClickCapture === 'function') {
            await handleClickCapture(message.data, message.tabId);
          } else {
            console.warn("Scribe click received, but handleClickCapture function is not defined.");
          }
          break;

        case 'context-menu-action':
        case 'keyboard-command':
          const action = message.action || message.command;
          console.log(`Sidepanel executing action trigger: ${action}`);

          let targetTabId;
          switch (action) {
            case 'runAudit': case 'run-audit': targetTabId = 'auditor'; break;
            case 'organizeTabs': case 'organize-tabs': targetTabId = 'organizer'; break;
            case 'startScribe': case 'start-scribe': targetTabId = 'scribe'; break;
            case 'openSidepanel':
                 if (sendResponse) sendResponse({ received: true, handled: true, action: 'open' });
                 return;
            default:
                 console.warn("Sidepanel received unhandled action trigger via message:", action);
                 if (sendResponse) sendResponse({ received: true, handled: false, error: `Unknown action: ${action}` });
                 return;
          }

          const tabLink = document.querySelector(`.tab-link[data-tab="${targetTabId}"]`);
          if (tabLink && AppState.currentTab !== targetTabId) {
            tabLink.click();
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          try {
              switch (action) {
                  case 'runAudit': case 'run-audit':
                      if (typeof runAudit === 'function') await runAudit(); else throw new Error('runAudit function not found');
                      break;
                  case 'organizeTabs': case 'organize-tabs':
                      if (typeof organizeTabs === 'function') await organizeTabs(); else throw new Error('organizeTabs function not found');
                      break;
                  case 'startScribe': case 'start-scribe':
                      if (typeof startScribeRecording === 'function') await startScribeRecording(); else throw new Error('startScribeRecording function not found');
                      break;
              }
              if (sendResponse) sendResponse({ received: true, handled: true, action: action });
          } catch (execError) {
              console.error(`Error executing action ${action} in sidepanel:`, execError);
              if (typeof showError === 'function') showError(`Failed to execute '${action}'. ${execError.message}`, 'error');
              if (sendResponse) sendResponse({ received: true, handled: false, error: execError.message });
          }
          break;

        case 'tab-updated':
          if (AppState.scribeRecording && typeof reinjectScribeContentScript === 'function') {
            await reinjectScribeContentScript(message.tabId);
          }
          break;

        default:
          console.log('Sidepanel received unhandled message type:', message?.type);
          if (typeof sendResponse === 'function') {
            sendResponse({ received: true, handled: false, error: 'Unknown message type' });
          }
      }
    } catch (error) {
       console.error("Error in sidepanel message handler:", error);
       if (typeof sendResponse === 'function') {
           try { sendResponse({ received: true, handled: false, error: error.message }); }
           catch (e) { console.error("Failed to send error response:", e); }
       }
    }
  })();

  return message?.type !== 'ping'; // Keep channel open for async responses
}


// --- Global Exports ---
window.AppState = AppState;
window.aiManager = aiManager; // Already declared globally, but re-assign just in case
// Expose UI/Utility functions if needed elsewhere (like maybe settings/modal?)
window.showStatus = typeof showStatus !== 'undefined' ? showStatus : undefined;
window.showError = typeof showError !== 'undefined' ? showError : undefined;
window.showSuccess = typeof showSuccess !== 'undefined' ? showSuccess : undefined;
window.getCurrentTab = typeof getCurrentTab !== 'undefined' ? getCurrentTab : undefined;
window.getTabContent = typeof getTabContent !== 'undefined' ? getTabContent : undefined;
window.loadSettings = typeof loadSettings !== 'undefined' ? loadSettings : undefined;
window.saveSettings = typeof saveSettings !== 'undefined' ? saveSettings : undefined;


console.log('✅ Core module definitions loaded');