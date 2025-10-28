<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Spectrum AI Pro - Complete Working Version</title>
</head>
<body>
<pre style="background: #1e1e1e; color: #d4d4d4; padding: 20px; overflow-x: auto;">
// ===========================================
// FILE 1: AIManager-fixed.js
// ===========================================
class AIManager {
  constructor() {
    this.session = null;
    this.isAvailable = 'unknown';
  }

  async checkAvailability() {
    if (typeof globalThis.ai?.languageModel?.capabilities !== 'function') {
      this.isAvailable = 'no';
      return 'no';
    }
    try {
      const caps = await globalThis.ai.languageModel.capabilities();
      this.isAvailable = caps.available;
      return this.isAvailable;
    } catch (e) {
      this.isAvailable = 'no';
      return 'no';
    }
  }

  async initialize() {
    const availability = await this.checkAvailability();
    return availability === 'readily';
  }

  async createSession(options = {}) {
    if (this.session && this.isAvailable === 'readily') return this.session;
    
    const availability = await this.checkAvailability();
    if (availability === 'no') {
      throw new Error('AI not available');
    }

    const params = await globalThis.ai.languageModel.params();
    this.session = await globalThis.ai.languageModel.create({
      systemPrompt: options.systemPrompt || 'You are a helpful AI assistant.',
      temperature: options.temperature ?? params.defaultTemperature,
      topK: options.topK ?? params.defaultTopK
    });
    
    this.isAvailable = 'readily';
    return this.session;
  }

  async prompt(text) {
    if (!this.session) await this.createSession();
    if (!this.session) throw new Error('AI session unavailable');
    return await this.session.prompt(text);
  }

  async streamPrompt(text, context = '', onChunk) {
    if (!this.session) await this.createSession();
    if (!this.session) throw new Error('AI session unavailable');

    const fullPrompt = context ? `${context}\n\nUser: ${text}` : text;
    const stream = await this.session.promptStreaming(fullPrompt);

    let fullResponse = '';
    for await (const chunk of stream) {
      fullResponse = chunk;
      if (onChunk) onChunk(chunk);
    }
    return fullResponse;
  }
}

// ===========================================
// FILE 2: main-fixed.js
// ===========================================
window.AppState = {
  currentTab: 'auditor',
  auditData: null,
  auditReport: null,
  organizerGroups: null,
  scribeSteps: [],
  scribeRecording: false,
  settings: {
    aiEnabled: true,
    darkMode: true,
    animations: true,
    maxHistory: 100,
    screenshotQuality: 0.7
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌈 Initializing...');

  // Check AI API
  const hasAI = typeof globalThis.ai?.languageModel?.capabilities === 'function';
  
  if (!hasAI) {
    console.warn('⚠️ AI API not available');
    window.aiManager = {
      isAvailable: 'no',
      async createSession() { throw new Error('AI unavailable'); },
      async prompt() { throw new Error('AI unavailable'); }
    };
  } else {
    window.aiManager = new AIManager();
    await aiManager.initialize();
  }

  // Load settings
  try {
    const result = await chrome.storage.local.get('settings');
    if (result.settings) {
      AppState.settings = {...AppState.settings, ...result.settings};
    }
  } catch (e) {
    console.error('Settings load error:', e);
  }

  // Initialize UI
  initializeTabNavigation();
  initializeViewModes();

  // Initialize modules
  if (typeof initializeAuditor === 'function') initializeAuditor();
  if (typeof initializeOrganizer === 'function') initializeOrganizer();
  if (typeof initializeScribe === 'function') initializeScribe();
  if (typeof initializeChat === 'function') initializeChat();
  if (typeof initializeHistory === 'function') initializeHistory();
  if (typeof initializeModal === 'function') initializeModal();

  // Message listener
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'scribe-click-captured' && typeof handleClickCapture === 'function') {
      handleClickCapture(msg.data, msg.tabId);
    }
    sendResponse({received: true});
    return true;
  });

  console.log('✅ Initialized!');
});

function initializeTabNavigation() {
  document.querySelectorAll('.tab-link').forEach(link => {
    link.addEventListener('click', () => {
      const tabName = link.dataset.tab;
      document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      link.classList.add('active');
      document.getElementById(tabName)?.classList.add('active');
      AppState.currentTab = tabName;
    });
  });
}

function initializeViewModes() {
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector('.app-container').className = `app-container view-${mode}`;
    });
  });
}

// ===========================================
// FILE 3: sidepanel-auditor-fixed.js
// ===========================================
function initializeAuditor() {
  document.getElementById('auditButton')?.addEventListener('click', runAudit);
}

async function runAudit() {
  const btn = document.getElementById('auditButton');
  try {
    if (btn) btn.disabled = true;
    showStatus('auditStatus', 'Starting audit...', true);

    const tab = await getCurrentTab();
    if (!tab?.url?.startsWith('http')) {
      throw new Error('Navigate to a valid webpage');
    }

    if (!aiManager || aiManager.isAvailable === 'no') {
      throw new Error('AI unavailable. Enable Chrome flags.');
    }

    showStatus('auditStatus', 'Fetching content...', true);
    const content = await getTabContent(tab.id);
    
    if (!content?.text) {
      throw new Error('Could not get page content');
    }

    showStatus('auditStatus', 'Analyzing...', true);
    await aiManager.createSession();

    const prompt = `Analyze this webpage and respond with ONLY valid JSON:
{"dashboard": {"overallScore": 85, "health": "Good", "issues": {"errors": 2, "warnings": 5}, "scores": {"technical": 8.5, "accessibility": 7.0, "performance": 9.0, "security": 8.0, "ux": 7.5, "content": 8.5, "seo": 7.0, "links": 8.0, "conversion": 7.5, "analytics": 6.0, "competitive": 7.0, "mobile": 8.5}}, "markdownReport": "# Audit Report\\n## Technical (8.5/10)\\n**Assessment:** Good\\n**Issues:** None\\n**Recommendations:** Continue"}

Page: ${content.title}
Content: ${content.text.substring(0, 8000)}`;

    const response = await aiManager.prompt(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response');
    
    const result = JSON.parse(jsonMatch[0]);
    if (!result.dashboard || !result.markdownReport) {
      throw new Error('Invalid audit format');
    }

    AppState.auditData = result.dashboard;
    AppState.auditReport = result.markdownReport;

    displayAuditDashboard(result.dashboard);
    showSuccess('✅ Audit complete!');

  } catch (error) {
    console.error('Audit error:', error);
    showError(`Audit failed: ${error.message}`);
  } finally {
    showStatus('auditStatus', '', false);
    if (btn) btn.disabled = false;
  }
}

function displayAuditDashboard(data) {
  const div = document.getElementById('auditorResults');
  if (!div) return;

  const html = `
    <div class="dashboard-container">
      <div class="dashboard-stats">
        <div class="stat-card">
          <div class="stat-label">Score</div>
          <div class="stat-value">${data.overallScore}/100</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Health</div>
          <div class="stat-value">${data.health}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Errors</div>
          <div class="stat-value">${data.issues.errors}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Warnings</div>
          <div class="stat-value">${data.issues.warnings}</div>
        </div>
      </div>
      <div class="scores-section">
        <h3>Scores</h3>
        <div class="score-grid">
          ${Object.entries(data.scores).map(([cat, score]) => `
            <div class="score-item">
              <div>${cat}: ${score.toFixed(1)}/10</div>
              <div class="score-bar" style="width: ${score*10}%; background: #3b82f6;"></div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  div.innerHTML = html;
  div.style.display = 'block';
}

window.initializeAuditor = initializeAuditor;
window.runAudit = runAudit;

// ===========================================
// FILE 4: Add to sidepanel-organizer.js
// ===========================================
// Add this at the TOP of the file:
async function ensureAISession() {
  if (!aiManager || aiManager.isAvailable === 'no') {
    throw new Error('AI unavailable');
  }
  await aiManager.createSession();
}

// Then update organizeTabs():
async function organizeTabs() {
  try {
    await ensureAISession(); // ADD THIS LINE
    
    showStatus('organizerStatus', 'Analyzing tabs...', true);
    const tabs = await chrome.tabs.query({ currentWindow: true });
    // ... rest of your code
  } catch (error) {
    showError(`Failed: ${error.message}`);
  }
}

// ===========================================
// FILE 5: Add to sidepanel-scribe.js
// ===========================================
// Add this at the TOP:
async function ensureAISession() {
  if (!aiManager || aiManager.isAvailable === 'no') {
    throw new Error('AI unavailable');
  }
  await aiManager.createSession();
}

// Then update startScribeRecording():
async function startScribeRecording() {
  try {
    await ensureAISession(); // ADD THIS LINE
    
    AppState.scribeRecording = true;
    showStatus('scribeStatus', 'Recording...', true);
    // ... rest of your code
  } catch (error) {
    showError(`Failed: ${error.message}`);
  }
}

// ===========================================
// IMPLEMENTATION STEPS
// ===========================================
1. Create NEW file: AIManager-fixed.js (copy code from FILE 1 above)
2. Create NEW file: main-fixed.js (copy code from FILE 2 above)
3. Create NEW file: sidepanel-auditor-fixed.js (copy code from FILE 3 above)
4. Update sidepanel-organizer.js - add ensureAISession() function (FILE 4)
5. Update sidepanel-scribe.js - add ensureAISession() function (FILE 5)
6. Update sidepanel.html script tags to load in this order:
   &lt;script src="utils.js"&gt;&lt;/script&gt;
   &lt;script src="AIManager-fixed.js"&gt;&lt;/script&gt;
   &lt;script src="main-fixed.js"&gt;&lt;/script&gt;
   &lt;script src="sidepanel-auditor-fixed.js"&gt;&lt;/script&gt;
   &lt;script src="sidepanel-organizer.js"&gt;&lt;/script&gt;
   &lt;script src="sidepanel-scribe.js"&gt;&lt;/script&gt;
   &lt;script src="sidepanel-chat.js"&gt;&lt;/script&gt;
   &lt;script src="sidepanel-history.js"&gt;&lt;/script&gt;
   &lt;script src="sidepanel-modal.js"&gt;&lt;/script&gt;
   &lt;script src="jspdf.umd.min.js"&gt;&lt;/script&gt;
7. DELETE old files: AIManager.js, main.js, sidepanel-core.js
8. Reload extension in chrome://extensions/
9. Test on example.com

// ===========================================
// CHROME FLAGS (REQUIRED)
// ===========================================
1. Go to: chrome://flags/#prompt-api-for-gemini-nano
   Set to: Enabled

2. Go to: chrome://flags/#optimization-guide-on-device-model
   Set to: Enabled BypassPerfRequirement

3. RESTART Chrome completely

4. Check: chrome://on-device-internals
   Should show model status

// ===========================================
// SUCCESS INDICATORS
// ===========================================
Console should show:
✅ Spectrum AI Pro Enhanced initialized successfully!

NO errors like:
❌ "Identifier 'AIManager' has already been declared"
❌ "MockAIManager is not defined"
❌ "createSession is not a function"
❌ CSP violations
</pre>
</body>
</html>