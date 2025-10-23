/**
 * 🏆 SPECTRUM AI PRO V3.2 - ULTIMATE EDITION
 * CSP Fixes, Scribe w/ Screenshots, Contextual Organizer, Connection Fixes
 * Uses self.LanguageModel API (corrected based on environment)
 * Added Chat fixes, Scribe accuracy fixes, Export options, History enhancements, Organizer Content Analysis, Scribe Smart Analysis.
 */

'use strict';

// GLOBAL STATE
let currentAuditReport = '';
let currentAuditUrl = '';
let currentAuditData = null; // Includes scores, issues, report text etc.
let currentTabGroups = [];
let currentScribeSteps = [];
let selectedOrganizerGroup = {
    tabIds: [],
    groupName: null,
    buttonElement: null
};
let isAiAvailable = null; // Track AI availability state

// Cache all DOM elements
const el = {};

function cacheElements() {
    // View Modes
    el.viewBtns = document.querySelectorAll('.view-mode-btn');
    el.wrapper = document.querySelector('.content-wrapper');

    // Tabs
    el.tabs = document.querySelectorAll('.tab-link');
    el.tabPanels = document.querySelectorAll('.tab-content');

    // Header
    el.settingsBtn = document.getElementById('settingsBtn');

    // Results Panel & Toolbar
    el.results = document.getElementById('results');
    el.resultsTitle = document.getElementById('resultsTitle');
    el.copyBtn = document.getElementById('copyReportButton');
    // Export Buttons (Auditor) - MAKE SURE these IDs exist in sidepanel.html results toolbar
    el.exportMarkdownBtn = document.getElementById('exportMarkdownButton'); // Assuming this ID exists now
    el.exportJsonBtn = document.getElementById('exportJsonButton');       // Assuming this ID exists now
    el.exportPdfBtn = document.getElementById('exportPdfButton');         // Assuming this ID exists now
    el.fullscreenBtn = document.getElementById('fullscreenButton');


    // Auditor
    el.auditBtn = document.getElementById('auditButton');
    el.auditStatus = document.getElementById('auditStatus');
    el.auditStatusText = document.getElementById('auditStatusText');
    el.auditLoader = document.getElementById('auditLoader');
    el.aiPanel = document.getElementById('aiActionsPanel');
    el.summBtn = document.getElementById('summarizeButton');
    el.proofBtn = document.getElementById('proofreadButton');
    el.titleBtn = document.getElementById('rewriteTitleButton');
    el.audChat = document.getElementById('auditorChatContainer');
    el.audMsgs = document.getElementById('auditorChatMessages');
    el.audInput = document.getElementById('auditorChatInput');
    el.audSend = document.getElementById('auditorChatSend');

    // Organizer
    el.orgBtn = document.getElementById('organizeTabsButton');
    el.orgStatus = document.getElementById('organizerStatus');
    el.orgStatusText = document.getElementById('organizerStatusText');
    el.orgLoader = document.getElementById('organizerLoader');
    el.orgChat = document.getElementById('organizerChatContainer');
    el.orgMsgs = document.getElementById('organizerChatMessages');
    el.orgInput = document.getElementById('organizerChatInput');
    el.orgSend = document.getElementById('organizerChatSend');
    el.orgActionsPanel = document.getElementById('organizerActionsPanel');
    el.orgActionContext = document.getElementById('organizerActionContext');
    el.summGroupBtn = document.getElementById('summarizeGroupButton');
    el.extractDataBtn = document.getElementById('extractDataButton');
    el.findContactsBtn = document.getElementById('findContactsButton');
    // Organizer Content Analysis Button - MAKE SURE ID 'analyzeContentButton' exists in sidepanel.html
    el.analyzeContentBtn = document.getElementById('analyzeContentButton');


    // Scribe
    el.scribeStart = document.getElementById('startScribeButton');
    el.scribeStop = document.getElementById('stopScribeButton');
    el.scribeStatus = document.getElementById('scribeStatus');
    el.scribeStatusText = document.getElementById('scribeStatusText');
    el.scribeLoader = document.getElementById('scribeLoader');
    el.scribePanel = document.getElementById('scribeActionsPanel');
    el.genBtn = document.getElementById('generalizeWorkflowButton'); // Generalize/Template button
    // Scribe Export & Analysis Buttons - MAKE SURE these IDs exist in sidepanel.html Scribe action panel
    el.scribeExportTextBtn = document.getElementById('scribeExportTextButton'); // Renamed old button ID if needed
    el.scribeExportJsonBtn = document.getElementById('scribeExportJsonButton');
    el.scribeExportPdfBtn = document.getElementById('scribeExportPdfButton');
    el.scribeAnalyzeBtn = document.getElementById('scribeAnalyzeButton'); // Smart Analysis button
    el.scribeChat = document.getElementById('scribeChatContainer');
    el.scribeMsgs = document.getElementById('scribeChatMessages');
    el.scribeInput = document.getElementById('scribeChatInput');
    el.scribeSend = document.getElementById('scribeChatSend');

    // History
    el.histSearch = document.getElementById('historySearchInput');
    el.histClear = document.getElementById('clearHistoryButton');
    // History Export/Import Buttons - MAKE SURE these IDs exist in sidepanel.html History tab
    el.histExportBtn = document.getElementById('historyExportButton');
    el.histImportInput = document.getElementById('historyImportInput'); // <input type="file" style="display:none;">
    el.histImportBtn = document.getElementById('historyImportButton'); // Button to trigger input click
}

// INIT
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Spectrum AI Pro Sidepanel (v3.2) - Starting...');

    cacheElements(); // Cache all elements on load
    setupEventListeners();
    setupMessageListeners();

    showLoadingAnimation();

    isAiAvailable = await checkAI(); // Check AI on load

    if (!isAiAvailable) {
        showError(
            "AI UNAVAILABLE: SETUP REQUIRED",
            "Could not initialize AI features (`self.LanguageModel` not found or not ready).\n\n" + // Corrected object name
            "**Troubleshooting:**\n" +
            "1. Go to `chrome://flags`\n" +
            "2. Enable **BOTH** `#prompt-api-for-gemini-nano` AND `#optimization-guide-on-device-model`.\n" +
            "3. Click the **'Relaunch'** button at the bottom.\n" +
            "4. Ensure Chrome **fully restarts** (Quit and reopen if needed).\n" +
            "5. Check Chrome version (127+ required).\n" +
            "6. Check OS/Hardware requirements & `chrome://components` model status.\n\n" +
            "Click 'Reload Side Panel' after relaunching Chrome."
        );
        disableAiFeatures();
    } else {
         console.log('✅ AI Model Ready!');
         hideLoadingAnimation();
         updateStatus('audit', 'Ready to analyze', 'info');
         updateStatus('organizer', 'Ready to organize', 'info');
         updateStatus('scribe', 'Ready to record', 'info');
         enableAiFeatures();
    }

    console.log('✅ Spectrum AI Pro Sidepanel Ready!');
});

function disableAiFeatures() {
    // Disable primary action buttons if they exist
    if (el.auditBtn) el.auditBtn.disabled = true;
    if (el.orgBtn) el.orgBtn.disabled = true;

    // Disable AI action panels if they exist
    if (el.aiPanel) el.aiPanel.style.display = 'none';
    if (el.orgActionsPanel) el.orgActionsPanel.style.display = 'none';
    if (el.scribePanel) {
        // Keep Scribe panel but disable AI-specific buttons
        if (el.genBtn) el.genBtn.disabled = true;
        if (el.scribeAnalyzeBtn) el.scribeAnalyzeBtn.disabled = true;
        if (el.scribeExportPdfBtn) el.scribeExportPdfBtn.disabled = true;
    }


    // Disable chat inputs/send buttons if they exist
    [el.audInput, el.orgInput, el.scribeInput].forEach(inp => { if (inp) inp.disabled = true; });
    [el.audSend, el.orgSend, el.scribeSend].forEach(btn => { if (btn) btn.disabled = true; });

    // Visual indication
    if (el.auditBtn) el.auditBtn.style.opacity = '0.5';
    if (el.orgBtn) el.orgBtn.style.opacity = '0.5';

     // Hide chat containers
     if (el.audChat) el.audChat.style.display = 'none';
     if (el.orgChat) el.orgChat.style.display = 'none';
     if (el.scribeChat) el.scribeChat.style.display = 'none';

     // Disable export buttons requiring AI data potentially
     if (el.exportJsonBtn) el.exportJsonBtn.style.display = 'none';
     if (el.exportPdfBtn) el.exportPdfBtn.style.display = 'none';
     // Disable scribe json/pdf export if AI might be needed (or library missing)
     if (el.scribeExportJsonBtn) el.scribeExportJsonBtn.style.display = 'none';
     if (el.scribeExportPdfBtn) el.scribeExportPdfBtn.style.display = 'none';
}

function enableAiFeatures() {
    // Enable primary buttons
    if (el.auditBtn) el.auditBtn.disabled = false;
    if (el.orgBtn) el.orgBtn.disabled = false;

    // Scribe AI buttons (assuming panel might be shown later)
    if (el.genBtn) el.genBtn.disabled = false;
    if (el.scribeAnalyzeBtn) el.scribeAnalyzeBtn.disabled = false;
     // Enable PDF export only if jsPDF is loaded
    const pdfLibraryExists = typeof jsPDF !== 'undefined';
    if (el.scribeExportPdfBtn) el.scribeExportPdfBtn.disabled = !pdfLibraryExists;
    if (el.exportPdfBtn) el.exportPdfBtn.disabled = !pdfLibraryExists; // Also for auditor


    // Enable chat (panel display controlled elsewhere)
    [el.audInput, el.orgInput, el.scribeInput].forEach(inp => { if (inp) inp.disabled = false; });
    [el.audSend, el.orgSend, el.scribeSend].forEach(btn => { if (btn) btn.disabled = false; });

    // Reset visual indication
    if (el.auditBtn) el.auditBtn.style.opacity = '1';
    if (el.orgBtn) el.orgBtn.style.opacity = '1';

    // Note: AI action panels (Auditor, Organizer) display is controlled by context (e.g., after audit runs)
    // Export buttons display is controlled by context
}

// EVENT LISTENERS
function setupEventListeners() {
    // View modes
    el.viewBtns?.forEach(btn => {
        btn.addEventListener('click', () => {
            el.viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            if(el.wrapper) {
                el.wrapper.className = 'content-wrapper'; // Reset classes
                if (mode === 'split') el.wrapper.classList.add('split-view');
                else if (mode === 'results') el.wrapper.classList.add('results-only');
                else if (mode === 'chat') el.wrapper.classList.add('chat-only');
            }
        });
    });

    // Tabs
    el.tabs?.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Auditor
    el.auditBtn?.addEventListener('click', runAudit);
    el.summBtn?.addEventListener('click', summarize);
    el.proofBtn?.addEventListener('click', proofread);
    el.titleBtn?.addEventListener('click', rewriteTitle);
    el.audSend?.addEventListener('click', () => chat('auditor'));
    el.audInput?.addEventListener('keypress', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chat('auditor'); } });


    // Organizer
    el.orgBtn?.addEventListener('click', organize);
    el.orgSend?.addEventListener('click', () => chat('organizer'));
    el.orgInput?.addEventListener('keypress', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chat('organizer'); } });
    el.summGroupBtn?.addEventListener('click', () => runOrganizerAction('summarize'));
    el.extractDataBtn?.addEventListener('click', () => runOrganizerAction('extract'));
    el.findContactsBtn?.addEventListener('click', () => runOrganizerAction('contacts'));
    el.analyzeContentBtn?.addEventListener('click', () => runOrganizerAction('analyzeContent')); // New Action


    // Scribe
    el.scribeStart?.addEventListener('click', startScribe);
    el.scribeStop?.addEventListener('click', stopScribe);
    el.genBtn?.addEventListener('click', generalize); // Generalize/Template
    el.scribeAnalyzeBtn?.addEventListener('click', analyzeWorkflow); // Smart Analysis
    el.scribeSend?.addEventListener('click', () => chat('scribe'));
    el.scribeInput?.addEventListener('keypress', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chat('scribe'); } });
    // Scribe Exports
    el.scribeExportTextBtn?.addEventListener('click', exportScribeText);
    el.scribeExportJsonBtn?.addEventListener('click', exportScribeJson);
    el.scribeExportPdfBtn?.addEventListener('click', exportScribePdf);


    // History
    el.histSearch?.addEventListener('input', searchHist);
    el.histClear?.addEventListener('click', clearHist);
    el.histExportBtn?.addEventListener('click', exportHistory);
    el.histImportBtn?.addEventListener('click', () => el.histImportInput?.click()); // Trigger file input click
    el.histImportInput?.addEventListener('change', importHistory);


    // Toolbar Exports (Auditor)
    el.copyBtn?.addEventListener('click', copyReport);
    el.exportMarkdownBtn?.addEventListener('click', exportAuditMarkdown); // Changed name
    el.exportJsonBtn?.addEventListener('click', exportAuditJson);     // New
    el.exportPdfBtn?.addEventListener('click', exportAuditPdf);         // New
    // Other Toolbar items
    el.fullscreenBtn?.addEventListener('click', toggleFullscreen);
    el.settingsBtn?.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
}

// Listen for messages from the service worker
function setupMessageListeners() {
     chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Prevent listening to messages from self (content scripts)
        if (sender.tab) {
             return false;
        }
        console.log('[Sidepanel] Received message from SW:', request.action);

        let isAsync = false; // Flag for async operations

        switch(request.action) {
            case 'scribeRecordingStopped':
                currentScribeSteps = request.steps || []; // Ensure steps is an array
                isAsync = true; // handleScribeStopUI is async
                handleScribeStopUI().then(() => sendResponse({ received: true }));
                break;
            case 'scribeStartFailed':
                showError("Scribe Failed", `Could not start recording: ${request.error}`);
                if (el.scribeStart) el.scribeStart.style.display = 'block';
                if (el.scribeStop) {
                    el.scribeStop.style.display = 'none';
                    el.scribeStop.style.animation = 'none';
                }
                updateStatus('scribe', 'Start Failed', 'error');
                loader('scribe', false);
                break;
            case 'triggerAudit':
                 isAsync = true;
                 (async () => {
                     // isAiAvailable will be checked inside runAudit
                     switchTab('auditor');
                     await runAudit(); // runAudit handles UI updates and AI check
                     sendResponse({ received: true });
                 })();
                 break;
            case 'startScribeRecording':
                // Only switch tab, startScribe will handle the logic
                switchTab('scribe');
                startScribe(); // This sends a message back to SW
                // No sendResponse here, let startScribe handle it? Or send sync? Let's send sync.
                break;
            case 'organizeTabs':
                isAsync = true;
                 (async () => {
                     // isAiAvailable will be checked inside organize
                     switchTab('organizer');
                     await organize(); // organize handles UI updates and AI check
                     sendResponse({ received: true });
                 })();
                 break;
            default:
                 console.warn("[Sidepanel] Received unhandled message:", request.action);
                 return false; // Indicate not handled
        }

        // Send response now if not explicitly async handled above
        if (!isAsync) {
            sendResponse({ received: true });
        }
        return isAsync; // Return true only if we started an async operation and handle sendResponse there
    });
}


function switchTab(name) {
    el.tabs?.forEach(t => {
        const active = t.dataset.tab === name;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active);
    });
    el.tabPanels?.forEach(p => {
        const active = p.id === name;
        if(p) { // Check if element exists
             p.classList.toggle('active', active);
             p.hidden = !active;
        }
    });

    // Update results title
    const titles = {
        auditor: '📊 Audit Report & Insights',
        organizer: '📂 Tab Groups & Analysis',
        scribe: '📝 Workflow Guide',
        history: '🕒 Audit History'
    };
    if (el.resultsTitle) el.resultsTitle.textContent = titles[name] || '📊 Results & Reports';

    // Update visibility of context-dependent elements
    updateElementVisibility(name);


    if (name === 'history') {
        loadHist(); // Load history when switching to the tab
    }
}

// Helper function to manage visibility of context-specific UI elements
function updateElementVisibility(activeTabName) {
    const showAuditElements = activeTabName === 'auditor' && currentAuditReport && currentAuditData;
    const showScribeElements = activeTabName === 'scribe' && currentScribeSteps.length > 0;
    const showOrgElements = activeTabName === 'organizer' && currentTabGroups.length > 0; // Show if groups exist
    const showOrgActions = showOrgElements && selectedOrganizerGroup.tabIds.length > 0; // Show if group selected
    const showHistoryElements = activeTabName === 'history';
    const pdfLibraryExists = typeof jsPDF !== 'undefined';


    // Auditor specific
    if (el.aiPanel) el.aiPanel.style.display = showAuditElements && isAiAvailable ? 'block' : 'none';
    if (el.audChat) el.audChat.style.display = showAuditElements ? 'block' : 'none';
    if (el.copyBtn) el.copyBtn.style.display = showAuditElements ? 'block' : 'none';
    if (el.exportMarkdownBtn) el.exportMarkdownBtn.style.display = showAuditElements ? 'block' : 'none';
    if (el.exportJsonBtn) el.exportJsonBtn.style.display = showAuditElements ? 'block' : 'none';
    if (el.exportPdfBtn) {
         el.exportPdfBtn.style.display = showAuditElements ? 'block' : 'none';
         el.exportPdfBtn.disabled = !pdfLibraryExists; // Disable if library missing
    }


    // Scribe specific
    if (el.scribePanel) el.scribePanel.style.display = showScribeElements ? 'block' : 'none'; // Show actions if steps exist
    if (el.scribeChat) el.scribeChat.style.display = showScribeElements ? 'block' : 'none'; // Show chat if steps exist
    // Enable/disable AI buttons within Scribe panel based on AI status
    if (el.scribePanel && el.scribePanel.style.display === 'block') {
        if (el.genBtn) el.genBtn.disabled = !isAiAvailable;
        if (el.scribeAnalyzeBtn) el.scribeAnalyzeBtn.disabled = !isAiAvailable;
        if (el.scribeExportPdfBtn) el.scribeExportPdfBtn.disabled = !pdfLibraryExists;
         // Ensure non-AI export buttons are always enabled if panel is shown
         if (el.scribeExportTextBtn) el.scribeExportTextBtn.disabled = false;
         if (el.scribeExportJsonBtn) el.scribeExportJsonBtn.disabled = false;
    }


    // Organizer specific
    if (el.orgChat) el.orgChat.style.display = showOrgElements ? 'block' : 'none'; // Show chat if groups exist
    if (el.orgActionsPanel) el.orgActionsPanel.style.display = showOrgActions ? 'block' : 'none'; // Show context actions only if group selected
    // Enable/disable AI buttons within Org panel based on AI status and group selection
    if (el.orgActionsPanel && el.orgActionsPanel.style.display === 'block') {
         if(el.summGroupBtn) el.summGroupBtn.disabled = !isAiAvailable;
         if(el.extractDataBtn) el.extractDataBtn.disabled = !isAiAvailable;
         if(el.findContactsBtn) el.findContactsBtn.disabled = !isAiAvailable;
         if(el.analyzeContentBtn) el.analyzeContentBtn.disabled = !isAiAvailable;
    }

     // History specific buttons
     if (el.histExportBtn) el.histExportBtn.style.display = showHistoryElements ? 'inline-block' : 'none';
     if (el.histImportBtn) el.histImportBtn.style.display = showHistoryElements ? 'inline-block' : 'none';
     // Hide file input itself always
     if (el.histImportInput) el.histImportInput.style.display = 'none';


    // Disable Chat inputs if AI is off, even if container is visible
    // But keep enabled if AI check passed, let individual functions disable during processing
    const chatInputDisabled = !isAiAvailable;
    if (el.audInput) el.audInput.disabled = chatInputDisabled;
    if (el.audSend) el.audSend.disabled = chatInputDisabled;
    if (el.orgInput) el.orgInput.disabled = chatInputDisabled;
    if (el.orgSend) el.orgSend.disabled = chatInputDisabled;
    if (el.scribeInput) el.scribeInput.disabled = chatInputDisabled;
    if (el.scribeSend) el.scribeSend.disabled = chatInputDisabled;

    // Show initial message in chat if AI is disabled
    if(!isAiAvailable) {
        if(el.audChat && el.audChat.style.display === 'block' && el.audMsgs && !el.audMsgs.hasChildNodes()) addChatMessage(el.audMsgs, 'AI chat unavailable.', 'error');
        if(el.orgChat && el.orgChat.style.display === 'block' && el.orgMsgs && !el.orgMsgs.hasChildNodes()) addChatMessage(el.orgMsgs, 'AI chat unavailable.', 'error');
        if(el.scribeChat && el.scribeChat.style.display === 'block' && el.scribeMsgs && !el.scribeMsgs.hasChildNodes()) addChatMessage(el.scribeMsgs, 'AI chat unavailable.', 'error');
    }
}


// Final check function based on console logs
async function checkAI() {
    console.log("[checkAI] Running check...");
    const LangModelCapExists = typeof self.LanguageModel !== 'undefined';
    console.log(`[checkAI] self.LanguageModel exists = ${LangModelCapExists} (type: ${typeof self.LanguageModel})`);

    if (!LangModelCapExists) {
        console.error("[checkAI] FAILED: self.LanguageModel is undefined.");
        return false;
    }

    try {
        console.log("[checkAI] Trying availability()...");
        const availability = await self.LanguageModel.availability();
        console.log("[checkAI] Availability status:", availability);
        if (availability === 'no' || availability === 'unavailable') {
            console.error("[checkAI] Availability check returned 'no' or 'unavailable'.");
            return false;
        }

        console.log("[checkAI] Trying self.LanguageModel.create() test...");
        const s = await self.LanguageModel.create({ outputLanguage: 'en' });
        await s.destroy();
        console.log("[checkAI] self.LanguageModel.create() test successful.");
        return true; // Return true only if all checks pass
    } catch (e) {
        console.error("[checkAI] Error during availability/create check:", e);
        return false;
    }
}

// Final createSession function based on console logs
async function createSession() {
    // Ensure isAiAvailable is explicitly true before proceeding
    if (isAiAvailable !== true) {
         console.warn("[createSession] AI state is not true. Re-checking...");
         if (!await checkAI()) {
              isAiAvailable = false;
              throw new Error("AI Language Model is not available after re-check.");
         }
         console.log("[createSession] AI availability confirmed on re-check.");
         isAiAvailable = true;
    }

    try {
        // Log the state RIGHT BEFORE the create call
        const modelObject = self.LanguageModel;
        const modelType = typeof modelObject;
        const createType = typeof modelObject?.create;
        console.log(`[createSession] PRE-CREATE CHECK: typeof self.LanguageModel = ${modelType}, typeof self.LanguageModel.create = ${createType}`);

         // Final check just before creating
         if (createType !== 'function') {
             isAiAvailable = false;
             console.error("[createSession] FINAL CHECK FAILED: self.LanguageModel.create is not a function just before calling it.");
             throw new Error("AI Language Model API structure invalid: self.LanguageModel.create is not a function.");
         }

        // Proceed to create
        console.log("[createSession] Final check passed. Attempting self.LanguageModel.create()...");
        const session = await modelObject.create({
            systemPrompt: 'You are a professional, helpful, and concise web analyst and assistant.',
            outputLanguage: 'en'
        });
        console.log("[createSession] Session created successfully via self.LanguageModel.create().");
        return session;
    } catch (e) {
        console.error("[createSession] Failed to create AI session:", e.message, e.name);
        isAiAvailable = false;
        let errorDetails = e.message;
        if (e.name === 'NotSupportedError') {
             errorDetails += " Model download might be pending or failed. Check components.";
        }
        if (el.results && !el.results.querySelector('.placeholder.error')) {
             showError("AI Session Error", `Could not create AI session: ${errorDetails}`);
        } else if (!el.results) {
             console.error("el.results is not defined, cannot show error in UI.");
        }
        throw e;
    }
}


// --- AUDITOR --- (Chat visibility fixed, Export added)
async function runAudit() {
    isAiAvailable = await checkAI(); // Re-check AI just before running
    if (!isAiAvailable) {
        showError("AI Unavailable", "Cannot run audit. Please enable AI features via chrome://flags and relaunch Chrome.");
        return;
    }

    if (el.auditBtn) el.auditBtn.disabled = true;
    loader('audit', true);
    updateStatus('audit', 'Fetching content...', 'info');
    if (el.results) el.results.innerHTML = ''; // Clear results
    if (el.audMsgs) el.audMsgs.innerHTML = ''; // Clear previous chat messages
    if (el.audChat) el.audChat.style.display = 'none'; // Hide chat initially
    currentAuditReport = ''; // Reset state
    currentAuditData = null;
    currentAuditUrl = ''; // Reset URL

    try {
        const { content, url } = await getPage();
        currentAuditUrl = url; // Store URL
        if (!content?.trim()) throw new Error('Page content is empty or cannot be accessed.');

        updateStatus('audit', 'Analyzing with AI...', 'info');
        const data = await analyze(content.substring(0, 10000)); // Uses createSession
        currentAuditReport = data.report;
        currentAuditData = data; // Store all data including scores, etc.

        await renderDash(data); // Render the dashboard

        // Update UI after successful audit
        updateElementVisibility('auditor'); // Use helper to show/hide relevant elements

        updateStatus('audit', '✅ Complete!', 'success');
        showToast('Audit Complete', 'Analysis finished successfully!', 'success');
        await saveAudit(url, data.report, data); // Save all data
    } catch (err) {
        console.error("Audit failed:", err);
        updateStatus('audit', `Error: ${err.message}`, 'error');
        // Clear data on failure
        currentAuditReport = '';
        currentAuditData = null;
        currentAuditUrl = '';
        if (err.message.includes("AI") || err.message.includes("languageModel") || err.message.includes("session")) {
             showError("AI Error during Audit", err.message);
        } else {
             showError("Audit Failed", err.message);
        }
        // Ensure UI is hidden on failure
        updateElementVisibility('auditor'); // Will hide elements as currentAuditReport is empty
    } finally {
        if (el.auditBtn) el.auditBtn.disabled = false;
        loader('audit', false);
    }
}

// --- ANALYZE (Helper for Auditor) ---
async function analyze(content) {
    let session = null;
    let data = fallback(); // Start with fallback data structure

     try {
         session = await createSession(); // Uses self.LanguageModel.create() now

         const dataPrompt = `Analyze this website content and return ONLY a single valid JSON object.
Do not include any other text before or after the JSON.
The JSON structure should be exactly:
{"score": <number>,"health": <number>,"scores":{"tech":<number>,"a11y":<number>,"perf":<number>,"sec":<number>,"ux":<number>,"content":<number>,"seo":<number>,"links":<number>,"conv":<number>,"analytics":<number>,"comp":<number>,"mobile":<number>},"issues":{"errors":<number>,"warnings":<number>,"notices":<number>}}
Assign reasonable integer scores between 0 and 10 for sub-scores, and calculate overall scores between 0 and 100 based on a balanced weighting. Calculate health score based primarily on errors/warnings/notices. Infer scores based *only* on the provided text snippet.

Content Snippet for Scoring:
${content.substring(0, 2000)}

Return ONLY the valid JSON object.`;

         try {
            console.log("[analyze] Prompting AI for JSON data...");
            const resData = await session.prompt(dataPrompt);
            console.log("[analyze] AI JSON Response (raw):", resData);
            const jsonMatch = resData.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No valid JSON object found in AI response for scores.');
            const parsedData = JSON.parse(jsonMatch[0]);
             // More robust validation
             if (typeof parsedData.score !== 'number' || typeof parsedData.health !== 'number' || typeof parsedData.scores?.tech !== 'number' || typeof parsedData.issues?.errors !== 'number') {
                  throw new Error('Parsed JSON data is missing required fields or has incorrect types.');
             }
             data = parsedData; // Overwrite fallback with parsed data
             console.log("[analyze] Parsed AI JSON data:", data);
         } catch (e) {
            console.error('[analyze] AI data prompt/parse failed, using fallback.', e);
            // data already initialized with fallback
            data.report = fallback().report + `\n\nError generating JSON data: ${e.message}`; // Add error to report
         }

        // Close session used for JSON prompt before starting report prompt
        if (session) {
            try { await session.destroy(); console.log("[analyze] JSON session destroyed."); }
            catch (e) { console.warn("[analyze] Error destroying JSON session:", e); }
            session = null; // Ensure it's null
        }
        // Create a new session for the report prompt
        session = await createSession();

        // Construct report prompt using potentially fallback data
        const scores = data.scores || fallback().scores; // Ensure scores exist
        const reportPrompt = `You are a professional web analyst. Conduct a comprehensive 12-point website audit based ONLY on the provided content snippet. Format response in clean Markdown. For each point, use the pre-calculated score, provide a brief assessment, key issues found (infer from content), and actionable recommendations. Be concise.

Content Snippet:
${content.substring(0, 8000)}

Pre-calculated Scores (Use these):
Technical: ${scores.tech}/10, Accessibility: ${scores.a11y}/10, Performance: ${scores.perf}/10, Security: ${scores.sec}/10, UX Design: ${scores.ux}/10, Content: ${scores.content}/10, SEO: ${scores.seo}/10, Links: ${scores.links}/10, Conversion: ${scores.conv}/10, Analytics: ${scores.analytics}/10, Competitive: ${scores.comp}/10, Mobile: ${scores.mobile}/10

Required Format (Strictly follow this Markdown structure):
# 📊 Spectrum AI Audit Report
## 🏆 Executive Summary
[Your concise overall summary based *only* on the content snippet and scores]

## 🔧 1. Technical [${scores.tech}/10]
### Assessment: [Brief assessment]
### Issues: \n- [Issue 1 (inferred)]\n- [Issue 2 (inferred)]
### Recommendations: \n- [Recommendation 1]\n- [Recommendation 2]

## ♿ 2. Accessibility [${scores.a11y}/10]
### Assessment: ...
### Issues: \n- ...
### Recommendations: \n- ...

(Continue for all 12 points: Performance[${scores.perf}/10], Security[${scores.sec}/10], UX Design[${scores.ux}/10], Content[${scores.content}/10], SEO[${scores.seo}/10], Links[${scores.links}/10], Conversion[${scores.conv}/10], Analytics[${scores.analytics}/10], Competitive[${scores.comp}/10], Mobile[${scores.mobile}/10])

Ensure every section follows the Assessment/Issues/Recommendations structure.`;

         try {
            console.log("[analyze] Prompting AI for Markdown report...");
            const reportText = await session.prompt(reportPrompt);
            console.log("[analyze] AI Markdown Report received (snippet):", reportText.substring(0, 200));
            // Basic validation for report structure
            if (!reportText || !reportText.includes("Executive Summary") || !reportText.includes("Technical")) {
                console.warn("[analyze] Generated report might be incomplete or malformed.");
                 data.report = (data.report || fallback().report) + `\n\nWarning: Generated report structure seems incomplete.`;
            } else {
                 data.report = reportText; // Assign successfully generated report
            }
         } catch (e) {
             console.error('[analyze] AI report generation failed, using fallback.', e);
             data.report = (data.report || fallback().report) + `\n\nError generating detailed report: ${e.message}`;
         }
         return data; // Return combined data

     } catch (aiError) {
         console.error("[analyze] AI analysis step failed:", aiError);
          // Return fallback data with error message in report
         data.report = fallback().report + `\n\nAI analysis error: ${aiError.message}`;
         return data; // Return fallback structure
     } finally {
         if (session) {
             try { await session.destroy(); console.log("[analyze] Report session destroyed."); }
             catch (destroyError) { console.warn("[analyze] Error destroying report session:", destroyError); }
         }
     }
}

// --- DASHBOARD RENDERING --- (No changes needed)
function fallback() { /* ... */ }
async function renderDash(d) { /* ... */ }
function donut(i) { /* ... */ }
function healthDonut(s) { /* ... */ }
function breakdown(s) { /* ... */ }
function lvl(s) { /* ... */ }
function grade(s) { /* ... */ }
function hlth(s) { /* ... */ }
function scColor(s) { /* ... */ }
function renderMarkdown(md) { /* ... */ }

// --- AUDITOR AI ACTIONS --- (No changes needed)
async function summarize() { /* ... */ }
async function proofread() { /* ... */ }
async function rewriteTitle() { /* ... */ }

// Generic AI Action function (Used by Auditor, Organizer, Scribe)
async function aiAction(prompt, msg, type) {
    // No need to re-check isAiAvailable here, calling functions should do it
    loader(type, true);
    updateStatus(type, msg + '...', 'info');
    let session = null;
    try {
        session = await createSession(); // Uses self.LanguageModel.create()
        const res = await session.prompt(prompt);

        if (el.results) {
            // Append result to existing content in results panel
            const resultsContainer = document.getElementById('results');
            const actionResultDiv = document.createElement('div');
            actionResultDiv.className = 'dashboard-card ai-action-result'; // Add specific class
            actionResultDiv.style.marginTop = '20px';
            actionResultDiv.style.animation = 'slideInUp 0.4s ease';
            actionResultDiv.innerHTML = `
                <h3 style="color:var(--text-primary);">${msg}</h3>
                <div style="color:var(--text-secondary); line-height:1.8; white-space:pre-wrap; max-height: 400px; overflow-y: auto;">${renderMarkdown(res)}</div>
             `;
             // Insert after specific elements depending on the type
             let insertAfterElement = null;
             if (type === 'auditor') insertAfterElement = resultsContainer.querySelector('.dashboard-container');
             else if (type === 'organizer') insertAfterElement = resultsContainer.querySelector('.organizer-groups-container');
             else if (type === 'scribe') insertAfterElement = resultsContainer.querySelector('.scribe-guide-container'); // Assuming guide has a container

             if (insertAfterElement && insertAfterElement.nextSibling) {
                 resultsContainer.insertBefore(actionResultDiv, insertAfterElement.nextSibling);
             } else if (insertAfterElement) {
                 resultsContainer.appendChild(actionResultDiv); // Append if it was the last element
             }
              else {
                 resultsContainer.appendChild(actionResultDiv); // Append if no specific element found
             }

             actionResultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        updateStatus(type, `${msg} Complete!`, 'success');
    } catch (err) {
        console.error(`AI action "${msg}" failed:`, err);
        updateStatus(type, `${msg} Failed: ${err.message}`, 'error');
        showError(`AI Action Failed: ${msg}`, err.message);
    } finally {
        loader(type, false);
        if (session) {
             try { await session.destroy(); } catch (e) { console.warn("Error destroying session in aiAction:", e); }
        }
    }
}


// --- ORGANIZER --- (Chat visibility fixed, New Action added)
async function organize() {
    isAiAvailable = await checkAI(); // Re-check AI
    if (!isAiAvailable) {
        showError("AI Unavailable", "Cannot organize tabs. Please enable AI features.");
        return;
    }

    if(el.orgBtn) el.orgBtn.disabled = true;
    loader('organizer', true);
    updateStatus('organizer', 'Analyzing tabs...', 'info');
    if(el.results) el.results.innerHTML = ''; // Clear results
    if(el.orgMsgs) el.orgMsgs.innerHTML = ''; // Clear chat
    if(el.orgChat) el.orgChat.style.display = 'none'; // Hide chat
    currentTabGroups = []; // Reset state
    selectedOrganizerGroup = { tabIds: [], groupName: null, buttonElement: null };
    disableOrganizerActions();

    let session = null;
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true, windowType: 'normal' });
        if (tabs.length < 2) {
            updateStatus('organizer', 'Need 2+ tabs in current window', 'warning');
            if(el.results) el.results.innerHTML = `<div class="placeholder" style="animation: fadeIn 0.5s ease;"><div style="font-size:64px;">📂</div><h2>Not Enough Tabs</h2><p>Open at least 2 tabs in this window to organize</p></div>`;
            throw new Error('Not enough tabs');
        }

        const valid = tabs.filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('about:'));
        if (valid.length === 0) throw new Error('No valid tabs to organize in this window');

        updateStatus('organizer', 'Grouping with AI...', 'info');
        const info = valid.map(t => `ID ${t.id}: "${t.title || 'Untitled'}" - ${t.url ? new URL(t.url).hostname : 'N/A'}`).join('\n');
        // Added confidence scoring request to prompt (experimental)
        const prompt = `Organize the following browser tabs into logical groups based on their titles and URLs. Assign a short, descriptive name for each group (max 3 words). Also provide a confidence score (0-100) indicating how certain you are about the grouping. Return ONLY a valid JSON array. Each object in the array should have "groupName" (string), "tabIds" (array of numbers), and "confidence" (number). Group unrelated tabs into a "Miscellaneous" group if necessary.

Tabs:
${info}

Return ONLY the JSON array like: [{"groupName":"Example Research","tabIds":[123, 456], "confidence": 90},{"groupName":"Social Media","tabIds":[789], "confidence": 95}]`;

        session = await createSession();
        const res = await session.prompt(prompt);
         console.log("[organize] AI Organizer Response (raw):", res);

        let groups = [];
        try {
            const jsonMatch = res.match(/\[\s*\{[\s\S]*?\}\s*\]/);
            if (!jsonMatch) throw new Error('No valid JSON array found in response.');
            groups = JSON.parse(jsonMatch[0]);
             // Validate structure including confidence (optional)
             if (!Array.isArray(groups) || groups.some(g => typeof g.groupName !== 'string' || !Array.isArray(g.tabIds) || g.tabIds.some(id => typeof id !== 'number'))) {
                 console.warn("[organize] Parsed JSON missing fields or has wrong types (confidence optional).")
                 // Accept if basic structure is okay, confidence might be missing
                 if (groups.some(g => typeof g.groupName !== 'string' || !Array.isArray(g.tabIds))) {
                     throw new Error('Parsed JSON does not match expected group structure (name/tabIds).');
                 }
             }
        } catch (parseError) {
             console.error("[organize] Failed to parse AI Organizer response:", parseError, "Response:", res);
             throw new Error(`AI returned an invalid format: ${parseError.message}`);
        }

        currentTabGroups = groups;
        await showGroups(groups, valid); // Display groups

        updateElementVisibility('organizer'); // Show chat container

        updateStatus('organizer', '✅ Complete!', 'success');
        showToast('Tabs Organized', `Created ${groups.length} suggested groups!`, 'success');
    } catch (err) {
        console.error("[organize] Organizer failed:", err);
        updateStatus('organizer', `Error: ${err.message}`, 'error');
        if (err.message !== 'Not enough tabs' && err.message !== 'No valid tabs to organize in this window') {
             showError("Organizer Failed", err.message);
        }
         updateElementVisibility('organizer'); // Hide chat on error
    } finally {
        if(el.orgBtn) el.orgBtn.disabled = false;
        loader('organizer', false);
        if (session) {
             try { await session.destroy(); } catch (e) { console.warn("[organize] Error destroying session:", e); }
        }
    }
}
async function showGroups(groups, tabs) {
    if (!el.results) return;
    if (groups.length === 0) {
        el.results.innerHTML = `<div class="placeholder"><div style="font-size:64px;">📂</div><h2>No Groups Suggested</h2><p>The AI could not group the current tabs.</p></div>`;
        return;
    }

    el.results.innerHTML = '<div class="loader" style="display: block; margin: 100px auto;"></div>';
    await new Promise(resolve => setTimeout(resolve, 100));

    // Add a container for easier selection later
    let html = '<div class="organizer-groups-container" style="padding: 0;">';
    groups.forEach((g, i) => {
        const delay = 0.1 + (i * 0.1);
        const validTabIds = g.tabIds.filter(id => tabs.some(t => t.id === id));
        if (validTabIds.length === 0) {
            console.warn(`[showGroups] Group "${g.groupName}" has no matching valid tabs. Skipping display.`);
            return;
        }

        // Display confidence score if available
        const confidenceHtml = typeof g.confidence === 'number'
            ? `<span class="confidence-score" title="AI Confidence">${g.confidence}%</span>`
            : '';

        html += `<div class="organizer-group" style="animation: slideInUp 0.5s ease ${delay}s backwards; cursor: pointer;"
                     data-group-name="${esc(g.groupName)}"
                     data-tab-ids='${JSON.stringify(validTabIds)}' data-group-index="${i}">
            <div class="organizer-group-header">
                <h3><span>📁</span> ${esc(g.groupName)} ${confidenceHtml}</h3>
                <span>${validTabIds.length} tabs</span>
            </div>
            <ul>`;
        validTabIds.forEach((id, idx) => {
            const t = tabs.find(x => x.id === id);
            if (t) {
                const itemDelay = delay + 0.2 + (idx * 0.03);
                html += `<li style="animation: slideInLeft 0.4s ease ${itemDelay}s backwards;">
                    <img src="${t.favIconUrl || 'icons/icon16.png'}" width="16" height="16" alt="" style="flex-shrink: 0;" loading="lazy">
                    <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(t.title)}">${esc(t.title)}</span>
                </li>`;
            }
        });
        html += `</ul>
            <button class="primary-button create-grp" data-group-index="${i}" style="animation: scaleIn 0.4s ease ${delay + 0.4}s backwards; margin-top: 10px;">
                ✨ Create This Tab Group
            </button>
        </div>`;
    });
    html += '</div>';
    el.results.innerHTML = html;

    // --- Re-implement Listeners ---
    el.results.querySelectorAll('.create-grp').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            this.disabled = true; this.innerHTML = '⏳ Creating...';
            const originalIndex = parseInt(this.dataset.groupIndex);
            if (!isNaN(originalIndex)) {
                await createGroup(originalIndex);
                this.innerHTML = '✅ Created!';
                 setTimeout(() => { this.disabled = false; this.innerHTML = '✨ Create This Tab Group'; }, 1500);
            } else {
                 console.error("[showGroups] Could not find group index for button."); this.innerHTML = 'Error';
                 this.disabled = false;
            }
        });
    });

    el.results.querySelectorAll('.organizer-group').forEach((card) => {
        card.addEventListener('click', function() {
            if (selectedOrganizerGroup.buttonElement) {
                selectedOrganizerGroup.buttonElement.style.borderColor = 'var(--border)';
                selectedOrganizerGroup.buttonElement.style.boxShadow = 'var(--shadow-md)';
            }
            this.style.borderColor = 'var(--accent)';
            this.style.boxShadow = '0 0 0 3px var(--accent-light)';
            selectedOrganizerGroup = {
                tabIds: JSON.parse(this.dataset.tabIds),
                groupName: this.dataset.groupName,
                buttonElement: this
            };
            updateElementVisibility('organizer');
            if(el.orgActionContext) el.orgActionContext.textContent = `Actions for "${selectedOrganizerGroup.groupName}" (${selectedOrganizerGroup.tabIds.length} tabs):`;
            if (!isAiAvailable && el.orgActionContext) {
                 el.orgActionContext.textContent += " (AI Unavailable)";
            }
        });
    });
}
async function createGroup(originalIndex) { /* ... (no changes needed here) ... */ }
function disableOrganizerActions() { /* ... (no changes needed here) ... */ }

// Updated Organizer Action runner
async function runOrganizerAction(actionType) {
    if (!isAiAvailable) return showError("AI Unavailable", "Cannot perform organizer action.");
    if (selectedOrganizerGroup.tabIds.length === 0) {
        showToast('No Group Selected', 'Click a group card to select it first.', 'warning');
        return;
    }

    loader('organizer', true);
    updateStatus('organizer', `Fetching content for "${selectedOrganizerGroup.groupName}"...`, 'info');
    let session = null;
    let title = `AI Action for "${selectedOrganizerGroup.groupName}"`; // Default title
    try {
        // Send message to service worker to get content
        const response = await chrome.runtime.sendMessage({
            action: 'getTabGroupContent',
            tabIds: selectedOrganizerGroup.tabIds
        });

        const combinedContent = response?.combinedContent;
        if (!combinedContent) throw new Error('Could not retrieve content from tabs. They might be closed or inaccessible.');

        updateStatus('organizer', `Analyzing with AI (${actionType})...`, 'info');
        let prompt = '';

        // Define prompts based on actionType
        switch (actionType) {
            case 'summarize':
                title = `Summary for "${selectedOrganizerGroup.groupName}"`;
                prompt = `Create a concise summary (2-4 bullet points) highlighting the main themes and key information from the following combined content of ${selectedOrganizerGroup.tabIds.length} web pages related to "${selectedOrganizerGroup.groupName}". Use markdown format.\n\nCombined Content:\n${combinedContent.substring(0, 8000)}\n\nSummary:`;
                break;
            case 'extract':
                title = `Key Data from "${selectedOrganizerGroup.groupName}"`;
                prompt = `Extract key data points (like statistics, names, sources, specific facts, definitions) from the following combined content related to "${selectedOrganizerGroup.groupName}". Format as clearly labeled markdown bullet points.\n\nCombined Content:\n${combinedContent.substring(0, 8000)}\n\nExtracted Data:`;
                break;
            case 'contacts':
                title = `Contacts found in "${selectedOrganizerGroup.groupName}"`;
                prompt = `Scan the following combined text for potential contact information (email addresses, phone numbers, LinkedIn URLs, names clearly associated with contact details). List findings as markdown bullet points. If none are found, state "No specific contacts found."\n\nCombined Content:\n${combinedContent.substring(0, 8000)}\n\nContacts Found:`;
                break;
             case 'analyzeContent': // New Action
                 title = `Content Analysis for "${selectedOrganizerGroup.groupName}"`;
                 prompt = `Perform a comprehensive content analysis on the following combined text from ${selectedOrganizerGroup.tabIds.length} web pages related to "${selectedOrganizerGroup.groupName}". Identify the main topics, overall sentiment, key arguments or points, and potential biases. Format the response clearly using markdown headings and bullet points.\n\nCombined Content:\n${combinedContent.substring(0, 8000)}\n\nContent Analysis:`;
                 break;
            default:
                throw new Error(`Unknown organizer action type: ${actionType}`);
        }


        session = await createSession(); // Uses self.LanguageModel.create()
        const res = await session.prompt(prompt);

        // Display results below the groups (uses aiAction's logic now)
         if (el.results) {
            const resultsContainer = document.getElementById('results');
            const actionResultDiv = document.createElement('div');
            actionResultDiv.className = 'dashboard-card ai-action-result';
            actionResultDiv.style.marginTop = '20px';
            actionResultDiv.style.animation = 'slideInUp 0.4s ease';
            actionResultDiv.innerHTML = `
                <h3 style="color:var(--text-primary);">${title}</h3>
                <div style="color:var(--text-secondary); line-height:1.8; white-space:pre-wrap; max-height: 400px; overflow-y: auto;">${renderMarkdown(res)}</div>
             `;
             const groupContainer = resultsContainer.querySelector('.organizer-groups-container');
             if (groupContainer && groupContainer.nextSibling) {
                 resultsContainer.insertBefore(actionResultDiv, groupContainer.nextSibling);
             } else if (groupContainer) {
                 resultsContainer.appendChild(actionResultDiv);
             } else {
                 resultsContainer.appendChild(actionResultDiv);
             }
             actionResultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        updateStatus('organizer', '✅ Action complete!', 'success');
        showToast(title, 'AI action completed successfully.', 'success');

    } catch (err) {
        console.error(`[runOrganizerAction] Organizer action "${actionType}" failed:`, err);
        updateStatus('organizer', `Error: ${err.message}`, 'error');
        showError(`Organizer Action Failed`, err.message);
    } finally {
        loader('organizer', false);
        if (session) {
            try { await session.destroy(); } catch (e) { console.warn("[runOrganizerAction] Error destroying session:", e); }
        }
    }
}


// ============== SCRIBE (w/ Screenshots & Accuracy Fix) ==============
async function startScribe() {
    if (el.scribeStart) el.scribeStart.style.display = 'none';
    if (el.scribeStop) {
        el.scribeStop.style.display = 'block';
        el.scribeStop.style.animation = 'pulse 1.5s ease infinite';
    }
    updateStatus('scribe', '🔴 Recording...', 'info');
    showToast('Recording Started', 'Capturing your clicks...', 'info'); // Updated message
    if(el.results) el.results.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Recording workflow steps (clicks only)...</p>';
    currentScribeSteps = [];
    if (el.scribePanel) el.scribePanel.style.display = 'none';
    if (el.scribeChat) el.scribeChat.style.display = 'none';
    if (el.scribeMsgs) el.scribeMsgs.innerHTML = '';


    // Tell service worker to start
    try {
        await chrome.runtime.sendMessage({ action: 'startScribeRecording' });
        console.log("[startScribe] Sent start message to SW.");
    } catch (e) {
         console.error("[startScribe] Error sending start message:", e);
         showError("Scribe Error", "Could not communicate with service worker to start recording.");
         // Reset UI
         if (el.scribeStart) el.scribeStart.style.display = 'block';
         if (el.scribeStop) el.scribeStop.style.display = 'none';
         updateStatus('scribe', 'Start Failed', 'error');
    }
}
async function stopScribe() {
    updateStatus('scribe', 'Processing recording...', 'info');
    loader('scribe', true);
    if (el.scribeStop) el.scribeStop.disabled = true;

    // Tell service worker to stop
     try {
        await chrome.runtime.sendMessage({ action: 'stopScribeRecording' });
        console.log("[stopScribe] Sent stop message to SW.");
        // UI update is handled in `handleScribeStopUI` after SW confirms via message
    } catch (e) {
         console.error("[stopScribe] Error sending stop message:", e);
         showError("Scribe Error", "Could not communicate with service worker to stop recording.");
         // Reset UI partially
         loader('scribe', false);
         if (el.scribeStop) el.scribeStop.disabled = false;
         updateStatus('scribe', 'Stop Failed', 'error');
    }
}

// Updated handler with chat logic
async function handleScribeStopUI() {
    console.log("[handleScribeStopUI] Received stop confirmation. Steps:", currentScribeSteps);
    if (el.scribeStart) el.scribeStart.style.display = 'block';
    if (el.scribeStop) {
        el.scribeStop.style.display = 'none';
        el.scribeStop.style.animation = 'none';
        el.scribeStop.disabled = false; // Re-enable
    }
    // Clear previous chat messages
    if (el.scribeMsgs) el.scribeMsgs.innerHTML = '';
     // Ensure chat is hidden initially
    if (el.scribeChat) el.scribeChat.style.display = 'none';


    // Re-check AI availability *before* trying to use it
    isAiAvailable = await checkAI();

    try {
        if (!currentScribeSteps || currentScribeSteps.length === 0) {
            if(el.results) el.results.innerHTML = `<div class="placeholder"><div style="font-size:64px;">📝</div><h2>No Clicks Recorded</h2><p>Try clicking on elements on a page during recording.</p></div>`;
            updateElementVisibility('scribe'); // Hide chat/actions
            throw new Error('No steps were recorded.');
        }

        updateStatus('scribe', 'Generating guide...', 'info');

        if (!isAiAvailable) {
             console.warn("[handleScribeStopUI] AI Unavailable, showing basic steps.");
             showScribeStepsWithoutAI(); // Show basic steps if AI is off
             updateStatus('scribe', '✅ Guide Ready (Basic)', 'warning');
             showToast('Guide Generated (Basic)', 'AI instructions skipped.', 'warning');
             // Show chat but disable input
             updateElementVisibility('scribe'); // This will show panel/chat
             if(el.scribeChat) addChatMessage(el.scribeMsgs, 'AI chat & analysis unavailable.', 'error');
        } else {
            await genGuide(); // Generate guide with AI instructions
            updateStatus('scribe', '✅ Guide Ready!', 'success');
            showToast('Guide Generated', 'Workflow documentation complete!', 'success');
             // Show relevant UI elements including chat
             updateElementVisibility('scribe');
        }

    } catch (err) {
        console.error("[handleScribeStopUI] Error stopping scribe or generating guide:", err);
        updateStatus('scribe', `Failed: ${err.message}`, 'error');
         if (currentScribeSteps && currentScribeSteps.length > 0 && el.results && !el.results.querySelector('.scribe-step')) {
              showScribeStepsWithoutAI(); // Show basic steps if gen failed
              updateElementVisibility('scribe'); // Still show panel/chat (disabled)
              if(el.scribeChat) addChatMessage(el.scribeMsgs, `Error generating AI guide: ${err.message}`, 'error');
         } else if (!currentScribeSteps || currentScribeSteps.length === 0) {
               if(el.results) el.results.innerHTML = `<div class="placeholder"><div style="font-size:64px;">📝</div><h2>No Clicks Recorded</h2><p>Try clicking on elements on a page during recording.</p></div>`;
               updateElementVisibility('scribe'); // Hide panel/chat
         } else {
             updateElementVisibility('scribe'); // Hide panel/chat on other errors
         }
    } finally {
        loader('scribe', false);
    }
}
function showScribeStepsWithoutAI() {
     if (!el.results) return;
     let html = `<div class="scribe-guide-container" style="padding: 0; animation: fadeIn 0.5s ease;">
                 <h2 style="color:var(--text-primary); margin-bottom: 24px; font-size: 24px; font-weight: 700;">📝 Workflow Steps (Clicks Only)</h2>`;
      (currentScribeSteps || []).forEach((step, i) => {
          const delay = 0.1 + (i * 0.05);
          html += `<div class="scribe-step" style="animation: slideInLeft 0.4s ease ${delay}s backwards;">
             <div class="scribe-step-header">
                 <span class="scribe-step-number">${i+1}</span>
                 <strong>${esc(step.action)}</strong> <!-- Should be 'Click' -->
             </div>
             <p style="color: var(--text-muted); font-style: italic;">${esc(step.details || '(No specific element details captured)')}</p>
             ${step.screenshotDataUrl ? `<img src="${step.screenshotDataUrl}" alt="Screenshot for step ${i+1}" loading="lazy" style="margin-top: 10px; max-width: 100%; height: auto; border: 1px solid var(--border); border-radius: var(--radius-sm);">` : ''}
         </div>`;
      });
     html += '</div>';
     el.results.innerHTML = html;
     // updateElementVisibility('scribe') called by caller will handle panel/chat visibility
}
async function genGuide() {
    if (!el.results) return;
    let session = null;
    // Add container div
    let html = `<div class="scribe-guide-container" style="padding: 0; animation: fadeIn 0.5s ease;">
                <h2 style="color:var(--text-primary); margin-bottom: 24px; font-size: 24px; font-weight: 700;">📝 AI-Generated Workflow Guide</h2>`;
    try {
        session = await createSession();
        for (let i = 0; i < currentScribeSteps.length; i++) {
            const step = currentScribeSteps[i];
            // Prompt focuses on the click action and details
            const prompt = `Create a clear, single-sentence instruction for a user performing this recorded browser action: "${step.action}" on element "${step.details || 'unspecified element'}". Start with an imperative verb (e.g., "Click", "Type"). Be concise and direct. Example: "Click the 'Login' button."

Instruction:`;

            updateStatus('scribe', `Generating Step ${i+1}/${currentScribeSteps.length}...`, 'info');
            let txt = `Action: ${step.action} ${step.details ? '('+step.details+')' : ''}`; // Default fallback
            try {
                // No need to check session validity here, createSession handles it
                const result = await session.prompt(prompt);
                txt = result.replace(/^instruction:\s*/i, '').trim(); // Cleanup
            } catch (promptErr) {
                console.warn(`[genGuide] AI prompt failed for Scribe step ${i+1}:`, promptErr);
                // Keep default fallback text
                 // Attempt to recreate session for next step if this one failed
                 if (session) { try { await session.destroy(); session = null; } catch(e){} session = await createSession();} // Try immediate recreation
            }
            const delay = 0.1 + (i * 0.05);
            html += `<div class="scribe-step" style="animation: slideInLeft 0.4s ease ${delay}s backwards;">
                <div class="scribe-step-header">
                    <span class="scribe-step-number">${i+1}</span>
                    <strong>${esc(step.action)}</strong> <!-- Action Type -->
                </div>
                 <!-- AI Generated Instruction -->
                <p>${esc(txt)}</p>
                <!-- Original Detail (optional, maybe shown on hover/toggle?) -->
                <!-- <p style="color: var(--text-muted); font-size: 11px; font-style: italic;">Element: ${esc(step.details || 'N/A')}</p> -->
                ${step.screenshotDataUrl ? `<img src="${step.screenshotDataUrl}" alt="Screenshot for step ${i+1}" loading="lazy" style="margin-top: 10px; max-width: 100%; height: auto; border: 1px solid var(--border); border-radius: var(--radius-sm);">` : ''}
            </div>`;
        }
    } catch (err) {
         console.error("[genGuide] Error during Scribe guide generation:", err);
         showScribeStepsWithoutAI(); // Fallback to basic steps
         if (el.results) { /* Add error message... see handleScribeStopUI */ }
         throw err;
    } finally {
        html += '</div>'; // Close container
        if (el.results && !el.results.querySelector('.placeholder.error')) {
             el.results.innerHTML = html;
        }
        if (session) {
             try { await session.destroy(); } catch (e) { console.warn("[genGuide] Error destroying session:", e); }
        }
    }
}
async function generalize() { // Workflow Template
    if (!isAiAvailable) return showError("AI Unavailable", "Cannot generalize workflow.");
    if (!currentScribeSteps || currentScribeSteps.length === 0) return showToast('No Steps', 'Record a workflow first.', 'warning');

    const stepsText = currentScribeSteps.map((s, i) => `Step ${i+1}: ${s.action} on "${s.details || 'element'}"`).join('\n');
    const prompt = `Analyze the following recorded workflow steps. Identify the general task being performed (e.g., "Logging into a website", "Submitting a form", "Navigating settings"). Create a concise, reusable template or checklist (using markdown) that describes the core actions, replacing specific element details with generic placeholders like "[Username Field]", "[Submit Button]", "[Confirmation Message]", etc.

Recorded Workflow:
${stepsText.substring(0, 4000)}

Generalized Task: [AI identifies task here]

Workflow Template/Checklist:`;
    await aiAction(prompt, 'Generalizing Workflow', 'scribe');
}
async function analyzeWorkflow() { // Smart Analysis
    if (!isAiAvailable) return showError("AI Unavailable", "Cannot analyze workflow.");
    if (!currentScribeSteps || currentScribeSteps.length === 0) return showToast('No Steps', 'Record a workflow first.', 'warning');

    const stepsText = currentScribeSteps.map((s, i) => `Step ${i+1}: ${s.action} on "${s.details || 'element'}"`).join('\n');
    const prompt = `Analyze the following recorded workflow steps for potential optimizations or improvements. Look for redundant actions, inefficient navigation, or opportunities to simplify the process. Provide specific suggestions as markdown bullet points. If no obvious improvements are found, state that.

Recorded Workflow:
${stepsText.substring(0, 4000)}

Optimization Suggestions:`;
    await aiAction(prompt, 'Analyzing Workflow', 'scribe');
}

// Scribe Export Functions
function exportScribeText() {
    if (!currentScribeSteps || currentScribeSteps.length === 0) return showToast('Nothing to Export', 'Record a workflow first.', 'warning');

    let exportContent = `Workflow Guide - ${new Date().toLocaleString()}\nGenerated by Spectrum AI Pro\n\n`;
    const guideContainer = el.results?.querySelector('.scribe-guide-container');

    if (guideContainer) {
        // Extract from rendered guide (includes AI instructions if available)
        const steps = guideContainer.querySelectorAll('.scribe-step');
        steps.forEach(step => {
            const number = step.querySelector('.scribe-step-number')?.textContent || '';
            const action = step.querySelector('strong')?.textContent || 'Action'; // Action Type
            const instruction = step.querySelector('p')?.textContent || ''; // AI instruction or fallback
            // const details = step.querySelector('p[style*="font-style: italic"]')?.textContent || ''; // Original details if shown
            exportContent += `Step ${number}: ${action}\nInstruction: ${instruction}\n\n`; // Include instruction
        });
    } else {
        // Fallback to raw steps if guide not rendered
        currentScribeSteps.forEach((step, i) => {
            exportContent += `Step ${i + 1}: ${step.action}\nDetails: ${step.details || 'N/A'}\n\n`;
        });
    }
    downloadFile(exportContent, `workflow-guide-${Date.now()}.txt`, 'text/plain');
    updateStatus('scribe', '📥 Exported Text!', 'success');
}
function exportScribeJson() {
    if (!currentScribeSteps || currentScribeSteps.length === 0) return showToast('Nothing to Export', 'Record a workflow first.', 'warning');
    // Export raw steps data (excluding potentially large screenshots)
    const exportData = currentScribeSteps.map(step => ({
        action: step.action,
        details: step.details,
        timestamp: step.timestamp
        // Optionally include screenshot URL if needed, but increases file size
        // screenshotDataUrl: step.screenshotDataUrl
    }));
    downloadFile(JSON.stringify(exportData, null, 2), `workflow-steps-${Date.now()}.json`, 'application/json');
    updateStatus('scribe', '📥 Exported JSON!', 'success');
}
async function exportScribePdf() {
    if (!currentScribeSteps || currentScribeSteps.length === 0) return showToast('Nothing to Export', 'Record a workflow first.', 'warning');
    if (typeof jsPDF === 'undefined') {
        showError("PDF Export Error", "jsPDF library not found. Make sure jspdf.umd.min.js is included in the extension and sidepanel.html.");
        return;
    }
    updateStatus('scribe', 'Generating PDF...', 'info');
    loader('scribe', true);
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let yPos = 15; // Starting Y position
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;
        const maxWidth = doc.internal.pageSize.width - margin * 2;

        doc.setFontSize(18);
        doc.text("Workflow Guide", margin, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
        yPos += 15;

        doc.setTextColor(0); // Reset color
        doc.setFontSize(12);

        const guideContainer = el.results?.querySelector('.scribe-guide-container');
        if (!guideContainer) throw new Error("Could not find guide content to export.");

        const steps = guideContainer.querySelectorAll('.scribe-step');

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const number = step.querySelector('.scribe-step-number')?.textContent || (i + 1).toString();
            const action = step.querySelector('strong')?.textContent || 'Action';
            const instruction = step.querySelector('p')?.textContent || '';
            const imgElement = step.querySelector('img');

            if (yPos > pageHeight - margin - 30) { // Check space for header + image approx
                doc.addPage();
                yPos = margin;
            }

            // Step Header
            doc.setFont(undefined, 'bold');
            doc.text(`Step ${number}: ${action}`, margin, yPos);
            yPos += 7;
            doc.setFont(undefined, 'normal');

            // Instruction Text (with wrapping)
            const instructionLines = doc.splitTextToSize(instruction, maxWidth);
            doc.text(instructionLines, margin, yPos);
            yPos += instructionLines.length * 5 + 5; // Adjust spacing

            // Add Image if available
            if (imgElement && imgElement.src && imgElement.src.startsWith('data:image')) {
                 try {
                     const imgData = imgElement.src;
                     const imgProps = doc.getImageProperties(imgData);
                     const imgWidth = maxWidth * 0.8; // Use 80% of page width
                     const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

                     if (yPos + imgHeight > pageHeight - margin) { // Check space for image
                         doc.addPage();
                         yPos = margin;
                     }
                     doc.addImage(imgData, 'JPEG', margin + (maxWidth * 0.1), yPos, imgWidth, imgHeight);
                     yPos += imgHeight + 10;
                 } catch (imgError) {
                     console.warn(`[exportScribePdf] Error adding image for step ${number}:`, imgError);
                     if (yPos > pageHeight - margin - 10) { doc.addPage(); yPos = margin; }
                     doc.setTextColor(150);
                     doc.text("(Screenshot could not be added)", margin, yPos);
                     yPos += 7;
                     doc.setTextColor(0);
                 }
            }
             // Add extra space between steps
             yPos += 5;
        }

        doc.save(`workflow-guide-${Date.now()}.pdf`);
        updateStatus('scribe', '📥 Exported PDF!', 'success');

    } catch (e) {
        console.error("[exportScribePdf] Failed:", e);
        showError("PDF Export Failed", `Could not generate PDF: ${e.message}`);
        updateStatus('scribe', 'PDF Export Failed', 'error');
    } finally {
        loader('scribe', false);
    }
}
// ============== UTILITIES ==============
async function getPage() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('No active tab found.');
        // Allow chrome-extension:// URLs for testing/debugging if needed, but block chrome://
        if (tab.url?.startsWith('chrome://') && !tab.url.startsWith('chrome://extensions/')) {
             throw new Error('Cannot access internal Chrome pages.');
        }

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                 // Check if document.body exists
                 if (!document.body) return { content: '', url: window.location.href, title: document.title || 'No Title' };
                 return {
                     content: document.body.innerText || '', // Default to empty string
                     url: window.location.href,
                     title: document.title || 'No Title' // Default title
                 };
            }
        });
         if (result === undefined) {
             // This often happens on pages that disallow content scripts (e.g., Chrome Web Store)
             throw new Error("Cannot access page content. The page might be restricted.");
         }
        return result;
    } catch (err) {
        console.error("Error in getPage:", err);
        throw new Error(`Cannot access page content: ${err.message}. Try reloading the page or check permissions.`);
    }
}
function updateStatus(type, msg, lvl = 'info') {
    const statusEl = el[`${type}Status`];
    const textEl = el[`${type}StatusText`];
    if (!statusEl || !textEl) return;
    statusEl.style.display = 'block';
    statusEl.className = `status-message ${lvl}`;
    textEl.textContent = msg;
     // Hide after a few seconds unless it's an error or still loading
     if (lvl !== 'error' && !msg.includes('...')) {
         setTimeout(() => {
             // Check if the message is still the same before hiding
             if (textEl.textContent === msg) {
                 statusEl.style.display = 'none';
             }
         }, 3000);
     }
}
function loader(type, show = true) {
    const loaderEl = el[`${type}Loader`];
    if (loaderEl) loaderEl.style.display = show ? 'block' : 'none';
}
// Modified showError to use addEventListener (CSP Fix)
function showError(title, msg) {
     if (!el.results) return;

     // Create elements programmatically
     const errorContainer = document.createElement('div');
     errorContainer.className = 'placeholder error';
     errorContainer.style.animation = 'shake 0.5s ease';
     errorContainer.style.padding = '40px';
     errorContainer.style.textAlign = 'left'; // Align text left for readability

     const icon = document.createElement('div');
     icon.style.fontSize = '32px'; // Smaller icon
     icon.style.marginBottom = '15px';
     icon.style.textAlign = 'center';
     icon.textContent = '⚠️';

     const heading = document.createElement('h2');
     heading.style.color = 'var(--error)';
     heading.style.fontSize = '18px'; // Slightly smaller heading
     heading.style.fontWeight = '700';
     heading.style.marginBottom = '10px';
     heading.style.textAlign = 'center';
     heading.textContent = title;

     const message = document.createElement('p');
     message.style.color = 'var(--text-secondary)';
     message.style.fontSize = '13px'; // Slightly smaller text
     message.style.lineHeight = '1.6';
     message.style.whiteSpace = 'pre-wrap'; // Keep formatting
     message.style.marginBottom = '25px';
     message.style.fontFamily = 'monospace'; // Better for flag names
     message.textContent = msg; // Use textContent for safety

     const buttonContainer = document.createElement('div');
     buttonContainer.style.textAlign = 'center'; // Center buttons

     const reloadButton = document.createElement('button');
     reloadButton.textContent = 'Reload Side Panel';
     reloadButton.style.cssText = `
        padding: 9px 16px; /* Slightly smaller */
        background: var(--accent);
        color: white;
        border: none;
        border-radius: 6px; /* Smaller radius */
        cursor: pointer;
        font-weight: 500;
        font-size: 13px; /* Smaller font */
        margin-right: 10px;
        transition: background-color 0.2s ease;
     `;
     reloadButton.addEventListener('mouseover', () => reloadButton.style.backgroundColor = 'var(--accent-hover)');
     reloadButton.addEventListener('mouseout', () => reloadButton.style.backgroundColor = 'var(--accent)');
     reloadButton.addEventListener('click', () => window.location.reload()); // Add listener

     const setupButton = document.createElement('button');
     setupButton.textContent = 'Open Setup/Flags'; // Clarify button action
     setupButton.style.cssText = `
        padding: 9px 16px; /* Smaller */
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border);
        border-radius: 6px; /* Smaller radius */
        cursor: pointer;
        font-weight: 500;
        font-size: 13px; /* Smaller font */
        transition: background-color 0.2s ease;
     `;
     setupButton.addEventListener('mouseover', () => setupButton.style.backgroundColor = 'var(--bg-hover)');
     setupButton.addEventListener('mouseout', () => setupButton.style.backgroundColor = 'var(--bg-secondary)');
     // Open flags page directly if it's likely a flag issue
     if (msg.includes("flags")) {
          setupButton.addEventListener('click', () => chrome.tabs.create({ url: 'chrome://flags' }));
     } else {
          setupButton.addEventListener('click', () => chrome.runtime.openOptionsPage()); // Fallback to setup page
     }


     // Append elements
     buttonContainer.appendChild(reloadButton);
     buttonContainer.appendChild(setupButton);

     errorContainer.appendChild(icon);
     errorContainer.appendChild(heading);
     errorContainer.appendChild(message);
     errorContainer.appendChild(buttonContainer);

     // Clear previous results and add the error display
     el.results.innerHTML = '';
     el.results.appendChild(errorContainer);
}
function showLoadingAnimation() {
     if (!el.results) return;
     el.results.innerHTML = `<div class="placeholder" style="animation: fadeIn 0.5s ease;"><div class="loader" style="display: block; margin-bottom: 24px;"></div><h2>Initializing...</h2><p>Checking AI status...</p></div>`;
}
function hideLoadingAnimation() {
     // Only hide if the loading placeholder is currently displayed
     const placeholder = el.results.querySelector('.placeholder');
     if (!el.results || !placeholder || !placeholder.querySelector('.loader')) return;
     el.results.innerHTML = `<div class="placeholder" style="animation: fadeIn 0.5s ease;"><div class="placeholder-icon">🔮</div><h2>Welcome to Spectrum AI Pro</h2><p>Select an action from the left panel to begin</p><ul class="feature-list"><li>🎯 <strong>Auditor:</strong> 12-point website analysis</li><li>📂 <strong>Organizer:</strong> Intelligent tab grouping</li><li>📝 <strong>Scribe:</strong> Workflow documentation</li><li>🕒 <strong>History:</strong> Past reports & analyses</li></ul></div>`;
}
function showToast(title, msg, type = 'info', duration = 3000) {
    const colors = { info: 'var(--accent)', success: 'var(--success)', error: 'var(--error)', warning: 'var(--warning)' };
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed; top:20px; right:20px; background:${colors[type]}; color:white; padding:14px 22px; border-radius:8px; box-shadow:var(--shadow-lg); z-index:10000; animation: slideInRight 0.4s ease, fadeOut 0.4s ease ${duration/1000 - 0.4}s forwards; max-width:320px; font-size: 13px; line-height: 1.5;`; // Adjusted style
    toast.innerHTML = `<div style="font-weight:600; margin-bottom:4px; font-size:14px;">${title}</div><div>${msg}</div>`;

    // Ensure animations are defined (add to sidepanel.css if not already there)
    /* @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } */
    /* @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } } */

    document.body.appendChild(toast);
    setTimeout(() => {
        if (document.body.contains(toast)) {
             toast.style.animation = `fadeOut 0.4s ease forwards`; // Ensure fade out even if hover stops timeout
             setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 400);
        }
    }, duration);
}
function copyReport() {
    if (!currentAuditReport) return showToast('Error', 'No report generated yet.', 'error');
    navigator.clipboard.writeText(currentAuditReport).then(() => {
        showToast('Copied', 'Audit report copied to clipboard!', 'success');
        el.copyBtn.textContent = 'Copied!';
         setTimeout(() => { el.copyBtn.innerHTML = '📋 Copy'; }, 2000); // Reset button text
    }).catch(err => {
         console.error('Failed to copy report:', err);
         showToast('Error', 'Could not copy report to clipboard.', 'error');
    });
}
function exportReport() {
    if (!currentAuditReport) return showToast('Error', 'No report generated yet.', 'error');
    try {
        const blob = new Blob([currentAuditReport], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Generate filename from URL or date
        let filename = `audit-report-${Date.now()}.md`;
        try {
             if (currentAuditUrl) {
                 const hostname = new URL(currentAuditUrl).hostname;
                 filename = `audit-${hostname.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.md`;
             }
        } catch (e) { console.warn("Could not generate filename from URL"); }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Exported', 'Report downloaded as Markdown!', 'success');
    } catch (e) {
         console.error("Export failed:", e);
         showToast('Export Failed', e.message, 'error');
    }
}
function toggleFullscreen() {
    // Simple toggle between split and results-only
    if (el.wrapper.classList.contains('results-only')) {
        el.wrapper.classList.remove('results-only');
        el.wrapper.classList.add('split-view');
        el.fullscreenBtn.innerHTML = '🔍'; // Magnifying glass icon
        el.fullscreenBtn.title = 'Enter Fullscreen Results';
    } else {
        el.wrapper.classList.remove('split-view');
        el.wrapper.classList.add('results-only');
        el.fullscreenBtn.innerHTML = '📖'; // Book icon or similar for split view
        el.fullscreenBtn.title = 'Exit Fullscreen (Show Controls)';

    }
}
// Updated esc function for basic Markdown rendering within showError/results
function esc(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t; // Use textContent to prevent XSS from input 't'
    // Basic Markdown conversion - adjust as needed
    return d.innerHTML // Now contains HTML escaped version of t
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')   // Italic
        .replace(/`([^`]+)`/g, '<code>$1</code>') // Inline code
        .replace(/^### (.*$)/gim, '<h3>$1</h3>') // H3
        .replace(/^## (.*$)/gim, '<h2>$1</h2>') // H2
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')   // H1
        .replace(/^- (.*$)/gim, '<li>$1</li>')  // List items
        // Basic wrapping for lists (imperfect, might wrap non-list items)
        .replace(/(<li>.*<\/li>)/gs, (match) => {
             // Avoid wrapping if already inside a ul/ol
             // This regex logic gets complex fast, keeping it simple
             return `<ul>${match}</ul>`;
        })
        // Replace consecutive </ul ><ul> generated above
        .replace(/<\/ul>\s*<ul>/g, '')
        .replace(/\n/g, '<br>'); // Convert remaining newlines
 }



// --- CHAT ---
async function chat(type) {
    if (isAiAvailable !== true && !await checkAI()) {
        showError("AI Unavailable", "Chat is disabled. Please enable AI features.");
        return;
    }
    const inp = el[`${type}Input`];
    const msgs = el[`${type}Msgs`];
    if (!inp || !msgs) return;

    const msg = inp.value.trim();
    if (!msg) return;

    addChatMessage(msgs, msg, 'user');
    inp.value = '';

    let ctx = '';
    const baseInstruction = " Provide a concise answer based *only* on the provided context. If the context doesn't contain the answer, say so clearly.";
    if (type === 'auditor' && currentAuditReport) {
        ctx = `Context: Audit Report (first 2000 chars):\n${currentAuditReport.substring(0, 2000)}\n\nUser Question: ${msg}\n\n${baseInstruction}`;
    } else if (type === 'organizer' && currentTabGroups.length > 0) {
        const info = currentTabGroups.map(g => `${g.groupName}: ${g.tabIds.length} tabs`).join(', ');
        ctx = `Context: Tabs were organized into these groups: ${info}. User Question: ${msg}\n\n${baseInstruction}`;
    } else if (type === 'scribe' && currentScribeSteps.length > 0) {
        const steps = currentScribeSteps.map((s, i) => `Step ${i+1}: ${s.action}`).join('\n');
        ctx = `Context: Recorded workflow:\n${steps}\n\nUser Question: ${msg}\n\n${baseInstruction}`;
    } else {
        ctx = msg; // No context, just ask the question directly
    }


    const thinkDiv = document.createElement('div');
    thinkDiv.className = 'chat-message ai';
    const thinkP = document.createElement('p'); // Add p tag for styling consistency
    thinkP.style.margin = '0';
    thinkP.style.animation = 'pulse 1.5s ease infinite';
    thinkP.textContent = '💭 Thinking...';
    thinkDiv.appendChild(thinkP);

    msgs.appendChild(thinkDiv);
    msgs.scrollTop = msgs.scrollHeight;

    let session = null;
    try {
        session = await createSession(); // Uses self.languageModel
        const res = await session.prompt(ctx);
        if(thinkDiv.parentNode === msgs) msgs.removeChild(thinkDiv); // Remove thinking message
        addChatMessage(msgs, res, 'ai');
    } catch (err) {
        console.error(`Chat error (${type}):`, err);
        if(thinkDiv.parentNode === msgs) msgs.removeChild(thinkDiv); // Ensure removal on error
        addChatMessage(msgs, `❌ AI Error: ${err.message}`, 'error');
    } finally {
         if (session) {
             try { await session.destroy(); } catch (e) { console.warn("Error destroying session in chat:", e); }
         }
    }
}
function addChatMessage(msgsContainer, text, role) {
     const div = document.createElement('div');
     div.className = `chat-message ${role}`;
     if (role === 'error') {
         div.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; // Use rgba for dark theme
         div.style.color = '#f87171'; // Lighter error color for dark theme
     }
     // Render basic markdown in AI responses
     if (role === 'ai') {
         div.innerHTML = renderMarkdown(text); // Use markdown renderer
     } else {
        div.textContent = text; // Use textContent for user/error to prevent XSS
     }

     msgsContainer.appendChild(div);
     // Scroll to bottom
     requestAnimationFrame(() => {
        msgsContainer.scrollTop = msgsContainer.scrollHeight;
     });
}


// --- HISTORY ---
async function loadHist() {
    try {
        const { history = [] } = await chrome.storage.local.get('history');
        if (history.length === 0) {
            el.results.innerHTML = `<div class="placeholder" style="animation: fadeIn 0.5s ease;"><div style="font-size:64px;margin-bottom:20px;">🕒</div><h2>No History Yet</h2><p>Past audit reports will appear here</p></div>`;
            return;
        }

        let html = '<div style="padding: 0;" id="history-list-container">'; // Add ID for search filtering
        history.forEach((item, idx) => {
            const delay = 0.05 * idx; // Faster stagger
            // Basic check if URL is valid before creating URL object
            let hostname = 'Unknown URL';
            try {
                 if (item.url && item.url.startsWith('http')) {
                     hostname = new URL(item.url).hostname;
                 } else {
                      hostname = item.url || hostname; // Show the raw URL if invalid
                 }
            } catch (e) { console.warn("Could not parse history URL:", item.url); }

            html += `<div class="history-item" data-id="${item.id}" style="animation: slideInUp 0.3s ease ${delay}s backwards;">
                <div class="history-item-url" title="${esc(item.url)}">${esc(hostname)}</div>
                <div class="history-item-date">🕒 ${new Date(item.date).toLocaleString()}</div>
            </div>`;
        });
        html += '</div>';

        el.results.innerHTML = html;

        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', async function() {
                const id = this.dataset.id;
                await loadAudit(id);
            });
        });
    } catch(e) {
        console.error('Failed to load history:', e);
        showError('Could not load history', e.message);
    }
}
async function loadAudit(id) {
    try {
        const { history = [] } = await chrome.storage.local.get('history');
        const item = history.find(h => h.id === id);
        if (item) {
            currentAuditReport = item.report;
            currentAuditUrl = item.url;
            currentAuditData = item.data; // Load dashboard data

            switchTab('auditor'); // Switch to auditor tab FIRST

            // Now render content in the auditor's results panel
            if (currentAuditData) {
                await renderDash(currentAuditData); // Render dashboard
                 // Ensure the detailed report view is initially hidden after loading
                 const reportDiv = document.getElementById('fullReport');
                 const toggleBtn = document.getElementById('toggleBtn');
                 if(reportDiv) reportDiv.style.display = 'none';
                 if(toggleBtn) toggleBtn.textContent = '📄 View Detailed Report';

            } else {
                // Fallback for old history items without dashboard data
                el.results.innerHTML = `<div class="dashboard-card" style="animation: fadeIn 0.5s ease; margin: 20px;"><pre style="white-space: pre-wrap; color: var(--text-primary);">${renderMarkdown(item.report || 'Report not available.')}</pre></div>`;
            }

            // Ensure AI action buttons are updated for the loaded report
            // setupAiActionButtons(currentAuditReport, el.results, el.auditStatusText); // This function was removed, aiAction handles it
            // setupCopyButton(currentAuditReport, el.copyBtn); // This function was removed, copyReport handles it

            el.aiPanel.style.display = isAiAvailable ? 'block' : 'none'; // Show AI panel if AI is available
            el.audChat.style.display = 'block';
            el.copyBtn.style.display = 'block';
            el.exportBtn.style.display = 'block';
            updateStatus('audit', `Loaded: ${new URL(item.url).hostname}`, 'info');
            showToast('Loaded', 'Report loaded from history!', 'success');
        } else {
             showToast('Error', 'Could not find history item.', 'error');
        }
    } catch(e) {
        console.error('Failed to load audit:', e);
        showError('Could not load audit', e.message);
    }
}
function searchHist(e) {
    const term = e.target.value.toLowerCase();
    const container = document.getElementById('history-list-container');
     if (!container) return; // Exit if container not found
    container.querySelectorAll('.history-item').forEach(item => {
        const urlText = item.querySelector('.history-item-url')?.textContent.toLowerCase() || '';
        const dateText = item.querySelector('.history-item-date')?.textContent.toLowerCase() || '';
        item.style.display = (urlText.includes(term) || dateText.includes(term)) ? 'block' : 'none';
    });
}
async function clearHist() {
    if (confirm('Are you sure you want to clear all audit history? This cannot be undone.')) {
        try {
            await chrome.storage.local.set({ history: [] });
            loadHist(); // Reload the history view (which will show empty)
            showToast('Cleared', 'History cleared successfully!', 'success');
        } catch (e) {
             console.error("Failed to clear history:", e);
             showToast('Error', 'Could not clear history.', 'error');
        }
    }
}
async function saveAudit(url, report, data) {
    try {
        const { history = [] } = await chrome.storage.local.get('history');
        // Ensure data exists, create basic fallback if not (e.g., from older versions)
        const auditData = data || { scores: {}, issues: {}, score: 0, health: 0 };
        const entry = {id:Date.now().toString(), url, report, data: auditData, date:new Date().toISOString()};
        history.unshift(entry);
        if (history.length > 50) history.pop(); // Limit history to 50 items
        await chrome.storage.local.set({ history });
        console.log("Audit saved to history.");
    } catch(e) {
        console.error('Failed to save audit:', e);
        showToast('Save Error', 'Could not save audit to history.', 'error');
    }
}

console.log('✅ Spectrum AI Pro Sidepanel Initialized (v3.2 - CSP Fix)');