// ============================================
// SPECTRUM AI PRO ENHANCED v3.2.2 - MAIN (FULLY FIXED)
// ============================================

console.log('🌈 Spectrum AI Pro Enhanced - Starting Initialization...');

// Global state and managers
window.AppState = {
  currentTab: 'auditor',
  currentView: 'split',
  auditData: null,
  auditReport: null,
  organizerGroups: null,
  selectedGroup: null,
  scribeSteps: [],
  scribeRecording: false,
  settings: {
    aiEnabled: true,
    darkMode: true,
    animations: true,
    autoGroup: false,
    maxHistory: 100,
    screenshotQuality: 0.7
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('[INIT] Starting Spectrum AI Pro Enhanced initialization...');

    // 1. Check for AI API availability
    const hasAIAPI = typeof globalThis.ai?.languageModel?.capabilities === 'function';
    console.log(`[INIT] AI API available: ${hasAIAPI}`);

    // 2. Initialize AI Manager
    if (!hasAIAPI) {
      console.warn('⚠️ Chrome Built-in AI API not available.');
      console.warn('   Please enable: chrome://flags/#prompt-api-for-gemini-nano');
      console.warn('   and chrome://flags/#optimization-guide-on-device-model');

      // Show error in UI
      const banner = document.getElementById('aiWarningBanner');
      const bannerText = document.getElementById('aiWarningText');
      if (banner && bannerText) {
        banner.style.display = 'flex';
        banner.className = 'status-message error';
        bannerText.textContent = '⚠️ AI API not available. Please enable Chrome flags.';
      }

      // Create a mock AI manager that always throws
      window.aiManager = {
        isAvailable: 'no',
        async initialize() { return false; },
        async createSession() {
          throw new Error('AI API not available. Please enable Chrome flags.');
        },
        async prompt() {
          throw new Error('AI API not available. Please enable Chrome flags.');
        },
        async streamPrompt() {
          throw new Error('AI API not available. Please enable Chrome flags.');
        }
      };
    } else {
      console.log('[INIT] Creating AIManager instance...');
      window.aiManager = new AIManager();

      console.log('[INIT] Initializing AI Manager...');
      await window.aiManager.initialize();
    }

    // 3. Load settings from storage
    console.log('[INIT] Loading settings...');
    await loadSettings();

    // 4. Initialize UI components
    console.log('[INIT] Initializing UI...');
    initializeUI();
    initializeTabNavigation();
    initializeViewModes();

    // 5. Initialize feature modules
    console.log('[INIT] Initializing modules...');
    if (typeof initializeAuditor === 'function') initializeAuditor();
    if (typeof initializeOrganizer === 'function') initializeOrganizer();
    if (typeof initializeScribe === 'function') initializeScribe();
    if (typeof initializeHistory === 'function') initializeHistory();
    if (typeof initializeChat === 'function') initializeChat();
    if (typeof initializeModal === 'function') initializeModal();

    // 6. Set up message listener
    console.log('[INIT] Setting up message listener...');
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);

    console.log('✅ Spectrum AI Pro Enhanced initialized successfully!');

  } catch (error) {
    console.error('💥 FATAL INITIALIZATION ERROR:', error);

    // Show user-friendly error
    const resultsContent = document.querySelector('.results-content');
    if (resultsContent) {
      resultsContent.innerHTML = `
        <div class="placeholder error">
          <div class="placeholder-icon">⚠️</div>
          <h2>Initialization Error</h2>
          <p>${error.message}</p>
          <p style="font-size: 12px; margin-top: 20px;">
            Please check the console and ensure Chrome AI flags are enabled.
          </p>
        </div>
      `;
    }
  }
});

// ===== SETTINGS MANAGEMENT =====
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    if (result.settings) {
      AppState.settings = { ...AppState.settings, ...result.settings };
    }
    console.log('[SETTINGS] Loaded:', AppState.settings);
  } catch (error) {
    console.error('[SETTINGS] Load error:', error);
  }
}

async function saveSettings() {
  try {
    await chrome.storage.local.set({ settings: AppState.settings });
    console.log('[SETTINGS] Saved:', AppState.settings);
  } catch (error) {
    console.error('[SETTINGS] Save error:', error);
  }
}

// ===== UI INITIALIZATION =====
function initializeUI() {
  // Apply theme
  if (AppState.settings?.darkMode) {
    document.body.classList.add('dark-mode');
  }

  // Apply animations preference
  if (!AppState.settings?.animations) {
    document.body.classList.add('no-animations');
  }
}

// ===== TAB NAVIGATION =====
function initializeTabNavigation() {
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');

  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tabName = link.dataset.tab;
      console.log(`[NAV] Switching to tab: ${tabName}`);

      // Update active states
      tabLinks.forEach(l => l.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      link.classList.add('active');
      document.getElementById(tabName)?.classList.add('active');

      // Update state
      AppState.currentTab = tabName;

      // Show/hide appropriate results
      hideAllResults();
      showResultsForTab(tabName);

      // Update results title
      const titles = {
        auditor: '📊 Audit Results',
        organizer: '📂 Tab Organization',
        scribe: '📝 Workflow Documentation',
        history: '🕒 Audit History'
      };
      const titleEl = document.getElementById('resultsTitle');
      if (titleEl) titleEl.textContent = titles[tabName] || 'Results';
    });
  });
}

function hideAllResults() {
  const resultElements = [
    'auditorResults',
    'organizerResults',
    'scribeResults',
    'historyList',
    'dashboardContainer',
    'scribeActionResults',
    'groupActionResults'
  ];

  resultElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function showResultsForTab(tabName) {
  const elementMap = {
    auditor: 'auditorResults',
    organizer: 'organizerResults',
    scribe: 'scribeResults',
    history: 'historyList'
  };

  const elementId = elementMap[tabName];
  if (elementId) {
    const el = document.getElementById(elementId);
    if (el) el.style.display = 'block';
  }
}

// ===== VIEW MODES =====
function initializeViewModes() {
  const viewButtons = document.querySelectorAll('.view-mode-btn');
  const container = document.querySelector('.app-container');

  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      console.log(`[VIEW] Switching to mode: ${mode}`);

      viewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      container.className = `app-container view-${mode}`;
      AppState.currentView = mode;
    });
  });
}

// ===== MESSAGE HANDLER =====
function handleRuntimeMessage(message, sender, sendResponse) {
  console.log('[MSG] Received:', message);

  try {
    switch (message.type) {
      case 'context-menu-action':
        handleContextMenuAction(message.action);
        break;
      case 'keyboard-command':
        handleKeyboardCommand(message.command);
        break;
      case 'tab-updated':
        handleTabUpdate(message.tabId);
        break;
      case 'scribe-click-captured':
        if (typeof handleClickCapture === 'function') {
          handleClickCapture(message.data, message.tabId);
        }
        break;
    }
    sendResponse({ received: true });
  } catch (error) {
    console.error('[MSG] Handler error:', error);
    sendResponse({ error: error.message });
  }

  return true; // Keep channel open for async response
}

async function handleContextMenuAction(action) {
  console.log('[ACTION] Context menu:', action);

  switch (action) {
    case 'runAudit':
      switchToTab('auditor');
      if (typeof runAudit === 'function') await runAudit();
      break;
    case 'organizeTabs':
      switchToTab('organizer');
      if (typeof organizeTabs === 'function') await organizeTabs();
      break;
    case 'startScribe':
      switchToTab('scribe');
      if (typeof startScribeRecording === 'function') startScribeRecording();
      break;
  }
}

async function handleKeyboardCommand(command) {
  console.log('[CMD] Keyboard:', command);

  switch (command) {
    case 'run-audit':
      switchToTab('auditor');
      if (typeof runAudit === 'function') await runAudit();
      break;
    case 'organize-tabs':
      switchToTab('organizer');
      if (typeof organizeTabs === 'function') await organizeTabs();
      break;
    case 'start-scribe':
      switchToTab('scribe');
      if (typeof startScribeRecording === 'function') startScribeRecording();
      break;
  }
}

function handleTabUpdate(tabId) {
  console.log('[TAB] Updated:', tabId);

  // If Scribe is recording, reinject content script
  if (AppState.scribeRecording && typeof reinjectScribeContentScript === 'function') {
    reinjectScribeContentScript(tabId);
  }
}

function switchToTab(tabName) {
  const tabLink = document.querySelector(`.tab-link[data-tab="${tabName}"]`);
  if (tabLink) tabLink.click();
}

// Export functions for use by other modules
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.handleRuntimeMessage = handleRuntimeMessage;

console.log('✅ Main initialization script loaded');