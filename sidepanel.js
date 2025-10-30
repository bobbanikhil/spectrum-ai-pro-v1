/**
 * 🏆 SPECTRUM AI PRO V3.3 - DASHBOARD EDITION
 * Google Chrome Built-in AI Challenge 2025
 *
 * This version adds an enhanced dashboard to the Auditor report:
 * - Added: "Key Metrics" dashboard with Overall Score, Best Area, and Worst Area.
 * - Added: "Executive Summary" section to the AI prompt for a top-level summary.
 * - Fixed: `checkAIAvailability` now accepts 'available' status.
 * - Fixed: All `createAISession` calls now include `outputLanguage: 'en'`.
 * - Fixed: Tab switching (`switchTab`) now correctly clears/restores all UI elements.
 * - Fixed: Organizer (`organizeTabs`) now correctly parses AI JSON responses.
 * - Fixed: Doc Flow (`generateWorkflowGuide`) is rewritten to be functional.
 * - Fixed: Auditor (`runAudit`) uses a single, reliable streaming call.
 */

'use strict';

// Using jsPDF and html2canvas for PDF export
const { jsPDF } = window.jspdf;

// --- GLOBAL STATE ---
let currentAuditReport = ''; // Stores raw Markdown for the audit
let currentAuditUrl = '';
let currentTabGroups = [];
let isRecording = false;
let docFlowSteps = [];
let activeDocFlowTabId = null;

// --- NEW STATE VARIABLES FOR BUGFIXES ---
let currentAuditReportHTML = '';      // Caches the rendered HTML for the Auditor tab
let currentOrganizerReportHTML = ''; // Caches the rendered HTML for the Organizer tab
let currentDocFlowReportHTML = '';  // Caches the rendered HTML for the Doc Flow tab
let currentValidTabs = [];          // Caches the tab list for the Organizer

const elements = {};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Spectrum AI Pro V3.3 - Dashboard Edition');
    cacheElements();
    setupEventListeners();

    // Show initial placeholder
    elements.results.innerHTML = getPlaceholderHTML('auditor');

    // Check for AI
    const aiReady = await checkAIAvailability();

    if (!aiReady) {
        console.error('❌ AI not ready');
        showError("AI system not detected or permission denied.", "Please enable AI features in chrome://flags (see setup page) and reload the extension.");
        // Disable all buttons
        document.querySelectorAll('button').forEach(btn => btn.disabled = true);
        document.querySelectorAll('input').forEach(inp => inp.disabled = true);
        return;
    }

    updateStatus('audit', 'Ready to analyze', 'info');
    updateStatus('organizer', 'Ready to organize tabs', 'info');
    updateStatus('docFlow', 'Ready to record workflow', 'info');

    // Listen for messages from popup or service worker
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'runAuditFromPopup') {
            switchTab('auditor');
            runAudit();
        } else if (request.action === 'organizeTabsFromPopup') {
            switchTab('organizer');
            organizeTabs();
        } else if (request.action === 'startDocFlowRecording') {
            // This message comes from the service worker, triggered by popup
            switchTab('docFlow');
            startDocFlow();
        }
    });

    console.log('✅ Spectrum AI Pro V3.3 ready!');
});

// CACHE DOM ELEMENTS
function cacheElements() {
    elements.viewModeBtns = document.querySelectorAll('.view-mode-btn');
    elements.contentWrapper = document.querySelector('.content-wrapper');
    elements.tabs = document.querySelectorAll('.tab-link');
    elements.tabContents = document.querySelectorAll('.tab-content');

    // Auditor
    elements.auditButton = document.getElementById('auditButton');
    elements.auditStatus = document.getElementById('auditStatus');
    elements.auditStatusText = document.getElementById('statusText');
    elements.auditLoader = document.getElementById('auditLoader');
    elements.aiActionsPanel = document.getElementById('aiActionsPanel');
    elements.summarizeButton = document.getElementById('summarizeButton');
    elements.proofreadButton = document.getElementById('proofreadButton');
    elements.rewriteTitleButton = document.getElementById('rewriteTitleButton');
    elements.auditorChatContainer = document.getElementById('auditorChatContainer');
    elements.auditorChatMessages = document.getElementById('auditorChatMessages');
    elements.auditorChatInput = document.getElementById('auditorChatInput');
    elements.auditorChatSend = document.getElementById('auditorChatSend');

    // Organizer
    elements.organizeTabsButton = document.getElementById('organizeTabsButton');
    elements.organizerStatus = document.getElementById('organizerStatus');
    elements.organizerStatusText = document.getElementById('organizerStatusText');
    elements.organizerLoader = document.getElementById('organizerLoader');
    elements.organizerChatContainer = document.getElementById('organizerChatContainer');
    elements.organizerChatMessages = document.getElementById('organizerChatMessages');
    elements.organizerChatInput = document.getElementById('organizerChatInput');
    elements.organizerChatSend = document.getElementById('organizerChatSend');

    // Doc Flow
    elements.startDocFlowButton = document.getElementById('startDocFlowButton');
    elements.stopDocFlowButton = document.getElementById('stopDocFlowButton');
    elements.manualScreenshotButton = document.getElementById('manualScreenshotButton');
    elements.docFlowStatus = document.getElementById('docFlowStatus');
    elements.docFlowStatusText = document.getElementById('docFlowStatusText');
    elements.docFlowLoader = document.getElementById('docFlowLoader');
    elements.docFlowActionsPanel = document.getElementById('docFlowActionsPanel');
    elements.generalizeWorkflowButton = document.getElementById('generalizeWorkflowButton');
    elements.generateQaButton = document.getElementById('generateQaButton');
    elements.downloadDocFlowPdfButton = document.getElementById('downloadDocFlowPdfButton');
    elements.docFlowChatContainer = document.getElementById('docFlowChatContainer');
    elements.docFlowChatMessages = document.getElementById('docFlowChatMessages');
    elements.docFlowChatInput = document.getElementById('docFlowChatInput');
    elements.docFlowChatSend = document.getElementById('docFlowChatSend');

    // History
    elements.historySearchInput = document.getElementById('historySearchInput');
    elements.clearHistoryButton = document.getElementById('clearHistoryButton');
    elements.exportHistoryButton = document.getElementById('exportHistoryButton');
    elements.importHistoryButton = document.getElementById('importHistoryButton');

    // Results Panel
    elements.results = document.getElementById('results');
    elements.reportInfo = document.getElementById('reportInfo');
    elements.reportUrl = document.getElementById('reportUrl');
    elements.reportDate = document.getElementById('reportDate');
    elements.copyReportButton = document.getElementById('copyReportButton');
    elements.downloadPdfButton = document.getElementById('downloadPdfButton');
    elements.downloadJsonButton = document.getElementById('downloadJsonButton');
}

// SETUP ALL EVENT LISTENERS
function setupEventListeners() {
    // View modes
    elements.viewModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.viewModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            elements.contentWrapper.className = 'content-wrapper';

            if (mode === 'split') elements.contentWrapper.classList.add('split-view');
            else if (mode === 'results') elements.contentWrapper.classList.add('results-only');
            else if (mode === 'chat') elements.contentWrapper.classList.add('chat-only');
        });
    });

    // Tab buttons
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Auditor
    elements.auditButton.addEventListener('click', runAudit);
    elements.summarizeButton.addEventListener('click', summarizeReport);
    elements.proofreadButton.addEventListener('click', proofreadReport);
    elements.rewriteTitleButton.addEventListener('click', rewriteTitle);
    elements.auditorChatSend.addEventListener('click', () => sendChatMessage('auditor'));
    elements.auditorChatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage('auditor');
        }
    });

    // Organizer
    elements.organizeTabsButton.addEventListener('click', organizeTabs);
    elements.organizerChatSend.addEventListener('click', () => sendChatMessage('organizer'));
    elements.organizerChatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage('organizer');
        }
    });

    // Doc Flow
    elements.startDocFlowButton.addEventListener('click', startDocFlow);
    elements.stopDocFlowButton.addEventListener('click', stopDocFlow);
    elements.manualScreenshotButton.addEventListener('click', takeManualScreenshot);
    elements.generalizeWorkflowButton.addEventListener('click', generalizeWorkflow);
    elements.generateQaButton.addEventListener('click', generateQa);
    elements.downloadDocFlowPdfButton.addEventListener('click', () => downloadPdf('docFlow'));
    elements.docFlowChatSend.addEventListener('click', () => sendChatMessage('docFlow'));
    elements.docFlowChatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage('docFlow');
        }
    });

    // History
    elements.historySearchInput.addEventListener('input', searchHistory);
    elements.clearHistoryButton.addEventListener('click', clearHistory);
    elements.exportHistoryButton.addEventListener('click', exportHistory);
    elements.importHistoryButton.addEventListener('click', importHistory);

    // Report Actions
    elements.copyReportButton.addEventListener('click', copyReport);
    elements.downloadPdfButton.addEventListener('click', () => downloadPdf('auditor'));
    elements.downloadJsonButton.addEventListener('click', downloadJson);
}


// --- ★★★ BUGFIXED: TAB SWITCHING ★★★ ---
function switchTab(tabName) {
    // 1. Switch active tab link
    elements.tabs.forEach(tab => {
        const isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive.toString());
    });

    // 2. Switch active tab content panel (in the left column)
    elements.tabContents.forEach(content => {
        const isActive = content.id === tabName;
        content.classList.toggle('active', isActive);
        content.hidden = !isActive;
    });

    // 3. --- FIX: Reset the right "Results" panel ---
    // Hide all action/export panels
    elements.aiActionsPanel.style.display = 'none';
    elements.docFlowActionsPanel.style.display = 'none';
    elements.auditorChatContainer.style.display = 'none';
    elements.organizerChatContainer.style.display = 'none';
    elements.docFlowChatContainer.style.display = 'none';
    elements.copyReportButton.style.display = 'none';
    elements.downloadPdfButton.style.display = 'none';
    elements.downloadJsonButton.style.display = 'none';
    elements.reportInfo.style.display = 'none';

    // Clear results panel
    elements.results.innerHTML = '';

    // 4. --- FIX: Restore the correct content for the tab ---
    switch (tabName) {
        case 'auditor':
            if (currentAuditReportHTML) {
                // Restore cached report
                elements.results.innerHTML = currentAuditReportHTML;
                // Re-find and assign chart canvas if it exists
                const chartCanvas = elements.results.querySelector('#auditScoreChart');
                if (chartCanvas && currentAuditReport.scores) {
                    renderAuditScoreChart(chartCanvas, currentAuditReport.scores);
                }
                elements.aiActionsPanel.style.display = 'grid';
                elements.auditorChatContainer.style.display = 'block';
                elements.copyReportButton.style.display = 'block';
                elements.downloadPdfButton.style.display = 'block';
                elements.downloadJsonButton.style.display = 'block';
                setReportInfo(currentAuditUrl, currentAuditReport.date);
            } else {
                elements.results.innerHTML = getPlaceholderHTML('auditor');
            }
            break;
        case 'organizer':
            if (currentOrganizerReportHTML) {
                // Restore cached report
                elements.results.innerHTML = currentOrganizerReportHTML;
                elements.organizerChatContainer.style.display = 'block';
                setupOrganizerEventDelegation(); // Re-attach listeners
            } else {
                elements.results.innerHTML = getPlaceholderHTML('organizer');
            }
            break;
        case 'docFlow':
            if (currentDocFlowReportHTML) {
                // Restore cached guide
                elements.results.innerHTML = currentDocFlowReportHTML;
                elements.docFlowActionsPanel.style.display = 'grid';
                elements.docFlowChatContainer.style.display = 'block';
            } else {
                elements.results.innerHTML = getPlaceholderHTML('docFlow');
            }
            // Sync recording button state
            elements.startDocFlowButton.style.display = isRecording ? 'none' : 'block';
            elements.stopDocFlowButton.style.display = isRecording ? 'block' : 'none';
            elements.manualScreenshotButton.style.display = isRecording ? 'block' : 'none';
            break;
        case 'history':
            // History tab content is in the LEFT panel, not the results panel.
            // The results panel should just show a placeholder.
            elements.results.innerHTML = getPlaceholderHTML('history');
            loadHistory(); // This populates the left panel
            break;
        default:
            elements.results.innerHTML = getPlaceholderHTML('auditor');
    }
}

// --- ★★★ FIXED: AI AVAILABILITY CHECK ★★★ ---
async function checkAIAvailability() {
    try {
        if (typeof self.LanguageModel === 'undefined') {
            console.error('self.LanguageModel is not defined.');
            return false;
        }
        const availability = await self.LanguageModel.availability();

        // FIX: Accept 'available' as well as 'readily'
        if (availability !== 'readily' && availability !== 'available') {
             console.error('AI Model is not ready. Status:', availability);
             return false;
        }

        const session = await createAISession();
        if (session) {
            session.destroy();
            return true;
        }
        return false;
    } catch(e) {
        console.error('AI Availability Check Failed:', e);
        return false;
    }
}

// --- ★★★ AUDITOR FUNCTIONS (REWRITTEN FOR RELIABILITY) ★★★ ---

/**
 * Parses scores (e.g., "Score: 85/100") from the audit markdown.
 * @param {string} markdown - The markdown text of the report.
 * @returns {object} An object of scores, e.g., { SEO: 85, Accessibility: 70 }.
 */
function parseScoresFromMarkdown(markdown) {
    const scores = {};
    // Regex to find "Score: XX/100" under a heading
    const regex = /##\s*\d*\.?\s*([a-zA-Z\s/()]+?)\s*\n\*\*Score:\s*(\d+)\/100/g;
    let match;

    while ((match = regex.exec(markdown)) !== null) {
        // Clean up the label: "1. SEO (Search Engine Optimization)" -> "SEO"
        let label = match[1].trim();
        if (label.includes('(')) {
            label = label.substring(0, label.indexOf('(')).trim();
        }
        if (label.includes('&')) {
            label = label.substring(0, label.indexOf('&')).trim();
        }

        const score = parseInt(match[2], 10);
        scores[label] = score;
    }
    return scores;
}

/**
 * ★★★ NEW: Creates HTML for the Key Metrics dashboard cards ★★★
 * @param {object} scores - The scores object from parseScoresFromMarkdown.
 * @returns {string} HTML string for the metrics cards.
 */
function createMetricsDashboardHTML(scores) {
    let overallScore = 0;
    let bestArea = { name: 'N/A', score: -1 };
    let worstArea = { name: 'N/A', score: 101 };
    let count = 0;

    for (const [name, score] of Object.entries(scores)) {
        overallScore += score;
        count++;
        if (score > bestArea.score) {
            bestArea = { name, score };
        }
        if (score < worstArea.score) {
            worstArea = { name, score };
        }
    }

    if (count > 0) {
        overallScore = Math.round(overallScore / count);
    } else {
        overallScore = 0; // Avoid division by zero
    }

    const getScoreColor = (score) => {
        if (score >= 90) return 'var(--success)';
        if (score >= 50) return 'var(--warning)';
        return 'var(--error)';
    };

    // Inline styles for the metric cards, as we can't edit the CSS file
    const cardContainerStyle = `
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 20px;
    `;
    const cardStyle = `
        background-color: #ffffff;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    `;
    const cardTitleStyle = `
        font-size: 14px;
        font-weight: 600;
        color: #475569;
        margin: 0 0 8px 0;
    `;
    const cardValueStyle = (score) => `
        font-size: 28px;
        font-weight: 700;
        color: ${getScoreColor(score)};
        margin: 0;
    `;
     const cardNameStyle = `
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;

    return `
        <div style="${cardContainerStyle}">
            <div style="${cardStyle}">
                <h4 style="${cardTitleStyle}">Overall Score</h4>
                <p style="${cardValueStyle(overallScore)}">${overallScore}</p>
            </div>
            <div style="${cardStyle}">
                <h4 style="${cardTitleStyle}">Best Area</h4>
                <p style="${cardNameStyle}">${bestArea.name}</p>
            </div>
            <div style="${cardStyle}">
                <h4 style="${cardTitleStyle}">Needs Improvement</h4>
                <p style="${cardNameStyle}">${worstArea.name}</p>
            </div>
        </div>
    `;
}


async function runAudit() {
    if (!await checkAIAvailability()) {
        showError("AI is not available. Please check Chrome flags.", "auditor");
        return;
    }

    // Reset state
    elements.auditButton.disabled = true;
    showLoader('audit', true);
    updateStatus('audit', 'Fetching page content...', 'info');
    currentAuditReport = ''; // Clear report object
    currentAuditReportHTML = '';
    elements.results.innerHTML = ''; // Clear previous results
    // Show placeholder instead of skeleton
    elements.results.innerHTML = getPlaceholderHTML('auditor', 'Running Audit...', 'Please wait while the AI analyzes the page.');


    let content, url, title;
    try {
        const pageData = await getPageContent();
        content = pageData.content;
        url = pageData.url;
        title = pageData.title;
        currentAuditUrl = url;
    } catch (error) {
        console.error('Audit error:', error);
        updateStatus('audit', `Failed: ${error.message}`, 'error');
        showError(error.message, 'auditor');
        elements.auditButton.disabled = false;
        showLoader('audit', false);
        return;
    }

    if (!content || !content.trim()) {
        showError('Page content is empty or could not be accessed.', "auditor");
        elements.auditButton.disabled = false;
        showLoader('audit', false);
        return;
    }

    const reportDate = new Date();
    setReportInfo(url, reportDate.toISOString());
    updateStatus('audit', 'Analyzing with AI...', 'info');

    // ★★★ UPDATED SINGLE-CALL PROMPT (with Executive Summary) ★★★
    const prompt = `
        Perform a professional 12-point comprehensive web analysis for the URL: ${url}
        The user is a project manager or developer.
        Be critical, professional, and provide actionable insights.

        Here is the page text (first 4000 chars):
        """
        ${content.substring(0, 4000)}
        """

        **FORMATTING RULES (VERY IMPORTANT):**
        1.  Start with "## 📈 Interactive Score Dashboard".
        2.  On the next line, add the placeholder: [CHART_PLACEHOLDER]
        3.  Next, create a H2 (##) for each of the 12 audit points.
        4.  For each point, provide:
            - A score (e.g., **Score: 85/100**)
            - A concise 1-2 sentence analysis.
            - 2-3 specific, actionable bullet points for improvement.
        5.  **FINALLY**, after all 12 points, add a "## Executive Summary" section with:
            - A brief 2-3 sentence overview.
            - A bulleted list of the **Top 3 Priorities** to fix.


        **AUDIT POINTS:**
        1.  **SEO (Search Engine Optimization):** (Analyze meta tags, keywords, headings)
        2.  **Accessibility (a11y):** (Analyze alt text, contrasts, landmarks)
        3.  **Performance:** (Infer potential issues: large images, complex DOM)
        4.  **Content Quality & Readability:** (Analyze clarity, grammar, tone)
        5.  **Mobile-Friendliness (Inferred):** (Analyze text flow, link proximity)
        6.  **Security (Inferred):** (Check for 'https://', mention mixed content risks)
        7.  **UX/UI Design:** (Analyze layout, call-to-actions, navigation)
        8.  **Technical SEO:** (Analyze URL structure, robots.txt - infer)
        9.  **Conversion Rate Optimization (CRO):** (Analyze clarity of CTAs)
        10. **Error Handling (Inferred):** (Look for error messages in text)
        11. **Brand Voice & Tone:** (Is it consistent and professional?)
        12. **Social Media Integration:** (Mention if social links are present/missing)

        **EXAMPLE OUTPUT STRUCTURE:**
        # 📊 Enhanced Auditor Report

        ## 📈 Interactive Score Dashboard
        [CHART_PLACEHOLDER]

        ## 1. SEO (Search Engine Optimization)
        **Score: 85/100**
        [Analysis]
        - [Action Item 1]
        ...

        ... (all 12 points) ...

        ## Executive Summary
        [Overview sentence 1. Overview sentence 2.]
        - **Top Priority 1:** [Description]
        - **Top Priority 2:** [Description]
        - **Top Priority 3:** [Description]
    `;

    // Create a new div for the streaming response
    const streamingReportDiv = document.createElement('div');
    streamingReportDiv.className = 'results-wrapper';
    elements.results.innerHTML = ''; // Clear placeholder
    elements.results.appendChild(streamingReportDiv);

    let fullResponse = '';
    try {
        const session = await createAISession();
        const stream = await session.promptStreaming(prompt);
        for await (const chunk of stream) {
            fullResponse += chunk;
            // Temporarily render markdown with a cursor to show streaming
            // We remove the placeholder during streaming to avoid it flashing
            streamingReportDiv.innerHTML = renderMarkdown(fullResponse.replace(/\[CHART_PLACEHOLDER\]/g, "") + "▌");
        }
        // Render the final markdown *without* the cursor
        // ***NB:*** We render the *fullResponse* which still contains the placeholder
        streamingReportDiv.innerHTML = renderMarkdown(fullResponse);
        session.destroy();

    } catch (error) {
        console.error('Audit streaming error:', error);
        updateStatus('audit', `Failed: ${error.message}`, 'error');
        showError(error.message, 'auditor');
        elements.auditButton.disabled = false;
        showLoader('audit', false);
        return;
    }

    try {
        // ★★★ FIX STARTS HERE ★★★

        // 1. Parse scores from the full response FIRST
        const scores = parseScoresFromMarkdown(fullResponse);

        // 2. Create the HTML for the new metrics cards
        const metricsDashboardHtml = createMetricsDashboardHTML(scores);

        // 3. Create the HTML for the chart canvas
        const chartHtml = '<div style="height: 350px; position: relative;"><canvas id="auditScoreChart"></canvas></div>';

        // 4. Combine them
        const dashboardContent = metricsDashboardHtml + chartHtml;

        // 5. NOW, replace the placeholder in the *rendered HTML* with our dashboard HTML
        // This avoids running our HTML through the markdown parser
        streamingReportDiv.innerHTML = streamingReportDiv.innerHTML.replace(
            /\[CHART_PLACEHOLDER\]/g,
            dashboardContent
        );

        // ★★★ FIX ENDS HERE ★★★


        // 7. ★★★ USE requestAnimationFrame AND querySelector TO FIX THE TIMING ISSUE ★★★
        requestAnimationFrame(() => {
            // Search inside the specific div, not the whole document
            const chartCanvas = streamingReportDiv.querySelector('#auditScoreChart');
            if (chartCanvas) {
                renderAuditScoreChart(chartCanvas, scores);
            } else {
                // This warning should no longer appear!
                console.warn("Chart canvas not found after render.");
            }
        });

        // 8. Save and finalize report
        currentAuditReport = {
            markdown: fullResponse, // Save the raw markdown (before placeholder replacement)
            scores: scores,
            date: reportDate.toISOString()
        };

        // 9. Cache the final HTML (which now includes the canvas tag)
        currentAuditReportHTML = streamingReportDiv.innerHTML;

        // 10. Show action buttons
        elements.aiActionsPanel.style.display = 'grid';
        elements.auditorChatContainer.style.display = 'block';
        elements.copyReportButton.style.display = 'block';
        elements.downloadPdfButton.style.display = 'block';
        elements.downloadJsonButton.style.display = 'block';

        updateStatus('audit', 'Audit complete!', 'success');
        await saveAudit(url, title, fullResponse, currentAuditReportHTML, scores); // Save to history

    } catch (error) {
        console.error('Audit post-processing error:', error);
        updateStatus('audit', `Failed to parse report: ${error.message}`, 'error');
        // Show the raw report even if parsing fails
        streamingReportDiv.innerHTML = renderMarkdown(fullResponse);
        showError(error.message, 'auditor');
    } finally {
        elements.auditButton.disabled = false;
        showLoader('audit', false);
    }
}

async function summarizeReport() {
    if (!currentAuditReport.markdown) return;
    const prompt = `Summarize this audit report into a concise executive summary. Focus on the top 3 issues and recommendations. Format the output in Markdown.
    REPORT:
    ${currentAuditReport.markdown}`;
    await runAIActionStreaming(prompt, 'Summarizing...', 'audit', '📋 Summary');
}

async function proofreadReport() {
    let content;
    try {
        const pageData = await getPageContent();
        content = pageData.content;
    } catch (error) {
        updateStatus('audit', `Failed: ${error.message}`, 'error');
        return;
    }

    const prompt = `Proofread the following text from the audited page for grammar, spelling, clarity, and conciseness. List any grammatical errors, spelling mistakes, or awkward phrasing you find.
    PAGE TEXT (first 4000 chars):
    ${content.substring(0, 4000)}`;

    await runAIActionStreaming(prompt, 'Proofreading...', 'audit', '✏️ Proofread Report');
}

async function rewriteTitle() {
    try {
        const { title } = await getPageContent();
        const prompt = `Current page title: "${title}". Generate 5 SEO-optimized alternative titles, each under 60 characters. Present them as a numbered Markdown list.
    PAGE TITLE: ${title}`;
        await runAIActionStreaming(prompt, 'Generating titles...', 'audit', '💡 Rewritten Titles');
    } catch (error) {
        updateStatus('audit', 'Could not get page title', 'error');
    }
}

async function runAIActionStreaming(prompt, statusMessage, type, resultTitle) {
    showLoader(type, true);
    updateStatus(type, statusMessage, 'info');

    try {
        const session = await createAISession();
        const stream = await session.promptStreaming(prompt);

        const resultsWrapper = elements.results.querySelector('.results-wrapper') || elements.results;
        const actionResultDiv = document.createElement('div');
        actionResultDiv.className = 'results-wrapper';
        actionResultDiv.style.marginTop = '24px';
        actionResultDiv.style.paddingTop = '24px';
        actionResultDiv.style.borderTop = '2px solid var(--border)';
        actionResultDiv.innerHTML = `<h2>${resultTitle}</h2>`;

        // Prepend to show at the top
        resultsWrapper.prepend(actionResultDiv);

        let fullResult = '';
        for await (const chunk of stream) {
            fullResult += chunk;
            actionResultDiv.innerHTML = `<h2>${resultTitle}</h2>` + renderMarkdown(fullResult);
        }
        session.destroy();

        updateStatus(type, 'Complete!', 'success');
        // Re-cache the HTML with the new action result
        currentAuditReportHTML = elements.results.innerHTML;
        currentAuditReport.date = new Date().toISOString(); // Update date on modification

    } catch (error) {
        console.error('AI action error:', error);
        updateStatus(type, `Failed: ${error.message}`, 'error');
    } finally {
        showLoader(type, false);
    }
}

// --- ★★★ ORGANIZER FUNCTIONS (BUGFIXED) ★★★ ---

async function organizeTabs() {
    if (!await checkAIAvailability()) {
        showError("AI is not available", "organizer");
        return;
    }

    elements.organizeTabsButton.disabled = true;
    showLoader('organizer', true);
    updateStatus('organizer', 'Analyzing tabs...', 'info');
    currentOrganizerReportHTML = ''; // Clear cache
    currentTabGroups = [];
    currentValidTabs = [];
    elements.results.innerHTML = ''; // Clear results panel

    try {
        const tabs = await chrome.tabs.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });

        if (tabs.length < 2) {
            updateStatus('organizer', 'Need at least 2 tabs', 'warning');
            elements.results.innerHTML = getPlaceholderHTML('organizer', 'Not Enough Tabs', 'Open at least 2 tabs to organize.');
            elements.organizeTabsButton.disabled = false;
            showLoader('organizer', false);
            return;
        }

        const validTabs = tabs.filter(tab =>
            tab.url &&
            !tab.url.startsWith('chrome://') &&
            !tab.url.startsWith('chrome-extension://') &&
            !tab.url.startsWith('about:') &&
            !tab.pinned
        );
        currentValidTabs = validTabs; // Cache for later use

        if (validTabs.length === 0) {
            throw new Error('No valid tabs found (e.g., all are chrome:// pages or pinned).');
        }

        updateStatus('organizer', 'Grouping with AI...', 'info');

        const tabInfo = validTabs.map(t => `ID ${t.id}: "${t.title}" - ${t.url}`).join('\n');

        const prompt = `Organize these browser tabs into logical groups.
        Tabs:
        ${tabInfo}

        Respond with ONLY a valid JSON array using this format:
        [
          {"groupName": "Group Name", "reason": "Short reason for grouping.", "tabIds": [1, 2, 3]},
          {"groupName": "Another Group", "reason": "Another reason.", "tabIds": [4, 5]}
        ]

        Return ONLY the JSON array and nothing else.`;

        const session = await createAISession();
        const result = await session.prompt(prompt);
        session.destroy();

        let groups;
        try {
            // First, try to parse as-is (for AI that *only* returns JSON)
            groups = JSON.parse(result);
        } catch (e) {
            // If that fails, try to extract from a markdown block
            const jsonCodeBlockRegex = /```json\n([\s\S]*?)\n```/;
            const jsonMatch = result.match(jsonCodeBlockRegex);
            if (jsonMatch && jsonMatch[1]) {
                groups = JSON.parse(jsonMatch[1]);
            } else {
                console.error("AI response was not valid JSON:", result);
                throw new Error('AI response was not in the expected JSON format.');
            }
        }

        currentTabGroups = groups;
        displayTabGroups(groups, validTabs);

        // Cache the HTML
        currentOrganizerReportHTML = elements.results.innerHTML;

        elements.organizerChatContainer.style.display = 'block';
        updateStatus('organizer', 'Analysis complete!', 'success');
        await saveHistoryItem({
            id: `organizer_${Date.now()}`,
            type: 'organizer',
            title: `Tab Organization (${new Date().toLocaleDateString()})`,
            html: currentOrganizerReportHTML,
            groups: currentTabGroups,
            tabs: validTabs.map(t => ({id: t.id, title: t.title, url: t.url, favIconUrl: t.favIconUrl}))
        });

    } catch (error) {
        console.error('Organizer error:', error);
        updateStatus('organizer', `Failed: ${error.message}`, 'error');
        showError(error.message, "organizer");
    } finally {
        elements.organizeTabsButton.disabled = false;
        showLoader('organizer', false);
    }
}

function displayTabGroups(groups, tabs) {
    if (!groups || groups.length === 0) {
        elements.results.innerHTML = getPlaceholderHTML('organizer', 'No Groups Found', 'The AI could not find any logical groups for your tabs.');
        return;
    }

    let html = '<div class="report-container">';
    const tabMap = new Map(tabs.map(t => [t.id, t]));

    groups.forEach((group, groupIndex) => {
        // Ensure tabIds is an array
        if (!Array.isArray(group.tabIds)) {
             console.warn("Invalid group from AI, skipping:", group);
             return; // Skip this group
        }

        html += `
            <div class="organizer-group">
                <h3>📁 ${escapeHtml(group.groupName)}</h3>
                ${group.reason ? `<p><strong>Reason:</strong> ${escapeHtml(group.reason)}</p>` : ''}
                <ul>
        `;

        group.tabIds.forEach(tabId => {
            const tab = tabMap.get(tabId);
            if (tab) {
                // Add favicon for better UX
                html += `<li><img src="${tab.favIconUrl || 'icons/icon16.png'}" width="16" height="16"> ${escapeHtml(tab.title)}</li>`;
            }
        });

        html += `
                </ul>
                <div class="contextual-actions">
                    <button class="ai-action-button contextual-button" data-action="create-group" data-group-index="${groupIndex}">
                        ✨ Group Tabs
                    </button>
                    <button class="ai-action-button contextual-button" data-action="close-group" data-group-index="${groupIndex}">
                        ❌ Close Tabs
                    </button>
                    <button class="ai-action-button contextual-button" data-action="summarize-group" data-group-index="${groupIndex}">
                        📋 Summarize
                    </button>
                    <button class="ai-action-button contextual-button" data-action="compare-group" data-group-index="${groupIndex}">
                        🔍 Compare
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    elements.results.innerHTML = html;
    setupOrganizerEventDelegation();
}

function setupOrganizerEventDelegation() {
    const resultsContainer = elements.results;
    if (!resultsContainer) return;

    // Remove old listener if any to prevent duplicates
    if (resultsContainer._organizerListener) {
        resultsContainer.removeEventListener('click', resultsContainer._organizerListener);
    }

    resultsContainer._organizerListener = async (e) => {
        const button = e.target.closest('[data-action]');
        if (!button || button.disabled) return;

        const action = button.dataset.action;
        const groupIndex = parseInt(button.dataset.groupIndex);
        const originalText = button.textContent;

        // Add a loading state to the button
        button.disabled = true;
        button.textContent = 'Working...';

        try {
            if (action === 'create-group') {
                await createTabGroup(groupIndex);
                button.textContent = 'Grouped!';
            } else if (action === 'close-group') {
                await closeTabGroup(groupIndex);
                // The element will be removed, no need to reset text
            } else if (action === 'summarize-group') {
                await summarizeGroup(groupIndex, button);
            } else if (action === 'compare-group') {
                await compareGroup(groupIndex, button);
            }
        } catch (err) {
            console.error(`Action ${action} failed:`, err);
            updateStatus('organizer', `Action failed: ${err.message}`, 'error');
        } finally {
            if (action !== 'close-group') {
                 // Re-enable after a delay unless it was closed
                 setTimeout(() => {
                    button.disabled = false;
                    button.textContent = originalText;
                 }, 2000);
            }
        }
    };

    resultsContainer.addEventListener('click', resultsContainer._organizerListener);
}

async function createTabGroup(groupIndex) {
    const group = currentTabGroups[groupIndex];
    if (!group) throw new Error('Group not found');

    // Filter out tab IDs that might already be closed
    const allTabs = await chrome.tabs.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    const allTabIds = new Set(allTabs.map(t => t.id));
    const validTabIds = group.tabIds.filter(id => allTabIds.has(id));

    if (validTabIds.length === 0) {
         updateStatus('organizer', 'Tabs are already closed.', 'warning');
         return;
    }

    updateStatus('organizer', 'Creating tab group...', 'info');
    const groupId = await chrome.tabs.group({ tabIds: validTabIds });
    await chrome.tabGroups.update(groupId, {
        title: group.groupName,
        collapsed: false,
        color: ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'][groupIndex % 8]
    });
    updateStatus('organizer', `✅ Group "${group.groupName}" created!`, 'success');
}

async function closeTabGroup(groupIndex) {
    const group = currentTabGroups[groupIndex];
    if (!group) throw new Error('Group not found');

    const allTabs = await chrome.tabs.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    const allTabIds = new Set(allTabs.map(t => t.id));
    const validTabIds = group.tabIds.filter(id => allTabIds.has(id));

    if (validTabIds.length === 0) {
         updateStatus('organizer', 'Tabs are already closed.', 'warning');
         return;
    }

    updateStatus('organizer', `Closing ${validTabIds.length} tabs...`, 'info');
    await chrome.tabs.remove(validTabIds);
    updateStatus('organizer', `✅ Group "${group.groupName}" closed!`, 'success');

    // Refresh organizer view
    await organizeTabs();
}

async function summarizeGroup(groupIndex, buttonEl) {
    const group = currentTabGroups[groupIndex];
    if (!group) return;

    const actionContainer = buttonEl.closest('.contextual-actions');
    let summaryDiv = actionContainer.nextElementSibling;
    if (!summaryDiv || !summaryDiv.classList.contains('summary-result')) {
        summaryDiv = document.createElement('div');
        summaryDiv.className = 'summary-result';
        actionContainer.parentNode.insertBefore(summaryDiv, actionContainer.nextSibling);
    }

    summaryDiv.innerHTML = 'Generating summary...';
    showLoader('organizer', true);

    try {
        const tabMap = new Map(currentValidTabs.map(t => [t.id, t]));
        const groupTabs = group.tabIds.map(id => tabMap.get(id)).filter(Boolean);
        const tabInfo = groupTabs.map(t => `- "${t.title}" (${t.url})`).join('\n');

        const prompt = `Provide a concise summary for this group of tabs.
        Group: "${group.groupName}"
        Tabs:
        ${tabInfo}

        Respond with a 2-3 sentence summary in Markdown.`;

        const session = await createAISession();
        const result = await session.prompt(prompt);
        session.destroy();

        summaryDiv.innerHTML = renderMarkdown(result);
        updateStatus('organizer', 'Summary complete!', 'success');
        currentOrganizerReportHTML = elements.results.innerHTML; // Re-cache HTML
    } catch (error) {
        console.error('Summarize error:', error);
        summaryDiv.innerHTML = `<p style="color: var(--error);">Error: ${error.message}</p>`;
    } finally {
        showLoader('organizer', false);
    }
}

async function compareGroup(groupIndex, buttonEl) {
    const group = currentTabGroups[groupIndex];
    if (!group) return;

    const actionContainer = buttonEl.closest('.contextual-actions');
    let summaryDiv = actionContainer.nextElementSibling;
    if (!summaryDiv || !summaryDiv.classList.contains('summary-result')) {
        summaryDiv = document.createElement('div');
        summaryDiv.className = 'summary-result';
        actionContainer.parentNode.insertBefore(summaryDiv, actionContainer.nextSibling);
    }

    summaryDiv.innerHTML = 'Comparing tabs...';
    showLoader('organizer', true);

    try {
        const tabMap = new Map(currentValidTabs.map(t => [t.id, t]));
        const groupTabs = group.tabIds.map(id => tabMap.get(id)).filter(Boolean);

        if (groupTabs.length < 2) {
            throw new Error("Need at least 2 tabs to compare.");
        }

        const tabInfo = [];
        // Get content for up to 3 tabs
        for (let i = 0; i < Math.min(groupTabs.length, 3); i++) {
            const tab = groupTabs[i];
            try {
                const [{ result }] = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => document.body.innerText.substring(0, 1000)
                });
                tabInfo.push(`Tab ${i+1} (Title: ${tab.title}):\n${result}`);
            } catch (e) {
                console.warn(`Could not get content for tab ${tab.id}`);
                tabInfo.push(`Tab ${i+1} (Title: ${tab.title}): [Content not accessible]`);
            }
        }

        const prompt = `Compare and contrast the following ${tabInfo.length} tabs:
        ${tabInfo.join('\n\n')}

        Provide a brief comparison in Markdown.`;

        const session = await createAISession();
        const result = await session.prompt(prompt);
        session.destroy();

        summaryDiv.innerHTML = renderMarkdown(result);
        updateStatus('organizer', 'Compare complete!', 'success');
        currentOrganizerReportHTML = elements.results.innerHTML; // Re-cache HTML
    } catch (error) {
        console.error('Compare error:', error);
        summaryDiv.innerHTML = `<p style="color: var(--error);">Error: ${error.message}</p>`;
    } finally {
        showLoader('organizer', false);
    }
}


// --- ★★★ DOC FLOW FUNCTIONS (BUGFIXED) ★★★ ---
async function startDocFlow() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('No active tab');
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
            updateStatus('docFlow', 'Cannot record Chrome internal pages', 'error');
            return;
        }

        // Send message to service worker to start recording
        // We pass the tabId so the service worker knows which tab to inject into
        await chrome.runtime.sendMessage({ action: 'startDocFlowRecording', tabId: tab.id });

        isRecording = true;
        activeDocFlowTabId = tab.id;
        docFlowSteps = []; // Clear previous steps
        currentDocFlowReportHTML = ''; // Clear cached guide

        elements.startDocFlowButton.style.display = 'none';
        elements.stopDocFlowButton.style.display = 'block';
        elements.manualScreenshotButton.style.display = 'block';
        elements.docFlowActionsPanel.style.display = 'none';
        elements.docFlowChatContainer.style.display = 'none';
        elements.results.innerHTML = getPlaceholderHTML('docFlow', '🔴 Recording...', 'Perform actions in your tab. Click the screenshot button to add manual captures.');
        updateStatus('docFlow', 'Recording...', 'info');

    } catch (error) {
        console.error('Start docflow error:', error);
        updateStatus('docFlow', `Failed to start: ${error.message}`, 'error');
    }
}

async function takeManualScreenshot() {
    elements.manualScreenshotButton.disabled = true;
    elements.manualScreenshotButton.textContent = '📸 Capturing...';
    try {
        await chrome.runtime.sendMessage({ action: 'manualScreenshot' });
        updateStatus('docFlow', 'Screenshot captured!', 'success');
    } catch (e) {
        updateStatus('docFlow', 'Screenshot failed.', 'error');
        console.error("Manual screenshot failed:", e);
    }
    setTimeout(() => {
        elements.manualScreenshotButton.disabled = false;
        elements.manualScreenshotButton.textContent = '📸 Take Screenshot';
    }, 1000);
}


async function stopDocFlow() {
    await chrome.runtime.sendMessage({ action: 'stopDocFlowRecording' });
    isRecording = false;

    elements.startDocFlowButton.style.display = 'block';
    elements.stopDocFlowButton.style.display = 'none';
    elements.manualScreenshotButton.style.display = 'none';

    updateStatus('docFlow', 'Processing...', 'info');
    showLoader('docFlow', true);
    elements.results.innerHTML = ''; // Clear placeholder

    try {
        const response = await chrome.runtime.sendMessage({ action: 'getDocFlowSteps' });
        docFlowSteps = response.steps || [];

        if (docFlowSteps.length === 0) {
            updateStatus('docFlow', 'No steps recorded.', 'warning');
            elements.results.innerHTML = getPlaceholderHTML('docFlow', 'No steps recorded.', 'Please interact with the page while recording.');
            showLoader('docFlow', false);
            return;
        }

        // *** REWRITTEN FUNCTION ***
        await generateWorkflowGuide(docFlowSteps);

        elements.docFlowActionsPanel.style.display = 'grid';
        elements.docFlowChatContainer.style.display = 'block';
        updateStatus('docFlow', '✅ Guide generated!', 'success');

        await saveHistoryItem({
            id: `docflow_${Date.now()}`,
            type: 'docFlow',
            title: `Doc Flow Guide (${new Date().toLocaleDateString()})`,
            html: currentDocFlowReportHTML,
            steps: docFlowSteps
        });

    } catch (error) {
        console.error('Stop docflow error:', error);
        updateStatus('docFlow', `Failed to process: ${error.message}`, 'error');
        showError(error.message, "docFlow");
    } finally {
        showLoader('docFlow', false);
    }
}

/**
 * REWRITTEN: Generates a guide from all steps in a single AI call.
 */
async function generateWorkflowGuide(steps) {
    const session = await createAISession();

    // 1. Convert steps to a simplified text format for the AI
    let screenshotIndex = 0;
    const simplifiedSteps = steps.map(step => {
        if (step.type === 'screenshot') {
            // Give screenshots a reference number
            return `[SCREENSHOT_${screenshotIndex++}]`;
        }
        let desc = `TYPE: ${step.type}`;
        if (step.url) desc += `, URL: ${step.url.substring(0, 100)}`;
        if (step.selector) desc += `, Element: ${step.selector}`;
        if (step.text) desc += `, Text: "${step.text.substring(0, 50)}"`;
        if (step.value) desc += `, Value: "${step.value.substring(0, 50)}"`;
        return desc;
    }).join('\n');

    // 2. Create the AI prompt
    const prompt = `
        You are a technical writer creating a user-friendly training guide from a raw log of user actions.
        The goal is a clean, step-by-step PDF-ready guide.

        Analyze the following recorded steps:
        """
        ${simplifiedSteps}
        """

        Generate a guide in Markdown format.
        - Create a clear, descriptive title for the workflow (e.g., "# How to Purchase an Item").
        - Convert the raw steps into a logical, numbered list of human-readable instructions.
        - Combine minor actions (e.g., multiple 'input' events on the same field) into single steps.
        - Ignore 'scroll' events.
        - For 'navigation' or 'click' steps, clearly state the action (e.g., "1. Navigate to the homepage.", "2. Click the 'Login' button.").
        - When you see a [SCREENSHOT_X] placeholder, place that EXACT placeholder on its own line *after* the relevant instruction it illustrates. Do not forget this.
        - Be concise and clear.
    `;

    // 3. Prepare streaming
    const streamingReportDiv = document.createElement('div');
    streamingReportDiv.className = 'results-wrapper';
    elements.results.innerHTML = '';
    elements.results.appendChild(streamingReportDiv);

    let markdownGuide = '';
    updateStatus('docFlow', 'Generating guide with AI...', 'info');

    try {
        const stream = await session.promptStreaming(prompt);
        for await (const chunk of stream) {
            markdownGuide += chunk;
            streamingReportDiv.innerHTML = renderMarkdown(markdownGuide + "▌"); // ▌ is a block cursor
        }
    } catch (e) {
        console.error("Doc Flow AI Error:", e);
        showError(`AI guide generation failed: ${e.message}`, "docFlow");
        session.destroy();
        return;
    }

    session.destroy();

    // 4. Post-process: Inject screenshots
    let finalHtml = renderMarkdown(markdownGuide);
    const screenshotSteps = steps.filter(s => s.type === 'screenshot');

    screenshotSteps.forEach((step, index) => {
        const placeholder = `[SCREENSHOT_${index}]`;
        const imgHtml = `<img src="${step.dataUrl}" alt="Screenshot for step ${index + 1}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; margin-top: 10px;">`;
        // Use a regex to replace all occurrences, escaping the brackets
        finalHtml = finalHtml.replace(new RegExp(escapeRegExp(placeholder), 'g'), imgHtml);
    });

    streamingReportDiv.innerHTML = finalHtml;

    // 5. Cache the final HTML
    currentDocFlowReportHTML = finalHtml;
}


// Generalize recorded workflow into template
async function generalizeWorkflow() {
    if (docFlowSteps.length === 0) {
        updateStatus('docFlow', 'No steps to generalize.', 'warning');
        return;
    }

    const stepDescriptions = docFlowSteps.filter(step => step.type !== 'screenshot').map((step, i) => {
        return `Step ${i + 1}: ${step.type} on ${step.selector || step.url || step.text}`;
    }).join('\n');

    const prompt = `Generalize the following user workflow into a reusable template. Explain the task type, its purpose, and how a user can adapt this template for similar tasks. Provide the output in Markdown format.

WORKFLOW STEPS:
${stepDescriptions}`;

    await runAIActionStreaming(prompt, 'Generalizing workflow...', 'docFlow', '🔧 Generalized Workflow');
}

async function generateQa() {
    if (docFlowSteps.length === 0) {
        updateStatus('docFlow', 'No steps to generate Q&A from.', 'warning');
        return;
    }

    const stepDescriptions = docFlowSteps.filter(step => step.type !== 'screenshot').map((step, i) => {
        return `Step ${i + 1}: ${step.type} on ${step.selector || step.url || step.text}`;
    }).join('\n');

    const prompt = `Generate a list of 5-10 relevant Questions and Answers (Q&A) based on the following user workflow. This Q&A should be useful for training purposes or understanding the workflow. Format the output in Markdown with clear questions and answers.

WORKFLOW STEPS:
${stepDescriptions}`;

    await runAIActionStreaming(prompt, 'Generating Q&A...', 'docFlow', '❓ Workflow Q&A');
}

// --- ★★★ EXPORT FUNCTIONS (BUGFIXED) ★★★ ---

async function downloadPdf(type) {
    const { jsPDF } = window.jspdf;
    const { html2canvas } = window;

    let reportElement;
    let filename = `SpectrumAI_Report_${Date.now()}.pdf`;
    let elementToRender;

    if (type === 'auditor' && currentAuditReportHTML) {
        // We use the cached HTML to render
        elementToRender = document.createElement('div');
        elementToRender.innerHTML = currentAuditReportHTML;
        // Find the wrapper inside the rendered HTML
        reportElement = elementToRender.querySelector('.results-wrapper');
        if (!reportElement) reportElement = elementToRender; // fallback

        filename = `SpectrumAI_Audit_${currentAuditUrl.split('/')[2] || 'report'}.pdf`;
        updateStatus('audit', 'Generating PDF...', 'info');
        showLoader('audit', true);

    } else if (type === 'docFlow' && currentDocFlowReportHTML) {
        elementToRender = document.createElement('div');
        elementToRender.innerHTML = currentDocFlowReportHTML;
        reportElement = elementToRender.querySelector('.results-wrapper');
        if (!reportElement) reportElement = elementToRender; // fallback

        filename = `SpectrumAI_DocFlow_Guide.pdf`;
        updateStatus('docFlow', 'Generating PDF...', 'info');
        showLoader('docFlow', true);

    } else {
        updateStatus(type, 'No report to export.', 'warning');
        return;
    }

    // Temporarily append to body to render for html2canvas
    // This is necessary for html2canvas to correctly calculate layouts
    reportElement.style.width = '800px'; // Define a fixed width for PDF layout
    reportElement.style.padding = '20px';
    reportElement.style.background = 'white';
    document.body.appendChild(reportElement);

    try {
        // Redraw chart in the cloned element for canvas capture
        const chartCanvas = reportElement.querySelector('#auditScoreChart');
        if (chartCanvas && currentAuditReport.scores) {
            renderAuditScoreChart(chartCanvas, currentAuditReport.scores);
        }

        const canvas = await html2canvas(reportElement, {
            scale: 2, // High resolution
            useCORS: true,
            logging: false,
            onclone: (doc) => {
                // This onclone is vital for DocFlow screenshots
                const images = doc.querySelectorAll('img');
                const promises = [];
                images.forEach(img => {
                    if (img.src.startsWith('data:')) { // Only wait for data-urls
                        if (!img.complete) {
                            promises.push(new Promise((resolve) => {
                                img.onload = resolve;
                                img.onerror = resolve; // Don't reject, just move on
                            }));
                        }
                    }
                });
                return Promise.all(promises);
            }
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgHeight / imgWidth;
        const imgHeightInPdf = pdfWidth * ratio;

        let heightLeft = imgHeightInPdf;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
            heightLeft -= pdfHeight;
        }

        pdf.save(filename);

        updateStatus(type, 'PDF downloaded!', 'success');

    } catch (e) {
        console.error('PDF Generation Error:', e);
        showError(`PDF Error: ${e.message}`, type);
    } finally {
        showLoader(type, false);
        document.body.removeChild(reportElement); // Clean up
    }
}

function downloadJson() {
    if (!currentAuditReport.markdown) {
        updateStatus('audit', 'No report to export.', 'warning');
        return;
    }

    updateStatus('audit', 'Generating JSON...', 'info');

    // Simple parsing of Markdown to a JSON structure
    const lines = currentAuditReport.markdown.split('\n');
    const jsonReport = {
        url: currentAuditUrl,
        date: currentAuditReport.date,
        scores: currentAuditReport.scores,
        sections: []
    };

    let currentSection = null;

    for (const line of lines) {
        const sectionMatch = line.match(/^##\s*\d*\.?\s*(.*?)(?:\*\*Score:\s*(\d+)\/100\*\*)?$/);
        const summaryMatch = line.match(/^##\s*Executive Summary/); // V3.3 summary has no score
        const dashboardMatch = line.match(/^##\s*📈 Interactive Score Dashboard/);

        if (dashboardMatch) continue; // Skip the dashboard section

        if (sectionMatch || summaryMatch) {
            if (currentSection) {
                 currentSection.content = currentSection.content.trim();
                jsonReport.sections.push(currentSection);
            }

            let title, score;
            if (sectionMatch) {
                title = (sectionMatch[1] || '').trim();
                score = sectionMatch[2] ? `${sectionMatch[2]}/100` : 'N/A';
            } else if (summaryMatch) {
                title = 'Executive Summary';
                score = 'N/A';
            } else {
                continue;
            }

            currentSection = {
                title: title,
                score: score,
                content: ""
            };
        } else if (currentSection) {
            currentSection.content += line + '\n';
        }
    }

    if (currentSection) {
        currentSection.content = currentSection.content.trim();
        jsonReport.sections.push(currentSection);
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonReport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `spectrum_ai_audit_${currentAuditUrl.split('/')[2] || 'report'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    updateStatus('audit', 'JSON generated!', 'success');
}

// --- ★★★ CHAT FUNCTIONS (FIXED) ★★★ ---
async function sendChatMessage(type) {
    const inputElement = elements[`${type}ChatInput`];
    const messagesElement = elements[`${type}ChatMessages`];
    if (!inputElement || !messagesElement) return;

    const message = inputElement.value.trim();
    if (!message) return;

    addMessageToChat(type, message, 'user');
    inputElement.value = '';

    // Prepare AI context
    let context = '';
    if (type === 'auditor' && currentAuditReport.markdown) {
        context = `Based on this audit:\n${currentAuditReport.markdown.substring(0, 3000)}\n\nQuestion: ${message}`;
    } else if (type === 'organizer' && currentTabGroups.length > 0) {
        const groupInfo = currentTabGroups.map(g => `${g.groupName}: ${g.tabIds.length} tabs`).join(', ');
        context = `Tabs organized into: ${groupInfo}. Question: ${message}`;
    } else if (type === 'docFlow' && currentDocFlowReportHTML) {
         // Use the HTML as it's cleaner than the raw markdown with placeholders
         const tempDiv = document.createElement('div');
         tempDiv.innerHTML = currentDocFlowReportHTML;
         const textContent = tempDiv.innerText || tempDiv.textContent || '';
         context = `Based on this workflow guide:\n${textContent.substring(0, 3000)}\n\nQuestion: ${message}`;
    } else {
        context = message;
    }

    const thinkingDiv = addMessageToChat(type, '...', 'ai', 'typing');
    messagesElement.scrollTop = messagesElement.scrollHeight;

    try {
        const session = await createAISession();
        // Use promptStreaming for a better UX
        const stream = await session.promptStreaming(context);

        let fullResponse = '';
        thinkingDiv.innerHTML = ''; // Clear typing dots
        thinkingDiv.classList.remove('typing');
        thinkingDiv.classList.add('streaming');

        for await (const chunk of stream) {
            fullResponse += chunk;
            thinkingDiv.innerHTML = renderMarkdown(fullResponse + "▌");
            messagesElement.scrollTop = messagesElement.scrollHeight;
        }

        thinkingDiv.innerHTML = renderMarkdown(fullResponse); // Final render
        thinkingDiv.classList.remove('streaming');
        session.destroy();

        messagesElement.scrollTop = messagesElement.scrollHeight;

    } catch (error) {
        console.error('Chat error:', error);
        thinkingDiv.innerHTML = `❌ Error: ${error.message}`;
        thinkingDiv.classList.remove('typing');
        thinkingDiv.style.color = 'var(--error)';
    }
}

/**
 * Adds a message to the chat UI. (Using your new classes)
 */
function addMessageToChat(type, content, role, state = null) {
    const messagesElement = elements[`${type}ChatMessages`];
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-message', role);

    if (role === 'user') {
        msgDiv.textContent = content;
    } else if (state === 'typing') {
        msgDiv.classList.add('typing');
        msgDiv.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;
    } else {
        // This will be updated by the streaming function
        msgDiv.innerHTML = content;
    }

    messagesElement.appendChild(msgDiv);
    messagesElement.scrollTop = messagesElement.scrollHeight;
    return msgDiv;
}


// --- ★★★ HISTORY FUNCTIONS (ENHANCED) ★★★ ---

/**
 * A single function to save any report type to history.
 */
async function saveHistoryItem(item) {
     try {
        const { history = [] } = await chrome.storage.local.get('history');

        const newEntry = {
            id: item.id || `${item.type}_${Date.now()}`,
            date: new Date().toISOString(),
            ...item
        };

        history.unshift(newEntry);
        if (history.length > 100) history.pop(); // Keep max 100 entries

        await chrome.storage.local.set({ history });
    } catch (error) {
        console.error('Save history error:', error);
    }
}

// saveAudit is now a specific wrapper for saveHistoryItem
async function saveAudit(url, title, reportMarkdown, reportHTML, scores) {
    await saveHistoryItem({
        type: 'audit',
        id: `audit_${Date.now()}`, // Ensure a unique ID
        url: url,
        title: title || url,
        report: reportMarkdown,
        html: reportHTML,
        scores: scores
    });
}

async function loadHistory() {
    try {
        const { history = [] } = await chrome.storage.local.get('history');

        const historyContent = document.getElementById('history');
        // Clear old list, but keep controls
        historyContent.querySelectorAll('.history-item, .placeholder, .status-message').forEach(item => item.remove());

        if (history.length === 0) {
            historyContent.appendChild(getPlaceholderElement('history-empty')); // Use a specific empty placeholder
            return;
        }

        const query = elements.historySearchInput.value.toLowerCase();
        const filteredHistory = history.filter(item => {
            const title = (item.title || item.url || '').toLowerCase();
            return title.includes(query);
        });

        if (filteredHistory.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'status-message info';
            noResults.textContent = 'No matching reports found.';
            historyContent.appendChild(noResults);
            return;
        }

        filteredHistory.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'history-item';
            itemEl.setAttribute('data-history-id', item.id);
            itemEl.innerHTML = `
                <div class="history-item-url">${escapeHtml(item.title)}</div>
                <div class="history-item-date">${new Date(item.date).toLocaleString()}</div>
            `;
            itemEl.addEventListener('click', () => loadItemFromHistory(item.id));
            historyContent.appendChild(itemEl);
        });

    } catch (error) {
        console.error('Load history error:', error);
        document.getElementById('history').appendChild(getPlaceholderElement('history-empty', 'Error', 'Could not load history.'));
    }
}

// Renamed from loadAuditFromHistory to handle all types
async function loadItemFromHistory(id) {
    try {
        const { history = [] } = await chrome.storage.local.get('history');
        const item = history.find(h => h.id === id);

        if (item) {
            if (item.type === 'audit') {
                currentAuditReport = { // Restore the object
                    markdown: item.report,
                    scores: item.scores,
                    date: item.date
                };
                currentAuditUrl = item.url;
                currentAuditReportHTML = item.html || renderMarkdown(item.report); // Re-render if HTML not saved
                switchTab('auditor');
                updateStatus('audit', `Loaded from ${new Date(item.date).toLocaleDateString()}`, 'info');
            } else if (item.type === 'organizer') {
                currentTabGroups = item.groups;
                currentValidTabs = item.tabs; // Restore cached tabs
                currentOrganizerReportHTML = item.html;
                switchTab('organizer');
                updateStatus('organizer', `Loaded from ${new Date(item.date).toLocaleDateString()}`, 'info');
            } else if (item.type === 'docFlow') {
                docFlowSteps = item.steps;
                currentDocFlowReportHTML = item.html;
                switchTab('docFlow');
                updateStatus('docFlow', `Loaded from ${new Date(item.date).toLocaleDateString()}`, 'info');
            }
        }
    } catch (error) {
        console.error('Load item error:', error);
    }
}

// Search now just re-renders the list
function searchHistory() {
    loadHistory();
}

async function clearHistory() {
    if (confirm('Are you sure you want to delete ALL saved reports? This cannot be undone.')) {
        await chrome.storage.local.set({ history: [] });
        loadHistory();
    }
}

async function exportHistory() {
    try {
        const { history = [] } = await chrome.storage.local.get('history');
         if (history.length === 0) {
            alert('No history to export.');
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `SpectrumAI_History_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    } catch (error) {
        console.error('Export history error:', error);
    }
}

async function importHistory() {
    try {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedHistory = JSON.parse(event.target.result);
                    if (!Array.isArray(importedHistory)) {
                        throw new Error('Invalid JSON format. Expected an array.');
                    }

                    const { history = [] } = await chrome.storage.local.get('history');
                    const mergedHistory = [...history];
                    const existingIds = new Set(history.map(item => item.id));

                    for (const item of importedHistory) {
                        if (item.id && !existingIds.has(item.id)) {
                            mergedHistory.push(item);
                        }
                    }

                    mergedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    const finalHistory = mergedHistory.slice(0, 100);

                    await chrome.storage.local.set({ history: finalHistory });
                    loadHistory();
                    alert('History imported successfully!');
                } catch (parseError) {
                    console.error('Error parsing imported file:', parseError);
                    alert(`Failed to import: ${parseError.message}`);
                }
            };
            reader.readAsText(file);
        };
        fileInput.click();
    } catch (error) {
        console.error('Import history error:', error);
    }
}

// --- ★★★ HELPER FUNCTIONS (REFINED) ★★★ ---

async function createAISession() {
    try {
        if (typeof self.LanguageModel !== 'undefined') {
            // ★★★ FIX: Added outputLanguage to all calls ★★★
            return await self.LanguageModel.create({
                outputLanguage: 'en',
                temperature: 0.2, // Lower temp for more factual, less "creative" responses
                topK: 3
            });
        }
    } catch (e) {
        console.error("Failed to create AI session:", e);
        throw new Error('AI Model is not ready or permission was denied.');
    }
    throw new Error('AI not available');
}


async function getPageContent() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('No active tab found.');

        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
            throw new Error('Cannot access Chrome internal pages or extensions');
        }

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => ({
                content: document.body.innerText,
                url: window.location.href,
                title: document.title
            })
        });

        if (!result) {
            throw new Error("Could not retrieve content. The page might be protected or still loading.");
        }
        return result;
    } catch (error) {
        console.error("getPageContent error:", error);
        throw new Error(`Cannot access page content: ${error.message}`);
    }
}

function updateStatus(type, message, level = 'info') {
    const statusElement = elements[`${type}Status`];
    const textElement = elements[`${type}StatusText`];
    if (!statusElement || !textElement) return;

    statusElement.style.display = 'flex';
    statusElement.className = `status-message ${level}`;
    textElement.textContent = message;

    // Hide status after a few seconds for success/error
    if (level === 'success' || level === 'error' || level === 'warning') {
        setTimeout(() => {
            if (textElement.textContent === message) { // Only hide if it's still the same message
                 statusElement.style.display = 'none';
            }
        }, 4000);
    }
}

function showLoader(type, show = true) {
    const loader = elements[`${type}Loader`];
    if (loader) loader.style.display = show ? 'block' : 'none';
}

function showError(message, module = 'audit') {
    elements.results.innerHTML = getPlaceholderHTML('auditor', 'An Error Occurred', message);
    updateStatus(module, message, 'error');
}

function copyReport() {
    if (!currentAuditReport.markdown) return;
    navigator.clipboard.writeText(currentAuditReport.markdown).then(() => {
        updateStatus('audit', '📋 Copied!', 'success');
    });
}

function escapeHtml(text = '') {
    if (typeof text !== 'string') {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function renderMarkdown(text) {
    if (!text) return '';
    // Basic sanitation
    text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
    text = text.replace(/onerror\s*=\s*["']?[^"'>]+["']?/gim, "");
    // Check if marked is available
    if (typeof marked === 'undefined' || typeof marked.parse === 'undefined') {
        console.error("marked.js is not loaded!");
        // Fallback to basic rendering
        return text.replace(/\n/g, '<br>');
    }
    return marked.parse(text);
}

/**
 * Generates placeholder HTML for different tabs.
 * @param {string} module - The module name.
 * @param {string} [title] - Optional title override.
 * @param {string} [text] - Optional text override.
 * @returns {HTMLElement} The placeholder element.
 */
function getPlaceholderElement(module, title, text) {
    const placeholders = {
        auditor: {
            icon: '🔮',
            title: 'Welcome to Auditor',
            text: 'Click <strong>🚀 Run 12-Point Audit</strong> to analyze the current page.'
        },
        organizer: {
            icon: '📂',
            title: 'Welcome to Organizer',
            text: 'Click <strong>Analyze & Group Tabs</strong> to sort your open tabs with AI.'
        },
        docFlow: {
            icon: '📝',
            title: 'Welcome to Doc Flow',
            text: 'Click <strong>🎬 Start Recording</strong> to capture your workflow and generate a guide.'
        },
        history: {
            icon: '🕒',
            title: 'History',
            text: 'Select a saved item from the left panel to view details.'
        },
        'history-empty': {
            icon: '🕒',
            title: 'No History',
            text: 'Your saved reports will appear here.'
        }
    };
    const p = placeholders[module] || placeholders.auditor;

    const el = document.createElement('div');
    el.className = 'placeholder';
    el.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px;">${p.icon}</div>
        <h2>${title || p.title}</h2>
        <p>${text || p.text}</p>
    `;
    return el;
}

function getPlaceholderHTML(module, title, text) {
     return getPlaceholderElement(module, title, text).outerHTML;
}

function setReportInfo(url, date) {
    if (url && date) {
        elements.reportUrl.textContent = url;
        elements.reportDate.textContent = new Date(date).toLocaleString();
        elements.reportInfo.style.display = 'flex';
    } else {
        elements.reportInfo.style.display = 'none';
        elements.reportUrl.textContent = '';
        elements.reportDate.textContent = '';
    }
}

function renderAuditScoreChart(canvas, scores) {
    if (window.chartInstance) {
        window.chartInstance.destroy();
    }
    if (!canvas) {
        console.error("Canvas element not provided to renderAuditScoreChart");
        return;
    }
    if (!scores || Object.keys(scores).length === 0) {
        console.warn("No scores provided to renderAuditScoreChart");
        // Don't render an empty chart
        return;
    }

    const labels = Object.keys(scores);
    const data = Object.values(scores);

    const getBackgroundColor = (value) => {
        if (value >= 90) return 'rgba(16, 185, 129, 0.7)'; // success
        if (value >= 50) return 'rgba(245, 158, 11, 0.7)'; // warning
        return 'rgba(239, 68, 68, 0.7)'; // error
    };

    const getBorderColor = (value) => {
        if (value >= 90) return 'rgb(16, 185, 129)';
        if (value >= 50) return 'rgb(245, 158, 11)';
        return 'rgb(239, 68, 68)';
    };

    window.chartInstance = new Chart(canvas.getContext('2d'), {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Audit Score',
                data: data,
                backgroundColor: data.map(getBackgroundColor),
                borderColor: data.map(getBorderColor),
                borderWidth: 2,
                pointBackgroundColor: data.map(getBorderColor),
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: data.map(getBorderColor)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                    grid: { color: 'rgba(0, 0, 0, 0.1)' },
                    pointLabels: {
                        font: { size: 13, weight: '600' },
                        color: '#0f172a'
                    },
                    ticks: {
                        backdropColor: 'rgba(255, 255, 255, 0.7)',
                        color: '#475569',
                        beginAtZero: true,
                        min: 0,
                        max: 100,
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { weight: 'bold' },
                    bodyFont: { size: 14 },
                    callbacks: {
                        label: function(context) {
                            // The score (context.raw) is 0-100.
                            return `${context.label}: ${context.raw}/100`;
                        }
                    }
                }
            }
        }
    });
}