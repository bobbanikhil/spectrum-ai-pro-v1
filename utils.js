// ============================================
// SPECTRUM AI PRO ENHANCED v3.2.1
// Utilities Module - Common Functions (FIXED: Removed export)
// ============================================
console.log('[DEBUG] sidepanel-bundle.js starting (utils.js)');
// UI Utilities
/* export */ function showStatus(elementId, message, show = true) { // Removed 'export'
  const el = document.getElementById(elementId);
  if (!el) {
      console.warn("showStatus: Element not found", elementId);
      return;
  }

  const textEl = el.querySelector('span[id$="StatusText"]'); // More specific selector
  if (textEl) textEl.textContent = message;
  // Use flex as per sidepanel.css for status-message
  el.style.display = show ? 'flex' : 'none';

  const loaderId = elementId.replace('Status', 'Loader'); // Infer loader ID
  const loader = document.getElementById(loaderId);
  if (loader?.classList.contains('loader')) {
    loader.style.display = show ? 'block' : 'none'; // Loaders use block
  }
}

/* export */ function showError(msg, type = 'error') { // Removed 'export'
  console.error(`Spectrum AI (${type.toUpperCase()}): ${msg}`);
  const el = document.getElementById('auditStatus'); // Reuse audit status for general errors
  if (el) {
      el.className = `status-message ${type}`;
      // Use the function, not direct DOM manipulation
      showStatus('auditStatus', msg, true);
      // Hide after a delay
      setTimeout(() => {
          // Check if the message is still the same before hiding
          const textEl = el.querySelector('span[id$="StatusText"]');
          if (textEl && textEl.textContent === msg) {
              showStatus('auditStatus', '', false);
          }
      }, 5000);
  }
}

/* export */ function showSuccess(msg) { // Removed 'export'
  console.log(`Spectrum AI (Success): ${msg}`);
  const el = document.getElementById('auditStatus');
  if (el) {
      el.className = 'status-message success';
      showStatus('auditStatus', msg, true);
      setTimeout(() => {
           const textEl = el.querySelector('span[id$="StatusText"]');
           if (textEl && textEl.textContent === msg) {
               showStatus('auditStatus', '', false);
           }
      }, 3000);
  }
}

// Content Handling
/* export */ function escapeHtml(text) { // Removed 'export'
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Date & Time Utilities
/* export */ function formatDate(dateString) { // Removed 'export'
  try {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

// URL Utilities
/* export */ function getHostname(url) { // Removed 'export'
  try {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return url || ''; // FIX: Handle non-http URLs better
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Scoring & Classification
/* export */ function getScoreClass(score) { // Removed 'export'
  score = Number(score);
  if (isNaN(score)) return 'poor';
  if (score >= 90) return 'excellent'; // Adjusted threshold
  if (score >= 70) return 'good'; // Adjusted threshold
  if (score >= 50) return 'fair'; // Adjusted threshold
  return 'poor';
}

// Action & Result Formatting
/* export */ function formatActionResult(result) { // Removed 'export'
  if (typeof result === 'string') return marked.parse(result); // Use marked from below
  if (Array.isArray(result)) {
    return '<ul>' + result.map(item => `<li>${escapeHtml(String(item))}</li>`).join('') + '</ul>';
  }
   try {
       return '<pre><code>' + escapeHtml(JSON.stringify(result, null, 2)) + '</code></pre>';
   } catch {
       return '<pre><code>' + escapeHtml(String(result)) + '</code></pre>';
   }
}

/* export */ function getActionTitle(actionType) { // Removed 'export'
  const titles = {
    summarize: '📄 Group Summary',
    extract: '📊 Extracted Key Data',
    contacts: '👤 Found Contacts',
    analyze: '🔬 Content Analysis',
    compare: '⚖️ Comparison Results',
    predict: '🔮 Trend Predictions'
  };
  return titles[actionType] || 'Action Results';
}

// Browser Tab Utilities
/* export */ async function getCurrentTab() { // Removed 'export'
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  } catch (error) {
    console.error('Get current tab error:', error);
    return null;
  }
}

/* export */ async function getTabContent(tabId) { // Removed 'export'
  try {
    // This sends a message to the service-worker.js
    const response = await chrome.runtime.sendMessage({
      type: 'get-tab-content',
      tabId: tabId
    });

    if (chrome.runtime.lastError) {
        throw new Error(`Connection error: ${chrome.runtime.lastError.message}`);
    }
    if (response && response.success) {
        // console.log(`Content received for tab ${tabId}:`, response.data.title);
        return response.data;
    } else {
        throw new Error(response.error || 'Failed to get tab content (unknown reason).');
    }
  } catch (error) {
    console.error(`Get tab content error for tab ${tabId}:`, error);
    // Re-throw a more specific error for the caller
    throw new Error(`Could not retrieve content from the tab. ${error.message}`);
  }
}

// Simple markdown parser
/* export */ const marked = { // Removed 'export'
  parse: (md = "") => {
    if (typeof md !== 'string') md = String(md);
    return md
      .replace(/^### (.*)$/gim, '<h3>$1</h3>')
      .replace(/^## (.*)$/gim, '<h2>$1</h2>')
      .replace(/^# (.*)$/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\s*-\s+(.*)$/gim, '<li>$1</li>') // Basic list item
      .replace(/(`)(.*?)(`)/g, '<code>$2</code>')
      .replace(/\n/g, '<br>'); // Simple newline conversion
    }
};

// Moved from original utils.js as they depend on AppState from sidepanel-core.js
// but need to be defined before they are called. Ensure sidepanel-core.js is bundled after utils.js
// but before loadSettings is called in main.js
async function loadSettings() {
  try {
    const defaults = {
      aiEnabled: true,
      darkMode: true,
      animations: true,
      autoGroup: false,
      maxHistory: 100,
      screenshotQuality: 0.7
    };
    const result = await chrome.storage.local.get({ settings: defaults });
    // Ensure AppState exists before assigning
    if (typeof AppState !== 'undefined') {
        AppState.settings = result.settings;
        console.log("Settings loaded:", AppState.settings);
    } else {
        console.error("AppState not defined when loadSettings was called.");
        // We will rely on main.js calling this AFTER AppState is defined.
    }
  } catch (error) {
    console.error('Settings load error:', error);
     if (typeof AppState !== 'undefined') {
        AppState.settings = { aiEnabled: true, darkMode: true, animations: true, autoGroup: false, maxHistory: 100, screenshotQuality: 0.7 }; // Fallback
     }
  }
}

async function saveSettings() {
  // Ensure AppState exists before trying to save from it
  if (typeof AppState === 'undefined' || AppState.settings === null) {
      console.error("Cannot save settings: AppState or AppState.settings not available.");
      return;
  }
  try {
    await chrome.storage.local.set({ settings: AppState.settings });
    console.log("Settings saved:", AppState.settings);
  } catch (error) {
    console.error('Settings save error:', error);
  }
}

console.log('✅ Utilities module loaded');