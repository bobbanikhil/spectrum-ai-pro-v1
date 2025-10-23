/**
 * 🏆 SPECTRUM AI PRO V3.4 - COMMUNICATION, CHAT, ORGANIZER FIX
 * Restores message listeners for reliable SW communication.
 * Fixes Organizer group naming.
 * Fixes History import validation.
 * Improves Chat context handling.
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
    el.exportMarkdownBtn = document.getElementById('exportMarkdownButton');
    el.exportJsonBtn = document.getElementById('exportJsonButton');
    el.exportPdfBtn = document.getElementById('exportPdfButton');
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
    el.analyzeContentBtn = document.getElementById('analyzeContentButton');

    // Scribe
    el.scribeStart = document.getElementById('startScribeButton');
    el.scribeStop = document.getElementById('stopScribeButton');
    el.scribeStatus = document.getElementById('scribeStatus');
    el.scribeStatusText = document.getElementById('scribeStatusText');
    el.scribeLoader = document.getElementById('scribeLoader');
    el.scribePanel = document.getElementById('scribeActionsPanel');
    el.genBtn = document.getElementById('generalizeWorkflowButton');
    el.scribeExportTextBtn = document.getElementById('scribeExportTextButton');
    el.scribeExportJsonBtn = document.getElementById('scribeExportJsonButton');
    el.scribeExportPdfBtn = document.getElementById('scribeExportPdfButton');
    el.scribeAnalyzeBtn = document.getElementById('scribeAnalyzeButton');
    el.scribeChat = document.getElementById('scribeChatContainer');
    el.scribeMsgs = document.getElementById('scribeChatMessages');
    el.scribeInput = document.getElementById('scribeChatInput');
    el.scribeSend = document.getElementById('scribeChatSend');

    // History
    el.histSearch = document.getElementById('historySearchInput');
    el.histClear = document.getElementById('clearHistoryButton');
    el.histExportBtn = document.getElementById('historyExportButton');
    el.histImportInput = document.getElementById('historyImportInput');
    el.histImportBtn = document.getElementById('historyImportButton');
}

// INIT
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Spectrum AI Pro Sidepanel (v3.4) - Starting...');

    cacheElements();
    setupEventListeners();
    setupMessageListeners(); // Setup listeners *before* potentially handling pending action

    // *** START: ROBUST ACTION HANDLING (Fallback) ***
    // Check for a pending action ONLY if listeners aren't setup immediately
    try {
        const { pendingAction, pendingTabId } = await chrome.storage.local.get(['pendingAction', 'pendingTabId']);

        if (pendingAction) {
            console.log(`[Sidepanel] Handling pending action from storage: ${pendingAction}`);
            await chrome.storage.local.remove(['pendingAction', 'pendingTabId']); // Clear immediately

            // Wait a very brief moment to ensure UI elements might be ready
            await new Promise(resolve => setTimeout(resolve, 50));

            switch(pendingAction) {
                case 'triggerAudit':
                    // Ensure DOM is ready before manipulating it
                    if (document.readyState === 'loading') { await new Promise(resolve => window.addEventListener('load', resolve)); }
                    switchTab('auditor');
                    await runAudit();
                    break;
                case 'startScribeRecording':
                     if (document.readyState === 'loading') { await new Promise(resolve => window.addEventListener('load', resolve)); }
                    switchTab('scribe');
                    await startScribe();
                    break;
                case 'organizeTabs':
                     if (document.readyState === 'loading') { await new Promise(resolve => window.addEventListener('load', resolve)); }
                    switchTab('organizer');
                    await organize();
                    break;
            }
        }
    } catch (e) {
        console.error("Error checking/handling pending action:", e);
    }
    // *** END: ROBUST ACTION HANDLING (Fallback) ***

    showLoadingAnimation();

    isAiAvailable = await checkAI();

    if (!isAiAvailable) {
         showError(
            "AI UNAVAILABLE: SETUP REQUIRED",
            "Could not initialize AI features (`self.LanguageModel` not found or not ready).\n\n" +
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

// --- Feature Enable/Disable Functions ---
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

     // Hide chat containers (Handled by updateElementVisibility now, but good to ensure)
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

// --- Event Listeners Setup ---
function setupEventListeners() {
    // View modes
    el.viewBtns?.forEach(btn => {
        btn.addEventListener('click', () => setViewMode(btn.dataset.mode));
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
    el.analyzeContentBtn?.addEventListener('click', () => runOrganizerAction('analyzeContent'));

    // Scribe
    el.scribeStart?.addEventListener('click', startScribe);
    el.scribeStop?.addEventListener('click', stopScribe);
    el.genBtn?.addEventListener('click', generalize);
    el.scribeAnalyzeBtn?.addEventListener('click', analyzeWorkflow);
    el.scribeSend?.addEventListener('click', () => chat('scribe'));
    el.scribeInput?.addEventListener('keypress', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chat('scribe'); } });
    el.scribeExportTextBtn?.addEventListener('click', exportScribeText);
    el.scribeExportJsonBtn?.addEventListener('click', exportScribeJson);
    el.scribeExportPdfBtn?.addEventListener('click', exportScribePdf);

    // History
    el.histSearch?.addEventListener('input', searchHist);
    el.histClear?.addEventListener('click', clearHist);
    el.histExportBtn?.addEventListener('click', exportHistory);
    el.histImportBtn?.addEventListener('click', () => el.histImportInput?.click());
    el.histImportInput?.addEventListener('change', importHistory);

    // Toolbar Exports (Auditor)
    el.copyBtn?.addEventListener('click', copyReport);
    el.exportMarkdownBtn?.addEventListener('click', exportAuditMarkdown);
    el.exportJsonBtn?.addEventListener('click', exportAuditJson);
    el.exportPdfBtn?.addEventListener('click', exportAuditPdf);
    el.fullscreenBtn?.addEventListener('click', toggleFullscreen);
    el.settingsBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage());
}

// --- Message Listeners ---
function setupMessageListeners() {
     chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (sender.tab) { return false; } // Ignore messages from content scripts
        console.log('[Sidepanel] Received message from SW:', request.action);

        let isAsync = false;

        switch(request.action) {
            // *** START: RESTORED LISTENERS ***
             case 'triggerAudit':
                 isAsync = true;
                 (async () => {
                     // Ensure DOM is ready before manipulating it
                     if (document.readyState === 'loading') { await new Promise(resolve => window.addEventListener('load', resolve)); }
                     switchTab('auditor');
                     await runAudit();
                     sendResponse({ received: true });
                 })();
                 break;
            case 'startScribeRecording':
                 isAsync = true;
                 (async () => {
                      if (document.readyState === 'loading') { await new Promise(resolve => window.addEventListener('load', resolve)); }
                     switchTab('scribe');
                     await startScribe(); // This sends a message back to SW
                     sendResponse({ received: true });
                 })();
                 break;
            case 'organizeTabs':
                isAsync = true;
                 (async () => {
                      if (document.readyState === 'loading') { await new Promise(resolve => window.addEventListener('load', resolve)); }
                     switchTab('organizer');
                     await organize();
                     sendResponse({ received: true });
                 })();
                 break;
            case 'scribeRecordingStopped':
                // Received steps from service worker after stopScribe() was called
                currentScribeSteps = request.steps || [];
                isAsync = true; // handleScribeStopUI is async
                // Call UI handler *after* steps are received
                handleScribeStopUI()
                    .then(() => sendResponse({ received: true }))
                    .catch(e => {
                        console.error("Error in handleScribeStopUI:", e);
                        sendResponse({ error: e.message }); // Send error back if handler fails
                    });
                break;
            // *** END: RESTORED LISTENERS ***

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

            default:
                 console.warn("[Sidepanel] Received unhandled message:", request.action);
                 // Only return false if explicitly unhandled
                 return false;
        }

        // Return true if we started an async operation and handle sendResponse there
        return isAsync;
    });
}

// --- View Mode & Tab Switching ---
function setViewMode(mode) {
    if (!el.wrapper) return;
    el.wrapper.className = 'content-wrapper'; // Reset
    if (mode === 'split') el.wrapper.classList.add('split-view');
    else if (mode === 'results') el.wrapper.classList.add('results-only');
    else if (mode === 'chat') el.wrapper.classList.add('chat-only');
    el.viewBtns?.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
}
function switchTab(name) {
    el.tabs?.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    el.tabPanels?.forEach(p => p.classList.toggle('active', p.id === name));
    const titles = { auditor: '📊 Audit Report', organizer: '📂 Tab Groups', scribe: '📝 Workflow', history: '🕒 History' };
    if (el.resultsTitle) el.resultsTitle.textContent = titles[name] || '📊 Results';
    updateElementVisibility(name);
    if (name === 'history') loadHist();
}
function updateElementVisibility(activeTabName) {
    // Chat Visibility
    if (el.audChat) el.audChat.style.display = (activeTabName === 'auditor') ? 'block' : 'none';
    if (el.orgChat) el.orgChat.style.display = (activeTabName === 'organizer') ? 'block' : 'none';
    if (el.scribeChat) el.scribeChat.style.display = (activeTabName === 'scribe') ? 'block' : 'none';

    const showAuditElements = activeTabName === 'auditor' && currentAuditReport && currentAuditData;
    const showScribeElements = activeTabName === 'scribe' && currentScribeSteps.length > 0;
    const showOrgElements = activeTabName === 'organizer' && currentTabGroups.length > 0;
    const showOrgActions = showOrgElements && selectedOrganizerGroup.tabIds.length > 0;
    const showHistoryElements = activeTabName === 'history';
    const pdfLibraryExists = typeof jsPDF !== 'undefined';

    // Auditor specific
    if (el.aiPanel) el.aiPanel.style.display = showAuditElements && isAiAvailable ? 'block' : 'none';
    if (el.copyBtn) el.copyBtn.style.display = showAuditElements ? 'block' : 'none';
    if (el.exportMarkdownBtn) el.exportMarkdownBtn.style.display = showAuditElements ? 'block' : 'none';
    if (el.exportJsonBtn) el.exportJsonBtn.style.display = showAuditElements ? 'block' : 'none';
    if (el.exportPdfBtn) {
         el.exportPdfBtn.style.display = showAuditElements ? 'block' : 'none';
         el.exportPdfBtn.disabled = !pdfLibraryExists;
    }

    // Scribe specific
    if (el.scribePanel) el.scribePanel.style.display = showScribeElements ? 'block' : 'none';
    if (el.scribePanel && el.scribePanel.style.display === 'block') {
        if (el.genBtn) el.genBtn.disabled = !isAiAvailable;
        if (el.scribeAnalyzeBtn) el.scribeAnalyzeBtn.disabled = !isAiAvailable;
        if (el.scribeExportPdfBtn) el.scribeExportPdfBtn.disabled = !pdfLibraryExists;
         if (el.scribeExportTextBtn) el.scribeExportTextBtn.disabled = false;
         if (el.scribeExportJsonBtn) el.scribeExportJsonBtn.disabled = false;
    }

    // Organizer specific
    if (el.orgActionsPanel) el.orgActionsPanel.style.display = showOrgActions ? 'block' : 'none';
    if (el.orgActionsPanel && el.orgActionsPanel.style.display === 'block') {
         if(el.summGroupBtn) el.summGroupBtn.disabled = !isAiAvailable;
         if(el.extractDataBtn) el.extractDataBtn.disabled = !isAiAvailable;
         if(el.findContactsBtn) el.findContactsBtn.disabled = !isAiAvailable;
         if(el.analyzeContentBtn) el.analyzeContentBtn.disabled = !isAiAvailable;
    }

     // History specific buttons
     if (el.histExportBtn) el.histExportBtn.style.display = showHistoryElements ? 'inline-block' : 'none';
     if (el.histImportBtn) el.histImportBtn.style.display = showHistoryElements ? 'inline-block' : 'none';
     if (el.histImportInput) el.histImportInput.style.display = 'none';

    // Chat Inputs based on AI status
    const chatInputDisabled = !isAiAvailable;
    [el.audInput, el.orgInput, el.scribeInput].forEach(inp => { if(inp) inp.disabled = chatInputDisabled; });
    [el.audSend, el.orgSend, el.scribeSend].forEach(btn => { if(btn) btn.disabled = chatInputDisabled; });
    // Show unavailable message if AI is off and chat is visible
    if(!isAiAvailable) {
        if(el.audChat?.style.display === 'block' && el.audMsgs && !el.audMsgs.hasChildNodes()) addChatMessage(el.audMsgs, 'AI chat unavailable.', 'error');
        if(el.orgChat?.style.display === 'block' && el.orgMsgs && !el.orgMsgs.hasChildNodes()) addChatMessage(el.orgMsgs, 'AI chat unavailable.', 'error');
        if(el.scribeChat?.style.display === 'block' && el.scribeMsgs && !el.scribeMsgs.hasChildNodes()) addChatMessage(el.scribeMsgs, 'AI chat unavailable.', 'error');
    }
}

// --- AI Check & Session Creation ---
async function checkAI() {
    console.log("[checkAI] Running check...");
    const LangModelCapExists = typeof self.LanguageModel !== 'undefined';
    if (!LangModelCapExists) { console.error("[checkAI] FAILED: self.LanguageModel is undefined."); return false; }
    try {
        const availability = await self.LanguageModel.availability();
        console.log("[checkAI] Availability status:", availability);
        if (availability === 'no' || availability === 'unavailable') { console.error("[checkAI] Availability check returned 'no' or 'unavailable'."); return false; }
        const s = await self.LanguageModel.create({ outputLanguage: 'en' }); // Test creation
        await s.destroy();
        console.log("[checkAI] self.LanguageModel.create() test successful.");
        return true;
    } catch (e) { console.error("[checkAI] Error during availability/create check:", e); return false; }
}
async function createSession() {
    if (isAiAvailable !== true) {
         console.warn("[createSession] AI state is not true. Re-checking...");
         if (!await checkAI()) { isAiAvailable = false; throw new Error("AI Language Model is not available after re-check."); }
         isAiAvailable = true; console.log("[createSession] AI availability confirmed on re-check.");
    }
    try {
        const modelObject = self.LanguageModel;
        if (typeof modelObject?.create !== 'function') {
             isAiAvailable = false; console.error("[createSession] FINAL CHECK FAILED: self.LanguageModel.create is not a function.");
             throw new Error("AI Language Model API structure invalid.");
        }
        const session = await modelObject.create({ systemPrompt: 'You are Spectrum AI Pro, a helpful web analyst assistant.', outputLanguage: 'en' });
        console.log("[createSession] Session created successfully.");
        return session;
    } catch (e) {
        isAiAvailable = false; console.error("[createSession] Failed to create AI session:", e);
        showError("AI Session Error", `Could not create AI session: ${e.message}. Check flags/components.`);
        throw e;
    }
}

// --- Auditor ---
async function runAudit() {
    isAiAvailable = await checkAI();
    if (!isAiAvailable) { showError("AI Unavailable", "Cannot run audit. Enable AI features."); return; }
    if (el.auditBtn) el.auditBtn.disabled = true; loader('audit', true); updateStatus('audit', 'Fetching content...', 'info');
    if (el.results) el.results.innerHTML = ''; if (el.audMsgs) el.audMsgs.innerHTML = '';
    currentAuditReport = ''; currentAuditData = null; currentAuditUrl = '';
    try {
        const { content, url } = await getPage(); currentAuditUrl = url;
        if (!content?.trim()) throw new Error('Page content empty/inaccessible.');
        updateStatus('audit', 'Analyzing with AI...', 'info');
        const data = await analyze(content.substring(0, 10000));
        currentAuditReport = data.report; currentAuditData = data;
        setViewMode('split'); // Ensure dashboard visible
        await renderDash(data);
        updateElementVisibility('auditor');
        updateStatus('audit', '✅ Complete!', 'success'); showToast('Audit Complete', 'Analysis finished!', 'success');
        await saveAudit(url, data.report, data);
    } catch (err) {
        console.error("Audit failed:", err); updateStatus('audit', `Error: ${err.message}`, 'error');
        currentAuditReport = ''; currentAuditData = null; currentAuditUrl = '';
        showError("Audit Failed", err.message); updateElementVisibility('auditor');
    } finally { if (el.auditBtn) el.auditBtn.disabled = false; loader('audit', false); }
}
async function analyze(content) {
    let session = null; let data = fallback();
     try {
         session = await createSession();
         const dataPrompt = `Analyze content & return JSON ONLY: {"score": <num>,"health": <num>,"scores":{"tech":<num>,"a11y":<num>,"perf":<num>,"sec":<num>,"ux":<num>,"content":<num>,"seo":<num>,"links":<num>,"conv":<num>,"analytics":<num>,"comp":<num>,"mobile":<num>},"issues":{"errors":<num>,"warnings":<num>,"notices":<num>}}. Infer scores 0-10, overall 0-100. Content: ${content.substring(0, 2000)}`;
         try {
            const resData = await session.prompt(dataPrompt);
            const jsonMatch = resData.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No valid JSON found for scores.');
            const parsedData = JSON.parse(jsonMatch[0]);
             if (typeof parsedData.score !== 'number' || typeof parsedData.scores?.tech !== 'number') throw new Error('Parsed JSON missing fields.');
             data = parsedData; console.log("[analyze] Parsed AI JSON data:", data);
         } catch (e) { console.error('[analyze] AI data prompt/parse failed, using fallback.', e); data.report = fallback().report + `\n\nError JSON: ${e.message}`; }
        if (session) { try { await session.destroy(); } catch (e) {} session = null; } // Destroy JSON session
        session = await createSession(); // New session for report
        const scores = data.scores || fallback().scores;
        const reportPrompt = `Web analyst: Conduct 12-point audit on content snippet. Use pre-calculated scores. Format in Markdown: # Report, ## Summary, ## Point [Score/10], ### Assessment, ### Issues (\n- Issue), ### Recommendations (\n- Rec). Be concise. Content: ${content.substring(0, 8000)} Scores: Tech:${scores.tech}, A11y:${scores.a11y}, Perf:${scores.perf}, Sec:${scores.sec}, UX:${scores.ux}, Content:${scores.content}, SEO:${scores.seo}, Links:${scores.links}, Conv:${scores.conv}, Analytics:${scores.analytics}, Comp:${scores.comp}, Mobile:${scores.mobile}.`;
         try {
            const reportText = await session.prompt(reportPrompt);
            if (!reportText || !reportText.includes("Executive Summary")) throw new Error("Report incomplete.");
             data.report = reportText;
         } catch (e) { console.error('[analyze] AI report gen failed, using fallback/error.', e); data.report = (data.report || fallback().report) + `\n\nError Report: ${e.message}`; }
         return data;
     } catch (aiError) { console.error("[analyze] AI analysis failed:", aiError); data.report = fallback().report + `\n\nAI Error: ${aiError.message}`; return data; }
     finally { if (session) { try { await session.destroy(); } catch (e) {} } }
}

// --- Dashboard Rendering ---
function fallback() { return { score: 50, health: 50, scores: { tech: 5, a11y: 5, perf: 5, sec: 5, ux: 5, content: 5, seo: 5, links: 5, conv: 5, analytics: 5, comp: 5, mobile: 5 }, issues: { errors: 1, warnings: 1, notices: 1 }, report: "# Fallback Report\nAI Error." }; }
async function renderDash(d) {
    if (!el.results) return; el.results.innerHTML = `<div class="loader"></div>`; await new Promise(r => setTimeout(r, 50));
    const data = d || fallback(); const s = data.scores || {}; const i = data.issues || {}; const score = data.score || 0; const health = data.health || 0;
    el.results.innerHTML = `
    <div class="dashboard-container"> <div class="dashboard-stats"> <div class="stat-card"> <div class="stat-label">Overall Score</div> <div class="stat-value">${score}</div> <div class="stat-badge ${grade(score)}">${lvl(score)}</div> </div> <div class="stat-card"> <div class="stat-label">Site Health</div> <div class="stat-value stat-health">${health}</div> <div class="stat-badge ${hlth(health)}">${hlth(health)}</div> </div> <div class="stat-card"> <div class="stat-label">Issues</div> <div class="stat-value" style="color:var(--error);">${i.errors||0}</div> <div class="stat-sublabel">Errors / ${i.warnings||0} Warn</div> </div> </div> <div class="dashboard-charts"> <div class="chart-card"> <h3>Score</h3> <div class="donut-chart">${donut(score)}</div> </div> <div class="chart-card"> <h3>Health</h3> <div class="donut-chart">${healthDonut(health)}</div> </div> </div> <div class="dashboard-card"> <h3>12-Point Analysis</h3> <div class="score-grid"> ${breakdown("Tech",s.tech)} ${breakdown("A11y",s.a11y)} ${breakdown("Perf",s.perf)} ${breakdown("Sec",s.sec)} ${breakdown("UX",s.ux)} ${breakdown("Content",s.content)} ${breakdown("SEO",s.seo)} ${breakdown("Links",s.links)} ${breakdown("Conv",s.conv)} ${breakdown("Analytics",s.analytics)} ${breakdown("Comp",s.comp)} ${breakdown("Mobile",s.mobile)} </div> </div> <div class="dashboard-card"> <button id="toggleBtn" class="toggle-report-btn">📄 View Detailed Report</button> <div id="fullReport" style="display: none; margin-top: 20px;">${renderMarkdown(data.report)}</div> </div> </div>`;
    const toggleBtn = document.getElementById('toggleBtn'); const reportDiv = document.getElementById('fullReport');
    if (toggleBtn && reportDiv) { toggleBtn.addEventListener('click', () => { const isHidden = reportDiv.style.display === 'none'; reportDiv.style.display = isHidden ? 'block' : 'none'; toggleBtn.textContent = isHidden ? '🙈 Hide Report' : '📄 View Report'; if(isHidden) reportDiv.scrollIntoView({behavior:'smooth'}); }); }
}
function donut(i){const r=60,c=2*Math.PI*r,p=((i||0)/100)*c;return `<svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--bg-tertiary)" stroke-width="20"></circle><circle cx="80" cy="80" r="${r}" fill="none" stroke="${scColor(i)}" stroke-width="20" stroke-dasharray="${p} ${c-p}" stroke-linecap="round" transform="rotate(-90 80 80)"></circle><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="donut-center">${i||0}</text></svg>`;}
function healthDonut(s){const r=60,c=2*Math.PI*r,p=((s||0)/100)*c;return `<svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--bg-tertiary)" stroke-width="20"></circle><circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--success)" stroke-width="20" stroke-dasharray="${p} ${c-p}" stroke-linecap="round" transform="rotate(-90 80 80)"></circle><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="health-score-text">${s||0}</text></svg>`;}
function breakdown(t,s){const score=s*10||0;return `<div class="score-item"><div class="score-header"><span>${t}</span><span class="score-value ${grade(score)}">${score}/100</span></div><div class="score-bar-container"><div class="score-bar ${grade(score)}" style="width:${score}%;"></div></div></div>`;}
function lvl(s){if(s>=90)return'Excellent';if(s>=70)return'Good';if(s>=50)return'Fair';return'Poor';}
function grade(s){if(s>=90)return'badge-excellent';if(s>=70)return'badge-good';if(s>=50)return'badge-fair';return'badge-poor';}
function hlth(s){if(s>=90)return'badge-excellent';if(s>=70)return'badge-good';if(s>=50)return'badge-fair';return'badge-poor';}
function scColor(s){if(s>=90)return'var(--success)';if(s>=70)return'var(--accent)';if(s>=50)return'var(--warning)';return'var(--error)';}
function renderMarkdown(md){if(!md)return'';let html=esc(md);return html.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/^### (.*$)/gim,'<h3>$1</h3>').replace(/^## (.*$)/gim,'<h2>$1</h2>').replace(/^# (.*$)/gim,'<h1>$1</h1>').replace(/^- (.*$)/gim,'<li>$1</li>').replace(/<\/li>\s*<li/g,'</li><li').replace(/(<li.*<\/li>)/gs,'<ul>$1</ul>').replace(/<\/ul>\s*<ul>/g,'').replace(/\n/g,'<br>');}

// --- Auditor AI Actions ---
async function summarize() { if (!isAiAvailable || !currentAuditReport) return; const prompt = `Summarize audit in 3-5 bullets:\n\n${currentAuditReport.substring(0, 4000)}`; await aiAction(prompt, 'Summarizing', 'auditor'); }
async function proofread() { if (!isAiAvailable || !currentAuditReport) return; const prompt = `Find errors in 'Content' section:\n\n${currentAuditReport.substring(0, 4000)}`; await aiAction(prompt, 'Proofreading', 'auditor'); }
async function rewriteTitle() { if (!isAiAvailable || !currentAuditReport) return; const prompt = `Suggest 3-5 SEO titles based on 'Content'/'SEO':\n\n${currentAuditReport.substring(0, 4000)}`; await aiAction(prompt, 'Generating Titles', 'auditor'); }
async function aiAction(prompt, msg, type) {
    loader(type, true); updateStatus(type, msg + '...', 'info'); let session = null;
    try {
        session = await createSession(); const res = await session.prompt(prompt);
        if (el.results) {
            const resultsContainer = el.results;
            const actionResultDiv = document.createElement('div'); actionResultDiv.className = 'dashboard-card ai-action-result';
            actionResultDiv.innerHTML = `<h3>${msg} Result</h3><div>${renderMarkdown(res)}</div>`;
            let insertAfter = resultsContainer.querySelector('.dashboard-container') || resultsContainer.firstChild; // Fallback
            resultsContainer.insertBefore(actionResultDiv, insertAfter?.nextSibling || null);
            actionResultDiv.scrollIntoView({ behavior: 'smooth' });
        }
        updateStatus(type, `${msg} Complete!`, 'success');
    } catch (err) { console.error(`AI action "${msg}" failed:`, err); updateStatus(type, `Failed: ${err.message}`, 'error'); showError(`AI Action Failed`, err.message); }
    finally { loader(type, false); if (session) { try { await session.destroy(); } catch (e) {} } }
}

// --- Organizer ---
async function organize() {
    isAiAvailable = await checkAI(); if (!isAiAvailable) { showError("AI Unavailable", "Cannot organize tabs."); return; }
    if(el.orgBtn) el.orgBtn.disabled = true; loader('organizer', true); updateStatus('organizer', 'Analyzing tabs...', 'info');
    if(el.results) el.results.innerHTML = ''; if(el.orgMsgs) el.orgMsgs.innerHTML = '';
    currentTabGroups = []; selectedOrganizerGroup = { tabIds: [], groupName: null, buttonElement: null }; disableOrganizerActions();
    let session = null;
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true, windowType: 'normal' });
        if (tabs.length < 2) { updateStatus('organizer','Need 2+ tabs','warning'); if(el.results) el.results.innerHTML = `<div class="placeholder"><h2>Not Enough Tabs</h2></div>`; throw new Error('Not enough tabs'); }
        const valid = tabs.filter(t => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('about:'));
        if (valid.length === 0) throw new Error('No valid tabs');
        updateStatus('organizer', 'Grouping with AI...', 'info');
        const info = valid.map(t => `ID ${t.id}: "${t.title||''}" - ${t.url?new URL(t.url).hostname:''}`).join('\n');
        const prompt = `Organize tabs into groups. Assign short name & confidence (0-100). Return ONLY JSON array: [{"groupName":"Name","tabIds":[IDs],"confidence":num}]. Group ALL tabs. Tabs:\n${info}\n\nJSON:`;
        session = await createSession(); const res = await session.prompt(prompt); console.log("[organize] AI Raw:", res);
        let groups = [];
        try {
            const jsonMatch = res.match(/\[\s*\{[\s\S]*?\}\s*\]/); if (!jsonMatch) throw new Error('No JSON array found.');
            groups = JSON.parse(jsonMatch[0]);
             if (!Array.isArray(groups) || groups.some(g=>typeof g.groupName!=='string'||!Array.isArray(g.tabIds))) throw new Error('Invalid JSON structure.');
        } catch (parseError) { console.error("Parse Fail:", parseError, "Response:", res); throw new Error(`AI format error: ${parseError.message}`); }
        currentTabGroups = groups; setViewMode('split'); await showGroups(groups, valid);
        updateElementVisibility('organizer'); updateStatus('organizer', '✅ Complete!', 'success'); showToast('Tabs Organized', `Created ${groups.length} groups!`, 'success');
    } catch (err) { console.error("Organizer fail:", err); updateStatus('organizer',`Error: ${err.message}`,'error'); if(err.message!=='Not enough tabs') showError("Organizer Failed",err.message); updateElementVisibility('organizer'); }
    finally { if(el.orgBtn) el.orgBtn.disabled = false; loader('organizer', false); if (session) { try { await session.destroy(); } catch (e) {} } }
}
async function showGroups(groups, tabs) {
    if (!el.results) return; if (groups.length === 0) { el.results.innerHTML = `<div class="placeholder"><h2>No Groups Suggested</h2></div>`; return; }
    el.results.innerHTML = '<div class="loader"></div>'; await new Promise(r => setTimeout(r, 50));
    let html = '<div class="organizer-groups-container">';
    groups.forEach((g, i) => {
        const validTabIds = g.tabIds.filter(id => tabs.some(t => t.id === id)); if (validTabIds.length === 0) { console.warn(`Group "${g.groupName}" empty.`); return; }
        const confHtml = typeof g.confidence==='number'?`<span class="confidence-score">${g.confidence}%</span>`:'';
        html += `<div class="organizer-group" data-group-name="${esc(g.groupName)}" data-tab-ids='${JSON.stringify(validTabIds)}'> <div class="organizer-group-header"><h3><span>📁</span> ${esc(g.groupName)} ${confHtml}</h3><span>${validTabIds.length} tabs</span></div> <ul>`;
        validTabIds.forEach(id => { const t = tabs.find(x => x.id === id); if(t) html += `<li><img src="${t.favIconUrl||'icons/icon16.png'}" width="16" alt=""><span>${esc(t.title)}</span></li>`; });
        html += `</ul><button class="primary-button create-grp">✨ Create Group</button></div>`;
    });
    html += '</div>'; el.results.innerHTML = html;
    el.results.querySelectorAll('.create-grp').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); btn.disabled = true; btn.textContent = '⏳ Creating...';
            const card = btn.closest('.organizer-group'); if (!card) return;
            const tabIds = JSON.parse(card.dataset.tabIds || '[]'); const groupName = card.dataset.groupName || "New Group";
            if (tabIds.length > 0) { await createGroup(tabIds, groupName); btn.textContent = '✅ Created!'; }
            else { btn.textContent = 'Error'; }
            setTimeout(() => { btn.disabled = false; btn.textContent = '✨ Create Group'; }, 1500);
        });
    });
    el.results.querySelectorAll('.organizer-group').forEach(card => {
        card.addEventListener('click', function() {
            if (selectedOrganizerGroup.buttonElement) { selectedOrganizerGroup.buttonElement.style.borderColor = 'var(--border)'; selectedOrganizerGroup.buttonElement.style.boxShadow = ''; }
            this.style.borderColor = 'var(--accent)'; this.style.boxShadow = '0 0 0 3px var(--accent-light)';
            selectedOrganizerGroup = { tabIds: JSON.parse(this.dataset.tabIds), groupName: this.dataset.groupName, buttonElement: this };
            updateElementVisibility('organizer'); if(el.orgActionContext) el.orgActionContext.textContent = `Actions for "${selectedOrganizerGroup.groupName}" (${selectedOrganizerGroup.tabIds.length} tabs):`;
        });
    });
}
async function createGroup(tabIds, groupName = "New Group") {
    try { const group = await chrome.tabs.group({ tabIds: tabIds }); await chrome.tabGroups.update(group, { title: groupName, collapsed: true }); showToast('Group Created!', `Group "${groupName}" created.`, 'success'); }
    catch (e) { console.error("Group creation fail:", e); showToast('Error', `Group creation failed: ${e.message}`, 'error'); }
}
function disableOrganizerActions() { selectedOrganizerGroup = { tabIds: [], groupName: null, buttonElement: null }; if (el.orgActionsPanel) el.orgActionsPanel.style.display = 'none'; if (el.orgActionContext) el.orgActionContext.textContent = 'Select group.'; }
async function runOrganizerAction(actionType) {
    if (!isAiAvailable) { showError("AI Unavailable", "Cannot run action."); return; } if (selectedOrganizerGroup.tabIds.length === 0) { showToast('No Group', 'Select group first.', 'warning'); return; }
    loader('organizer', true); updateStatus('organizer', `Fetching content...`, 'info'); let session = null; let title = `AI Action: ${actionType}`;
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getTabGroupContent', tabIds: selectedOrganizerGroup.tabIds });
        const combinedContent = response?.combinedContent; if (!combinedContent) throw new Error('Could not get tab content.');
        updateStatus('organizer', `Analyzing (${actionType})...`, 'info'); let prompt = '';
        switch (actionType) {
            case 'summarize': title = `Summary: "${selectedOrganizerGroup.groupName}"`; prompt = `Concise summary (2-4 bullets) of themes/info from combined content (${selectedOrganizerGroup.tabIds.length} pages) for "${selectedOrganizerGroup.groupName}". Markdown. Content:\n${combinedContent.substring(0,8000)}\n\nSummary:`; break;
            case 'extract': title = `Data: "${selectedOrganizerGroup.groupName}"`; prompt = `Extract key data (stats, names, facts) from content for "${selectedOrganizerGroup.groupName}". Markdown bullets. Content:\n${combinedContent.substring(0,8000)}\n\nData:`; break;
            case 'contacts': title = `Contacts: "${selectedOrganizerGroup.groupName}"`; prompt = `Scan text for contacts (email, phone, LinkedIn). List as markdown bullets or "None found." Content:\n${combinedContent.substring(0,8000)}\n\nContacts:`; break;
             case 'analyzeContent': title = `Analysis: "${selectedOrganizerGroup.groupName}"`; prompt = `Analyze content (${selectedOrganizerGroup.tabIds.length} pages) for "${selectedOrganizerGroup.groupName}". Identify topics, sentiment, arguments, bias. Markdown. Content:\n${combinedContent.substring(0,8000)}\n\nAnalysis:`; break;
            default: throw new Error(`Unknown action: ${actionType}`);
        }
        session = await createSession(); const res = await session.prompt(prompt);
        if (el.results) { const resultsContainer = el.results; const actionResultDiv = document.createElement('div'); actionResultDiv.className = 'dashboard-card ai-action-result'; actionResultDiv.innerHTML = `<h3>${title}</h3><div>${renderMarkdown(res)}</div>`; const groupContainer = resultsContainer.querySelector('.organizer-groups-container'); resultsContainer.insertBefore(actionResultDiv, groupContainer?.nextSibling || null); actionResultDiv.scrollIntoView({ behavior: 'smooth' }); }
        updateStatus('organizer', '✅ Action complete!', 'success'); showToast(title, 'AI action done.', 'success');
    } catch (err) { console.error(`Organizer action "${actionType}" fail:`, err); updateStatus('organizer', `Error: ${err.message}`, 'error'); showError(`Action Failed`, err.message); }
    finally { loader('organizer', false); if (session) { try { await session.destroy(); } catch (e) {} } }
}

// --- Scribe ---
async function startScribe() {
    if (el.scribeStart) el.scribeStart.style.display = 'none'; if (el.scribeStop) { el.scribeStop.style.display = 'block'; el.scribeStop.style.animation = 'pulse 1.5s ease infinite'; }
    updateStatus('scribe', '🔴 Recording...', 'info'); showToast('Recording Started', 'Capturing clicks...', 'info');
    if(el.results) el.results.innerHTML = '<p>Recording clicks...</p>'; currentScribeSteps = [];
    if (el.scribePanel) el.scribePanel.style.display = 'none'; if (el.scribeMsgs) el.scribeMsgs.innerHTML = '';
    try { const resp = await chrome.runtime.sendMessage({ action: 'startScribeRecording' }); if (resp?.error) throw new Error(resp.error); console.log("Start msg ack by SW."); }
    catch (e) { console.error("Start Scribe fail:", e); showError("Scribe Error", `Start failed: ${e.message}`); if (el.scribeStart) el.scribeStart.style.display = 'block'; if (el.scribeStop) el.scribeStop.style.display = 'none'; updateStatus('scribe', 'Start Failed', 'error'); }
}
async function stopScribe() {
    updateStatus('scribe', 'Processing...', 'info'); loader('scribe', true); if (el.scribeStop) el.scribeStop.disabled = true;
    try { await chrome.runtime.sendMessage({ action: 'stopScribeRecording' }); console.log("Sent stop request. Waiting for steps..."); } // Steps come via 'scribeRecordingStopped' msg
    catch (e) { console.error("Stop Scribe fail:", e); showError("Scribe Error", `Stop failed: ${e.message}`); loader('scribe', false); if (el.scribeStop) el.scribeStop.disabled = false; if (el.scribeStart) el.scribeStart.style.display = 'block'; if (el.scribeStop) el.scribeStop.style.display = 'none'; updateStatus('scribe', 'Stop Failed', 'error'); }
}
async function handleScribeStopUI() { // Called by message listener
    console.log("Processing steps:", currentScribeSteps);
    if (el.scribeStart) el.scribeStart.style.display = 'block'; if (el.scribeStop) { el.scribeStop.style.display = 'none'; el.scribeStop.style.animation = 'none'; el.scribeStop.disabled = false; }
    if (el.scribeMsgs) el.scribeMsgs.innerHTML = '';
    isAiAvailable = await checkAI();
    try {
        if (!currentScribeSteps || currentScribeSteps.length === 0) { if(el.results) el.results.innerHTML = `<div class="placeholder"><h2>No Clicks Recorded</h2></div>`; updateElementVisibility('scribe'); updateStatus('scribe','No clicks recorded.','warning'); return; }
        updateStatus('scribe', 'Generating guide...', 'info'); setViewMode('split');
        if (!isAiAvailable) { showScribeStepsWithoutAI(); updateStatus('scribe','✅ Guide (Basic)','warning'); showToast('Guide Generated (Basic)','AI skipped.','warning'); updateElementVisibility('scribe'); if(el.scribeChat) addChatMessage(el.scribeMsgs, 'AI unavailable.', 'error'); }
        else { await genGuide(); updateStatus('scribe','✅ Guide Ready!','success'); showToast('Guide Generated','Workflow complete!','success'); updateElementVisibility('scribe'); }
    } catch (err) { console.error("Guide gen error:", err); updateStatus('scribe',`Guide Failed: ${err.message}`,'error'); if (currentScribeSteps?.length > 0 && el.results && !el.results.querySelector('.scribe-step')) { showScribeStepsWithoutAI(); updateElementVisibility('scribe'); if(el.scribeChat) addChatMessage(el.scribeMsgs, `AI guide error: ${err.message}`, 'error'); } else { showError("Scribe Error", `Guide failed: ${err.message}`); updateElementVisibility('scribe'); } }
    finally { loader('scribe', false); }
}
function showScribeStepsWithoutAI() {
     if (!el.results) return; let html = `<div class="scribe-guide-container"><h2>📝 Workflow Steps</h2>`;
      (currentScribeSteps || []).forEach((step, i) => { html += `<div class="scribe-step"><div class="scribe-step-header"><span class="scribe-step-number">${i+1}</span><strong>${esc(step.action)}</strong></div><p><i>${esc(step.details || '(No details)')}</i></p>${step.screenshotDataUrl ? `<img src="${step.screenshotDataUrl}" alt="Step ${i+1}">` : ''}</div>`; });
     html += '</div>'; el.results.innerHTML = html;
}
async function genGuide() {
    if (!el.results) return; let session = null; let html = `<div class="scribe-guide-container"><h2>📝 AI Workflow Guide</h2>`;
    try { session = await createSession();
        for (let i = 0; i < currentScribeSteps.length; i++) { const step = currentScribeSteps[i]; const prompt = `Single sentence instruction for action: "${step.action}" on element "${step.details||'element'}". Imperative verb. Concise. Example: "Click 'Login'". Instruction:`; updateStatus('scribe', `Generating Step ${i+1}/${currentScribeSteps.length}...`, 'info'); let txt = `Action: ${step.action}`; try { const result = await session.prompt(prompt); txt = result.replace(/^instruction:\s*/i,'').trim(); } catch (promptErr) { console.warn(`AI step ${i+1} fail:`, promptErr); if (session) { try{await session.destroy(); session=null;}catch(e){} session = await createSession();} } html += `<div class="scribe-step"><div class="scribe-step-header"><span class="scribe-step-number">${i+1}</span><strong>${esc(step.action)}</strong></div><p>${esc(txt)}</p>${step.screenshotDataUrl ? `<img src="${step.screenshotDataUrl}" alt="Step ${i+1}">` : ''}</div>`; }
    } catch (err) { console.error("AI Guide Gen Error:", err); showScribeStepsWithoutAI(); throw err; }
    finally { html += '</div>'; if (el.results && !el.results.querySelector('.error')) el.results.innerHTML = html; if (session) { try { await session.destroy(); } catch (e) {} } }
}
async function generalize() { if (!isAiAvailable || !currentScribeSteps?.length) return; const steps = currentScribeSteps.map((s,i)=>`Step ${i+1}: ${s.action} on "${s.details||'el'}"`).join('\n'); const prompt = `Analyze steps. Identify task. Create reusable markdown template/checklist with generic placeholders (e.g., "[Username Field]"). Steps:\n${steps.substring(0,4000)}\n\nTask: [AI task]\n\nTemplate:`; await aiAction(prompt, 'Generalizing', 'scribe'); }
async function analyzeWorkflow() { if (!isAiAvailable || !currentScribeSteps?.length) return; const steps = currentScribeSteps.map((s,i)=>`Step ${i+1}: ${s.action} on "${s.details||'el'}"`).join('\n'); const prompt = `Analyze steps for optimizations (redundancy, inefficiency). Suggest markdown bullets or "None found." Steps:\n${steps.substring(0,4000)}\n\nSuggestions:`; await aiAction(prompt, 'Analyzing', 'scribe'); }
function exportScribeText() { if (!currentScribeSteps?.length) return; let content = `Workflow Guide - ${new Date().toLocaleString()}\n\n`; const guide = el.results?.querySelector('.scribe-guide-container'); if (guide) { guide.querySelectorAll('.scribe-step').forEach(s => { content += `Step ${s.querySelector('.scribe-step-number')?.textContent}: ${s.querySelector('strong')?.textContent}\nInstruction: ${s.querySelector('p')?.textContent}\n\n`; }); } else { currentScribeSteps.forEach((s, i) => content += `Step ${i+1}: ${s.action}\nDetails: ${s.details||'N/A'}\n\n`); } downloadFile(content, `workflow-${Date.now()}.txt`, 'text/plain'); updateStatus('scribe','📥 Exported TXT','success'); }
function exportScribeJson() { if (!currentScribeSteps?.length) return; const data = currentScribeSteps.map(s=>({action:s.action,details:s.details,timestamp:s.timestamp})); downloadFile(JSON.stringify(data, null, 2), `workflow-${Date.now()}.json`, 'application/json'); updateStatus('scribe','📥 Exported JSON','success'); }
async function exportScribePdf() { if (!currentScribeSteps?.length || typeof jsPDF === 'undefined') return; updateStatus('scribe','Generating PDF...','info'); loader('scribe', true); try { const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y=15; const margin=15, pageH=doc.internal.pageSize.height, maxW=doc.internal.pageSize.width-margin*2; doc.setFontSize(18).text("Workflow Guide", margin, y); y+=10; doc.setFontSize(10).setTextColor(150).text(`Generated: ${new Date().toLocaleString()}`, margin, y); y+=15; doc.setTextColor(0).setFontSize(12); const guide = el.results?.querySelector('.scribe-guide-container'); if (!guide) throw new Error("Guide content not found."); const steps = guide.querySelectorAll('.scribe-step'); for (let i = 0; i < steps.length; i++) { const s = steps[i]; const num=s.querySelector('.scribe-step-number')?.textContent||(i+1); const act=s.querySelector('strong')?.textContent||'Act'; const instr=s.querySelector('p')?.textContent||''; const img=s.querySelector('img'); if(y>pageH-margin-30){doc.addPage();y=margin;} doc.setFont(undefined,'bold').text(`Step ${num}: ${act}`, margin, y); y+=7; doc.setFont(undefined,'normal'); const lines=doc.splitTextToSize(instr, maxW); doc.text(lines, margin, y); y+=lines.length*5+5; if(img?.src?.startsWith('data:image')){ try{ const imgData=img.src; const props=doc.getImageProperties(imgData); const w=maxW*0.8, h=(props.height*w)/props.width; if(y+h>pageH-margin){doc.addPage();y=margin;} doc.addImage(imgData,'JPEG',margin+(maxW*0.1),y,w,h); y+=h+10; }catch(imgErr){console.warn(`PDF Img Err ${num}:`,imgErr); if(y>pageH-margin-10){doc.addPage();y=margin;} doc.setTextColor(150).text("(Screenshot fail)",margin,y); y+=7; doc.setTextColor(0);} } y+=5; } doc.save(`workflow-${Date.now()}.pdf`); updateStatus('scribe','📥 Exported PDF','success'); } catch (e) { console.error("PDF Export Fail:", e); showError("PDF Export Failed", e.message); updateStatus('scribe','PDF Export Failed','error'); } finally { loader('scribe', false); } }

// --- Utilities ---
async function getPage() { try { const [tab]=await chrome.tabs.query({active:true,currentWindow:true}); if(!tab)throw new Error('No active tab.'); if(tab.url?.startsWith('chrome')) throw new Error('Cannot access internal pages.'); const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{return{content:document.body?.innerText||'',url:location.href,title:document.title||''};}}); if(result===undefined) throw new Error("Cannot access page content (restricted?)."); return result; } catch(err){ console.error("getPage Error:",err); throw new Error(`Cannot get page content: ${err.message}.`); } }
function updateStatus(type,msg,lvl='info'){const s=el[`${type}Status`],t=el[`${type}StatusText`];if(!s||!t)return;s.style.display='block';s.className=`status-message ${lvl}`;t.textContent=msg;if(lvl!=='error'&&!msg.includes('...'))setTimeout(()=>{if(t.textContent===msg)s.style.display='none';},3000);}
function loader(type,show=true){const l=el[`${type}Loader`];if(l)l.style.display=show?'block':'none';}
function showError(title,msg){if(!el.results)return;const err=document.createElement('div');err.className='placeholder error';err.innerHTML=`<div style="font-size:32px">⚠️</div><h2>${title}</h2><p style="white-space:pre-wrap;font-family:monospace;">${esc(msg)}</p><button id="reloadErrBtn">Reload Panel</button><button id="setupErrBtn">Open Setup/Flags</button>`;el.results.innerHTML='';el.results.appendChild(err);err.querySelector('#reloadErrBtn').addEventListener('click',()=>location.reload());err.querySelector('#setupErrBtn').addEventListener('click',()=>msg.includes("flags")?chrome.tabs.create({url:'chrome://flags'}):chrome.runtime.openOptionsPage());}
function showLoadingAnimation(){if(el.results)el.results.innerHTML=`<div class="placeholder"><div class="loader"></div><h2>Initializing...</h2></div>`;}
function hideLoadingAnimation(){if(el.results?.querySelector('.loader'))el.results.innerHTML=`<div class="placeholder"><div class="placeholder-icon">🔮</div><h2>Welcome</h2><p>Select action</p></div>`;}
function showToast(title,msg,type='info',dur=3000){const colors={info:'var(--accent)',success:'var(--success)',error:'var(--error)',warning:'var(--warning)'};const t=document.createElement('div');t.style.cssText=`position:fixed;top:20px;right:20px;background:${colors[type]};color:white;padding:14px 22px;border-radius:8px;box-shadow:var(--shadow-lg);z-index:10000;animation:slideInRight 0.4s ease,fadeOut 0.4s ease ${dur/1000-0.4}s forwards;max-width:320px;font-size:13px;`;t.innerHTML=`<div style="font-weight:600;">${title}</div><div>${msg}</div>`;document.body.appendChild(t);setTimeout(()=>{if(document.body.contains(t)){t.style.animation=`fadeOut 0.4s ease forwards`;setTimeout(()=>t.remove(),400);}},dur);}
function copyReport(){if(!currentAuditReport)return;navigator.clipboard.writeText(currentAuditReport).then(()=>{showToast('Copied','Report copied!','success');if(el.copyBtn){el.copyBtn.textContent='Copied!';setTimeout(()=>el.copyBtn.innerHTML='📋 Copy',2000);}}).catch(err=>{showToast('Copy Error',err.message,'error');});}
function exportAuditMarkdown(){if(!currentAuditReport)return;let fn=`audit-${Date.now()}.md`;if(currentAuditUrl){try{fn=`audit-${new URL(currentAuditUrl).hostname}-${Date.now()}.md`;}catch(e){}}downloadFile(currentAuditReport,fn,'text/markdown');showToast('Exported','.md downloaded!','success');}
function exportAuditJson(){if(!currentAuditData)return;let fn=`audit-data-${Date.now()}.json`;if(currentAuditUrl){try{fn=`audit-data-${new URL(currentAuditUrl).hostname}-${Date.now()}.json`;}catch(e){}}downloadFile(JSON.stringify(currentAuditData,null,2),fn,'application/json');showToast('Exported','.json downloaded!','success');}
async function exportAuditPdf(){if(!currentAuditReport||typeof jsPDF==='undefined')return;updateStatus('audit','Generating PDF...','info');loader('audit',true);try{const{jsPDF}=window.jspdf;const doc=new jsPDF();let y=15,m=15,pH=doc.internal.pageSize.height,maxW=doc.internal.pageSize.width-m*2;let title="Audit";if(currentAuditUrl)try{title=new URL(currentAuditUrl).hostname;}catch(e){}doc.setFontSize(18).text(title,m,y);y+=10;doc.setFontSize(10).setTextColor(150).text(`${new Date().toLocaleString()}`,m,y);y+=15;doc.setTextColor(0).setFontSize(12);const lines=currentAuditReport.replace(/^# (.*)/gm,'##H1##$1').replace(/^## (.*)/gm,'##H2##$1').replace(/^### (.*)/gm,'##H3##$1').replace(/^- (.*)/gm,'##B##$1').split('\n');for(const l of lines){if(y>pH-m){doc.addPage();y=m;}if(l.startsWith('##H1##')){doc.setFont(undefined,'bold').setFontSize(18).text(l.replace('##H1##',''),m,y);y+=10;}else if(l.startsWith('##H2##')){doc.setFont(undefined,'bold').setFontSize(14).text(l.replace('##H2##',''),m,y);y+=8;}else if(l.startsWith('##H3##')){doc.setFont(undefined,'bold').setFontSize(12).text(l.replace('##H3##',''),m,y);y+=7;}else if(l.startsWith('##B##')){doc.setFont(undefined,'normal').setFontSize(11).text(`• ${l.replace('##B##','')}`,m+5,y);y+=6;}else{doc.setFont(undefined,'normal').setFontSize(11);const sl=doc.splitTextToSize(l,maxW);doc.text(sl,m,y);y+=sl.length*5;}y+=2;}let fn=`audit-${Date.now()}.pdf`;if(currentAuditUrl)try{fn=`audit-${new URL(currentAuditUrl).hostname}-${Date.now()}.pdf`;}catch(e){}doc.save(fn);updateStatus('audit','📥 PDF Exported','success');}catch(e){showError("PDF Export Failed",e.message);updateStatus('audit','PDF Export Fail','error');}finally{loader('audit',false);}}
function toggleFullscreen(){if(el.wrapper.classList.contains('results-only')){setViewMode('split');el.fullscreenBtn.innerHTML='🔍';el.fullscreenBtn.title='Fullscreen';}else{setViewMode('results');el.fullscreenBtn.innerHTML='📖';el.fullscreenBtn.title='Split View';}}
function esc(t){if(!t)return'';const d=document.createElement('div');d.textContent=t;return d.innerHTML;}

// --- Chat ---
async function chat(type) {
    if (isAiAvailable !== true && !await checkAI()) { showError("AI Unavailable", "Chat disabled."); return; }
    const inp = el[`${type}Input`], msgs = el[`${type}Msgs`]; if (!inp || !msgs) return console.error(`Chat elements missing: ${type}`);
    const msg = inp.value.trim(); if (!msg) return; addChatMessage(msgs, msg, 'user'); inp.value = ''; console.log(`[Chat ${type}] User: ${msg}`);
    let ctx = '', base = " Assistant for Spectrum AI Pro. Be concise. Use ONLY provided context. If context empty/irrelevant, state info lacking & suggest user run action (Audit, Organize, Record)."; let fullPrompt = '';
    try { if (type === 'auditor') { ctx = currentAuditReport ? `Context: Audit Report:\n${currentAuditReport.substring(0,2000)}\n\n` : 'Context: No audit run.\n\n'; } else if (type === 'organizer') { const info = currentTabGroups.length>0?currentTabGroups.map(g=>`"${g.groupName}": ${g.tabIds.length} tabs`).join('; '):''; ctx = info ? `Context: Suggested groups: ${info}.\n\n` : 'Context: No tabs organized.\n\n'; } else if (type === 'scribe') { const steps = currentScribeSteps.length>0?currentScribeSteps.map((s,i)=>`Step ${i+1}: ${s.action} on "${s.details||'el'}"`).slice(0,10).join('\n'):''; ctx = steps ? `Context: Workflow (10 steps):\n${steps}\n\n` : 'Context: No workflow recorded.\n\n'; } fullPrompt = `${ctx}User Question: ${msg}\n\n${base}`; console.log(`[Chat ${type}] Prompt ctx: ${ctx.substring(0,100)}...`); }
    catch (ctxErr) { console.error(`Ctx prep error (${type}):`, ctxErr); addChatMessage(msgs, `❌ Ctx Error: ${ctxErr.message}`, 'error'); return; }
    const thinkDiv = document.createElement('div'); thinkDiv.className = 'chat-message ai thinking'; thinkDiv.innerHTML = `<p>💭 Thinking...</p>`; msgs.appendChild(thinkDiv); msgs.scrollTop = msgs.scrollHeight;
    let session = null;
    try { session = await createSession(); console.log(`[Chat ${type}] Prompting AI...`); const res = await session.prompt(fullPrompt); console.log(`[Chat ${type}] AI response.`); if(thinkDiv.parentNode===msgs)msgs.removeChild(thinkDiv); addChatMessage(msgs, res, 'ai'); }
    catch (err) { console.error(`AI chat error (${type}):`, err); if(thinkDiv.parentNode===msgs)msgs.removeChild(thinkDiv); addChatMessage(msgs, `❌ AI Error: ${err.message}. Ensure AI enabled & Chrome restarted.`, 'error'); isAiAvailable = false; disableAiFeatures(); }
    finally { if (session) { try { await session.destroy(); } catch (e) {} } }
}
function addChatMessage(msgsContainer, text, role) { const div = document.createElement('div'); div.className = `chat-message ${role}`; if(role==='error'){div.style.background='rgba(239,68,68,0.2)';div.style.color='#f87171';} if(role==='ai'){div.innerHTML=renderMarkdown(text);}else{div.textContent=text;} msgsContainer.appendChild(div); requestAnimationFrame(()=>msgsContainer.scrollTop=msgsContainer.scrollHeight); }

// --- History ---
async function loadHist() { try { const {history=[]}=await chrome.storage.local.get('history'); if (history.length === 0) { el.results.innerHTML=`<div class="placeholder"><h2>No History</h2></div>`; return; } let html = '<div id="history-list-container">'; history.forEach((item,idx)=>{let host='Unknown';try{if(item.url?.startsWith('http'))host=new URL(item.url).hostname;else host=item.url||host;}catch(e){}html+=`<div class="history-item" data-id="${item.id}"><div class="history-item-url">${esc(host)}</div><div class="history-item-date">🕒 ${new Date(item.date).toLocaleString()}</div></div>`;}); html+='</div>'; el.results.innerHTML=html; document.querySelectorAll('.history-item').forEach(item=>item.addEventListener('click',async function(){await loadAudit(this.dataset.id);})); } catch(e){showError('History Load Fail',e.message);} }
async function loadAudit(id) { try { const {history=[]}=await chrome.storage.local.get('history'); const item=history.find(h=>h.id===id); if(item){ currentAuditReport=item.report; currentAuditUrl=item.url; currentAuditData=item.data; switchTab('auditor'); setViewMode('split'); if(currentAuditData) await renderDash(currentAuditData); else el.results.innerHTML=`<div><pre>${renderMarkdown(item.report||'N/A')}</pre></div>`; updateElementVisibility('auditor'); updateStatus('audit',`Loaded: ${item.url}`,'info'); showToast('Loaded','Report loaded!','success'); } else { showToast('Error','History item not found.','error'); } } catch(e){showError('Load Audit Fail',e.message);} }
function searchHist(e){const term=e.target.value.toLowerCase();const container=document.getElementById('history-list-container');if(!container)return;container.querySelectorAll('.history-item').forEach(item=>{const url=item.querySelector('.history-item-url')?.textContent.toLowerCase()||'';const date=item.querySelector('.history-item-date')?.textContent.toLowerCase()||'';item.style.display=(url.includes(term)||date.includes(term))?'block':'none';});}
async function clearHist(){if(confirm('Clear ALL history?')){try{await chrome.storage.local.set({history:[]});loadHist();showToast('Cleared','History cleared!','success');}catch(e){showToast('Clear Fail',e.message,'error');}}}
async function saveAudit(url,report,data){try{const{history=[]}=await chrome.storage.local.get('history');const auditData=data||{scores:{},issues:{},score:0,health:0};const entry={id:Date.now().toString(),url,report,data:auditData,date:new Date().toISOString()};history.unshift(entry);if(history.length>100)history.pop();await chrome.storage.local.set({history});console.log("Audit saved.");}catch(e){showToast('Save Fail',e.message,'error');}}
async function exportHistory() { try { const {history=[]}=await chrome.storage.local.get('history'); if(history.length===0)return showToast('No History','Nothing to export.','warning'); downloadFile(JSON.stringify(history, null, 2), `spectrum-ai-history-${Date.now()}.json`, 'application/json'); showToast('Exported','History downloaded!','success'); } catch (e) { showError("Export Failed", e.message); } }
function importHistory(event) { const file=event.target.files[0]; if (!file) return; const reader=new FileReader(); reader.onload=async(e)=>{ try { const imported=JSON.parse(e.target.result); if (!Array.isArray(imported)||(imported.length>0&&(!imported[0].id||!imported[0].url||!imported[0].date||!imported[0].report))){throw new Error('Invalid format. Need array with id, url, date, report.');} if(!confirm(`Import ${imported.length} items? Merges & overwrites duplicates.`)){event.target.value=null;return;} const{history:existing=[]}=await chrome.storage.local.get('history'); const map=new Map(); existing.forEach(i=>map.set(i.id,i)); imported.forEach(i=>map.set(i.id,i)); const merged=Array.from(map.values()).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,100); await chrome.storage.local.set({history:merged}); showToast('Import Complete',`History updated. Total: ${merged.length}.`,'success'); const activeTab=document.querySelector('.tab-link.active')?.dataset.tab; if(activeTab==='history')loadHist(); } catch(err){showError('Import Failed',err.message);} finally{event.target.value=null;} }; reader.onerror=(err)=>{showError('Import Failed','Could not read file.');event.target.value=null;}; reader.readAsText(file); }
function downloadFile(content, filename, contentType) { try { const a = document.createElement('a'); const file = new Blob([content], { type: contentType }); a.href = URL.createObjectURL(file); a.download = filename; a.click(); URL.revokeObjectURL(a.href); } catch (e) { showToast('Download Failed', e.message, 'error'); } }

console.log('✅ Spectrum AI Pro Sidepanel Initialized (v3.4)');