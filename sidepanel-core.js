// ============================================
// SPECTRUM AI PRO ENHANCED v3.1
// Main JavaScript - Core Functionality
// ============================================

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
    aiSession: null,
    settings: null,
    charts: {}
  };
  
  // ===== AI SESSION MANAGEMENT =====
  class AIManager {
    constructor() {
      this.session = null;
      this.isAvailable = false;
    }
  
    async initialize() {
      try {
        if (!window.ai || !window.ai.languageModel) {
          throw new Error('AI not available');
        }
  
        const capabilities = await window.ai.languageModel.capabilities();
        this.isAvailable = capabilities.available === 'readily';
  
        if (this.isAvailable) {
          this.session = await window.ai.languageModel.create({
            systemPrompt: `You are Spectrum AI Pro, an expert web analysis assistant. Provide accurate, actionable insights based on website content and user data. Be concise, professional, and helpful.`,
            temperature: 0.7,
            topK: 40
          });
          console.log('✅ AI Session initialized');
        }
  
        return this.isAvailable;
      } catch (error) {
        console.error('AI initialization failed:', error);
        this.isAvailable = false;
        return false;
      }
    }
  
    async prompt(message, context = '') {
      if (!this.session) {
        await this.initialize();
      }
  
      if (!this.session) {
        throw new Error('AI not available. Please enable AI features in Chrome flags.');
      }
  
      try {
        const fullPrompt = context ? `${context}\n\nUser Query: ${message}` : message;
        const response = await this.session.prompt(fullPrompt);
        return response || 'No response generated';
      } catch (error) {
        console.error('AI prompt error:', error);
        throw error;
      }
    }
  
    async streamPrompt(message, context = '', onChunk) {
      if (!this.session) {
        await this.initialize();
      }
  
      if (!this.session) {
        throw new Error('AI not available');
      }
  
      try {
        const fullPrompt = context ? `${context}\n\nUser Query: ${message}` : message;
        const stream = await this.session.promptStreaming(fullPrompt);
  
        let fullResponse = '';
        for await (const chunk of stream) {
          fullResponse = chunk;
          if (onChunk) onChunk(chunk);
        }
  
        return fullResponse;
      } catch (error) {
        console.error('AI streaming error:', error);
        throw error;
      }
    }
  
    destroy() {
      if (this.session) {
        this.session.destroy();
        this.session = null;
      }
    }
  }
  
  // ===== INITIALIZE AI MANAGER =====
  const aiManager = new AIManager();
  
  // ===== DOM READY =====
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌈 Spectrum AI Pro Enhanced loading...');
  
    // Initialize AI
    const aiReady = await aiManager.initialize();
    if (!aiReady) {
      showError('AI features are not available. Please enable AI in Chrome settings.', 'warning');
    }
  
    // Load settings
    await loadSettings();
  
    // Initialize UI
    initializeUI();
    initializeTabNavigation();
    initializeViewModes();
    initializeAuditor();
    initializeOrganizer();
    initializeScribe();
    initializeHistory();
    initializeChat();
    initializeModal();
  
    // Listen for messages from service worker
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  
    console.log('✅ Spectrum AI Pro Enhanced ready');
  });
  
  // ===== SETTINGS MANAGEMENT =====
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get('settings');
      AppState.settings = result.settings || {
        aiEnabled: true,
        darkMode: true,
        animations: true,
        autoGroup: false,
        maxHistory: 100,
        screenshotQuality: 0.7
      };
    } catch (error) {
      console.error('Settings load error:', error);
    }
  }
  
  async function saveSettings() {
    try {
      await chrome.storage.local.set({ settings: AppState.settings });
    } catch (error) {
      console.error('Settings save error:', error);
    }
  }
  
  // ===== UI INITIALIZATION =====
  function initializeUI() {
    // Apply dark mode
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
  
        // Update active states
        tabLinks.forEach(l => l.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
  
        link.classList.add('active');
        document.getElementById(tabName)?.classList.add('active');
  
        // Update state and chat visibility
        AppState.currentTab = tabName;
        updateChatVisibility();
  
        // Update results title
        const titles = {
          auditor: '📊 Audit Results',
          organizer: '📂 Tab Organization',
          scribe: '📝 Workflow Documentation',
          history: '🕒 Audit History'
        };
        document.getElementById('resultsTitle').textContent = titles[tabName] || 'Results';
      });
    });
  }
  
  // ===== VIEW MODES =====
  function initializeViewModes() {
    const viewButtons = document.querySelectorAll('.view-mode-btn');
    const container = document.querySelector('.app-container');
  
    viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
  
        viewButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
  
        container.className = 'app-container';
        if (mode === 'split') {
          container.classList.add('view-split');
        } else if (mode === 'results') {
          container.classList.add('view-results');
        } else if (mode === 'chat') {
          container.classList.add('view-chat');
        }
  
        AppState.currentView = mode;
      });
    });
  }
  
  // ===== CHAT VISIBILITY =====
  function updateChatVisibility() {
    const chatContainers = {
      auditor: 'auditorChatContainer',
      organizer: 'organizerChatContainer',
      scribe: 'scribeChatContainer'
    };
  
    Object.entries(chatContainers).forEach(([tab, containerId]) => {
      const container = document.getElementById(containerId);
      if (container) {
        container.style.display = tab === AppState.currentTab ? 'flex' : 'none';
      }
    });
  }
  
  // ===== MESSAGE HANDLER =====
  function handleRuntimeMessage(message, sender, sendResponse) {
    console.log('Received message:', message);
  
    switch (message.type) {
      case 'context-menu-action':
        handleContextMenuAction(message.action);
        break;
      case 'keyboard-command':
        handleKeyboardCommand(message.command);
        break;
      case 'tab-updated':
        handleTabUpdate(message.tabId, message.url);
        break;
    }
  
    sendResponse({ received: true });
    return true;
  }
  
  async function handleContextMenuAction(action) {
    switch (action) {
      case 'run-audit':
        switchToTab('auditor');
        await runAudit();
        break;
      case 'organize-tabs':
        switchToTab('organizer');
        await organizeTabs();
        break;
      case 'start-scribe':
        switchToTab('scribe');
        startScribeRecording();
        break;
    }
  }
  
  async function handleKeyboardCommand(command) {
    switch (command) {
      case 'run-audit':
        switchToTab('auditor');
        await runAudit();
        break;
      case 'organize-tabs':
        switchToTab('organizer');
        await organizeTabs();
        break;
      case 'start-scribe':
        switchToTab('scribe');
        startScribeRecording();
        break;
    }
  }
  
  function handleTabUpdate(tabId, url) {
    if (AppState.scribeRecording) {
      console.log('Tab navigation detected:', url);
      // Re-inject content script if needed
      reinjectScribeContentScript(tabId);
    }
  }
  
  function switchToTab(tabName) {
    const tabLink = document.querySelector(`.tab-link[data-tab="${tabName}"]`);
    if (tabLink) {
      tabLink.click();
    }
  }
  
  // ===== UTILITY FUNCTIONS =====
  function showStatus(elementId, message, show = true) {
    const statusEl = document.getElementById(elementId);
    if (statusEl) {
      if (show) {
        statusEl.style.display = 'flex';
        const textEl = statusEl.querySelector('[id$="StatusText"]');
        if (textEl) textEl.textContent = message;
      } else {
        statusEl.style.display = 'none';
      }
    }
  }
  
  function showError(message, type = 'error') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
  
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
  
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
  
  function showSuccess(message) {
    showError(message, 'success');
  }
  
  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  
  async function getTabContent(tabId) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'get-tab-content',
        tabId: tabId
      });
  
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to get tab content');
      }
    } catch (error) {
      console.error('Get tab content error:', error);
      throw error;
    }
  }
  
  // Export for use in other modules
  window.AppState = AppState;
  window.aiManager = aiManager;
  window.showStatus = showStatus;
  window.showError = showError;
  window.showSuccess = showSuccess;
  window.getCurrentTab = getCurrentTab;
  window.getTabContent = getTabContent;
  