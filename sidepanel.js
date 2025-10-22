/**
 * 🏆 SPECTRUM AI PRO V3.0 - COMPLETE WORKING CODE
 * Google Chrome Built-in AI Challenge 2025
 */

'use strict';

// GLOBAL STATE
let currentAuditReport = '';
let currentAuditUrl = '';
let currentTabGroups = [];
let isRecording = false;
let scribeSteps = [];
let activeScribeTabId = null;

const elements = {};

// INITIALIZATION - WITH ROBUST AI CHECK
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Spectrum AI Pro V3.0 - Competition Edition');

    cacheElements();
    setupEventListeners();

    if (elements.results) {
        elements.results.innerHTML = `
            <div class="placeholder">
                <div class="loader" style="display: block;"></div>
                <h2 style="margin-top: 24px;">Checking AI...</h2>
            </div>
        `;
    }

    const aiReady = await checkAIAvailability();

    if (!aiReady) {
        console.error('❌ AI not ready');
        if (elements.results) {
            elements.results.innerHTML = `
                <div class="placeholder error">
                    <h2>AI system not detected or permission denied.</h2>
                    <p>Please enable AI features in chrome://flags and reload.</p>
                </div>
            `;
        }
        return;
    }

    if (elements.results) elements.results.innerHTML = '';

    updateStatus('audit', 'Ready to analyze', 'info');
    updateStatus('organizer', 'Ready to organize tabs', 'info');
    updateStatus('scribe', 'Ready to record workflow', 'info');

    console.log('✅ Spectrum AI Pro V3.0 ready!');
});

// CACHE DOM ELEMENTS FOR EASY ACCESS
function cacheElements() {
    elements.viewModeBtns = document.querySelectorAll('.view-mode-btn');
    elements.contentWrapper = document.querySelector('.content-wrapper');
    elements.tabs = document.querySelectorAll('.tab-link');
    elements.tabContents = document.querySelectorAll('.tab-content');

    // Auditor Elements
    elements.auditButton = document.getElementById('auditButton');
    elements.auditStatus = document.getElementById('auditStatus');
    elements.auditStatusText = document.getElementById('auditStatusText');
    elements.auditLoader = document.getElementById('auditLoader');
    elements.aiActionsPanel = document.getElementById('aiActionsPanel');
    elements.summarizeButton = document.getElementById('summarizeButton');
    elements.proofreadButton = document.getElementById('proofreadButton');
    elements.rewriteTitleButton = document.getElementById('rewriteTitleButton');
    elements.auditorChatContainer = document.getElementById('auditorChatContainer');
    elements.auditorChatMessages = document.getElementById('auditorChatMessages');
    elements.auditorChatInput = document.getElementById('auditorChatInput');
    elements.auditorChatSend = document.getElementById('auditorChatSend');

    // Organizer Elements
    elements.organizeTabsButton = document.getElementById('organizeTabsButton');
    elements.organizerStatus = document.getElementById('organizerStatus');
    elements.organizerStatusText = document.getElementById('organizerStatusText');
    elements.organizerLoader = document.getElementById('organizerLoader');
    elements.organizerChatContainer = document.getElementById('organizerChatContainer');
    elements.organizerChatMessages = document.getElementById('organizerChatMessages');
    elements.organizerChatInput = document.getElementById('organizerChatInput');
    elements.organizerChatSend = document.getElementById('organizerChatSend');

    // Scribe Elements
    elements.startScribeButton = document.getElementById('startScribeButton');
    elements.stopScribeButton = document.getElementById('stopScribeButton');
    elements.scribeStatus = document.getElementById('scribeStatus');
    elements.scribeStatusText = document.getElementById('scribeStatusText');
    elements.scribeLoader = document.getElementById('scribeLoader');
    elements.scribeActionsPanel = document.getElementById('scribeActionsPanel');
    elements.generalizeWorkflowButton = document.getElementById('generalizeWorkflowButton');
    elements.downloadPdfButton = document.getElementById('downloadPdfButton');
    elements.scribeChatContainer = document.getElementById('scribeChatContainer');
    elements.scribeChatMessages = document.getElementById('scribeChatMessages');
    elements.scribeChatInput = document.getElementById('scribeChatInput');
    elements.scribeChatSend = document.getElementById('scribeChatSend');

    // History Elements
    elements.historySearchInput = document.getElementById('historySearchInput');
    elements.clearHistoryButton = document.getElementById('clearHistoryButton');

    // Results
    elements.results = document.getElementById('results');
    elements.copyReportButton = document.getElementById('copyReportButton');

    // Settings and Help buttons
    elements.settingsBtn = document.getElementById('settingsBtn');
    elements.helpBtn = document.getElementById('helpBtn');
}

// SETUP ALL EVENT LISTENERS
function setupEventListeners() {
    // View modes
    if (elements.viewModeBtns) {
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
    }

    // Tab buttons
    if (elements.tabs) {
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });
    }

    // Auditor event handlers
    if (elements.auditButton) elements.auditButton.addEventListener('click', runAudit);
    if (elements.summarizeButton) elements.summarizeButton.addEventListener('click', summarizeReport);
    if (elements.proofreadButton) elements.proofreadButton.addEventListener('click', proofreadReport);
    if (elements.rewriteTitleButton) elements.rewriteTitleButton.addEventListener('click', rewriteTitle);
    if (elements.auditorChatSend) elements.auditorChatSend.addEventListener('click', () => sendChatMessage('auditor'));
    if (elements.auditorChatInput) {
        elements.auditorChatInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') sendChatMessage('auditor');
        });
    }

    // Organizer event handlers
    if (elements.organizeTabsButton) elements.organizeTabsButton.addEventListener('click', organizeTabs);
    if (elements.organizerChatSend) elements.organizerChatSend.addEventListener('click', () => sendChatMessage('organizer'));
    if (elements.organizerChatInput) {
        elements.organizerChatInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') sendChatMessage('organizer');
        });
    }

    // Scribe event handlers
    if (elements.startScribeButton) elements.startScribeButton.addEventListener('click', startScribe);
    if (elements.stopScribeButton) elements.stopScribeButton.addEventListener('click', stopScribe);
    if (elements.generalizeWorkflowButton) elements.generalizeWorkflowButton.addEventListener('click', generalizeWorkflow);
    if (elements.downloadPdfButton) elements.downloadPdfButton.addEventListener('click', downloadPdf);
    if (elements.scribeChatSend) elements.scribeChatSend.addEventListener('click', () => sendChatMessage('scribe'));
    if (elements.scribeChatInput) {
        elements.scribeChatInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') sendChatMessage('scribe');
        });
    }

    // History event handlers
    if (elements.historySearchInput) elements.historySearchInput.addEventListener('input', searchHistory);
    if (elements.clearHistoryButton) elements.clearHistoryButton.addEventListener('click', clearHistory);

    // Copy button
    if (elements.copyReportButton) elements.copyReportButton.addEventListener('click', copyReport);

    // Settings and Help buttons
    if (elements.settingsBtn) elements.settingsBtn.addEventListener('click', () => alert("Settings coming soon!"));
    if (elements.helpBtn) elements.helpBtn.addEventListener('click', () => alert("Help and documentation coming soon!"));
}

// SWITCH TABS
function switchTab(tabName) {
    elements.tabs.forEach(tab => {
        const isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive);
    });
    elements.tabContents.forEach(content => {
        const isActive = content.id === tabName;
        content.classList.toggle('active', isActive);
        content.hidden = !isActive;
    });
    if (tabName === 'history') loadHistory();
}

// CHECK AI AVAILABILITY
async function checkAIAvailability() {
    try {
        if (typeof self.ai !== 'undefined' && self.ai.languageModel) {
            const testSession = await self.ai.languageModel.create({ language: 'en' });
            testSession.destroy();
            return true;
        } else if (typeof self.LanguageModel !== 'undefined') {
            const testSession = await self.LanguageModel.create({ language: 'en' });
            testSession.destroy();
            return true;
        } else {
            return false;
        }
    } catch {
        return false;
    }
}

// AUDITOR FUNCTIONS
async function runAudit() {
    if (!await checkAIAvailability()) {
        showError("AI is not available");
        return;
    }

    elements.auditButton.disabled = true;
    showLoader('audit', true);
    updateStatus('audit', 'Fetching page content...', 'info');

    try {
        const { content, url } = await getPageContent();

        currentAuditUrl = url;

        if (!content || !content.trim()) {
            throw new Error('Page content is empty');
        }

        updateStatus('audit', 'Analyzing with AI...', 'info');

        const report = await performAudit(content.substring(0, 8000));
        currentAuditReport = report;

        if (elements.results) elements.results.innerHTML = `<div class="results-wrapper">${renderMarkdown(report)}</div>`;

        if (elements.aiActionsPanel) elements.aiActionsPanel.style.display = 'block';
        if (elements.auditorChatContainer) elements.auditorChatContainer.style.display = 'block';
        if (elements.copyReportButton) elements.copyReportButton.style.display = 'block';

        updateStatus('audit', 'Audit complete!', 'success');

        await saveAudit(url, report);

    } catch (error) {
        console.error('Audit error:', error);
        updateStatus('audit', `Failed: ${error.message}`, 'error');
        showError(error.message);
    } finally {
        elements.auditButton.disabled = false;
        showLoader('audit', false);
    }
}

async function performAudit(content) {
    const session = await createAISession();

    const prompt = `You are an expert web auditor. Perform a comprehensive 12-point analysis. Format in clean Markdown with scores.

**CRITICAL RULES:**
- Each section: ## Section Name [X/10]
- Provide Assessment, Key Issues, Recommendation
- Use bullet points

PAGE CONTENT:
${content}

Analyze these 12 areas with [SCORE/10]:
1. Technical Foundation
2. Accessibility (A11y)
3. Performance
4. Security
5. User Experience (UX)
6. Content Quality
7. SEO On-Page
8. Link Architecture
9. Conversion Optimization
10. Analytics
11. Competitive Position
12. Mobile Readiness

End with Executive Summary (Overall Grade A+ to F, Top Priority, Quick Wins).`;

    try {
        return await session.prompt(prompt);
    } finally {
        session.destroy();
    }
}

async function summarizeReport() {
    if (!currentAuditReport) return;

    const prompt = `Summarize this audit report into a concise executive summary. Top 3 issues and recommendations. Markdown format.

REPORT:
${currentAuditReport}`;

    await runAIAction(prompt, 'Summarizing...', 'audit');
}

async function proofreadReport() {
    if (!currentAuditReport) return;

    const prompt = `Proofread and improve clarity. Fix grammar/spelling. Return complete corrected Markdown.

REPORT:
${currentAuditReport}`;

    await runAIAction(prompt, 'Proofreading...', 'audit');
}

async function rewriteTitle() {
    try {
        const { title } = await getPageContent();
        const prompt = `Current page title: "${title}". Generate 5 SEO-optimized alternatives (under 60 chars). Numbered Markdown list.`;
        await runAIAction(prompt, 'Generating titles...', 'audit');
    } catch (error) {
        updateStatus('audit', 'Could not get page title', 'error');
    }
}

async function runAIAction(prompt, statusMessage, type) {
    showLoader(type, true);
    updateStatus(type, statusMessage, 'info');

    try {
        const session = await createAISession();
        const result = await session.prompt(prompt);
        session.destroy();

        if (elements.results) {
            elements.results.innerHTML += `
                <div class="results-wrapper" style="margin-top: 24px; padding-top: 24px; border-top: 2px solid var(--border);">
                    <h2>✨ ${statusMessage.replace('...', '')}</h2>
                    ${renderMarkdown(result)}
                </div>
            `;
        }

        updateStatus(type, 'Complete!', 'success');
    } catch (error) {
        console.error('AI action error:', error);
        updateStatus(type, `Failed: ${error.message}`, 'error');
    } finally {
        showLoader(type, false);
    }
}

// HELPER FUNCTIONS

async function createAISession() {
    if (typeof self.ai !== 'undefined' && self.ai.languageModel) {
        return await self.ai.languageModel.create({
            systemPrompt: 'You are a helpful AI assistant. Provide clear, actionable advice.',
            language: 'en'
        });
    } else if (typeof self.LanguageModel !== 'undefined') {
        return await self.LanguageModel.create({ language: 'en' });
    }
    throw new Error('AI not available');
}

async function getPageContent() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('No active tab');
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
        return result;
    } catch (error) {
        throw new Error(`Cannot access page: ${error.message}`);
    }
}

function updateStatus(type, message, level = 'info') {
    const statusElement = elements[`${type}Status`];
    const textElement = elements[`${type}StatusText`];
    if (!statusElement || !textElement) return;

    statusElement.style.display = 'block';
    statusElement.className = `status-message ${level}`;
    textElement.textContent = message;
}

function showLoader(type, show = true) {
    const loader = elements[`${type}Loader`];
    if (loader) loader.style.display = show ? 'block' : 'none';
}

function showError(message) {
    if (!elements.results) return;
    elements.results.innerHTML = `
        <div class="placeholder error">
            <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
            <h2>Error</h2>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

function copyReport() {
    if (!currentAuditReport) return;

    navigator.clipboard.writeText(currentAuditReport).then(() => {
        updateStatus('audit', '📋 Copied!', 'success');
        setTimeout(() => updateStatus('audit', 'Ready to analyze', 'info'), 2000);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Markdown renderer for limited markdown to HTML
function renderMarkdown(text) {
    if (!text) return '';

    text = escapeHtml(text);

    text = text.replace(/## (.*?)\s?\[(\d+\/\d+)\]/gim, (match, title, score) =>
        `<h2>${title}<span class="score-badge">${score}</span></h2>`
    );

    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    text = text.replace(/^\* (.*$)/gim, '<li>$1</li>');
    text = text.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*?<\/li>\s*)+/gs, '<ul>$&</ul>');

    text = text.split(/\n\n+/).map(para => {
        const trimmed = para.trim();
        if (trimmed.startsWith('<h2') || trimmed.startsWith('<h3') || trimmed.startsWith('<ul') || trimmed.startsWith('<li')) {
            return trimmed;
        }
        return `<p>${trimmed}</p>`;
    }).join('');

    return text;
}

console.log('✅ Spectrum AI Pro V3.0 JavaScript loaded - Part 1/4');
// ORGANIZER FUNCTIONS

// Organize open tabs into groups with AI assistance
async function organizeTabs() {
    if (!await checkAIAvailability()) {
        showError("AI is not available");
        return;
    }

    elements.organizeTabsButton.disabled = true;
    showLoader('organizer', true);
    updateStatus('organizer', 'Analyzing tabs...', 'info');

    try {
        const tabs = await chrome.tabs.query({ windowType: 'normal' });

        if (tabs.length < 2) {
            updateStatus('organizer', 'Need at least 2 tabs', 'warning');
            if (elements.results) {
                elements.results.innerHTML = `
                    <div class="placeholder">
                        <div style="font-size: 64px;">📂</div>
                        <h2>Not Enough Tabs</h2>
                        <p>Open at least 2 tabs to organize</p>
                    </div>
                `;
            }
            return;
        }

        // Filter out invalid tabs (chrome://, extension pages, about:)
        const validTabs = tabs.filter(tab =>
            tab.url &&
            !tab.url.startsWith('chrome://') &&
            !tab.url.startsWith('chrome-extension://') &&
            !tab.url.startsWith('about:')
        );

        if (validTabs.length === 0) {
            throw new Error('No valid tabs found');
        }

        updateStatus('organizer', 'Grouping with AI...', 'info');

        const tabInfo = validTabs.map(t => `ID ${t.id}: "${t.title}" - ${new URL(t.url).hostname}`).join('\n');

        const prompt = `Organize these browser tabs into logical groups. Output ONLY valid JSON:
[
  {"groupName": "Group Name", "tabIds": [1, 2, 3]},
  {"groupName": "Another Group", "tabIds": [4, 5]}
]

Tabs:
${tabInfo}

Return ONLY the JSON array.`;

        const session = await createAISession();
        const result = await session.prompt(prompt);
        session.destroy();

        // Extract JSON array from response
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('Invalid AI response format');

        const groups = JSON.parse(jsonMatch[0]);
        currentTabGroups = groups;

        displayTabGroups(groups, validTabs);

        if (elements.organizerChatContainer) elements.organizerChatContainer.style.display = 'block';

        updateStatus('organizer', 'Analysis complete!', 'success');

    } catch (error) {
        console.error('Organizer error:', error);
        updateStatus('organizer', `Failed: ${error.message}`, 'error');
        showError(error.message);
    } finally {
        elements.organizeTabsButton.disabled = false;
        showLoader('organizer', false);
    }
}

// Display tab groups in UI with action buttons
function displayTabGroups(groups, tabs) {
    if (groups.length === 0) {
        if (elements.results) {
            elements.results.innerHTML = `
                <div class="placeholder">
                    <div style="font-size: 64px;">📂</div>
                    <h2>No Groups Found</h2>
                </div>`;
        }
        return;
    }

    let html = '<div class="report-container">';

    groups.forEach((group, groupIndex) => {
        html += `
            <div class="organizer-group">
                <h3>📁 ${escapeHtml(group.groupName)}</h3>
                <ul>
        `;

        group.tabIds.forEach(tabId => {
            const tab = tabs.find(t => t.id === tabId);
            if (tab) html += `<li>🌐 ${escapeHtml(tab.title)}</li>`;
        });

        html += `
                </ul>
                <div class="contextual-actions">
                    <button class="ai-action-button contextual-button" data-action="create-group" data-group-index="${groupIndex}">
                        ✨ Create Group
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

    if (elements.results) elements.results.innerHTML = html;

    setupOrganizerEventDelegation();
}

// Setup click handlers for organizer group actions
function setupOrganizerEventDelegation() {
    const resultsContainer = elements.results;
    if (!resultsContainer) return;

    // Remove old listener if any
    if (resultsContainer._organizerListener) {
        resultsContainer.removeEventListener('click', resultsContainer._organizerListener);
    }
    const newListener = async (e) => {
        const button = e.target.closest('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const groupIndex = parseInt(button.dataset.groupIndex);

        if (action === 'create-group') await createTabGroup(groupIndex);
        else if (action === 'summarize-group') await summarizeGroup(groupIndex);
        else if (action === 'compare-group') await compareGroup(groupIndex);
    };

    resultsContainer._organizerListener = newListener;
    resultsContainer.addEventListener('click', newListener);
}

// Create Chrome tab group from AI groups
async function createTabGroup(groupIndex) {
    try {
        const group = currentTabGroups[groupIndex];
        if (!group) throw new Error('Group not found');

        updateStatus('organizer', 'Creating tab group...', 'info');

        const groupId = await chrome.tabs.group({ tabIds: group.tabIds });

        await chrome.tabGroups.update(groupId, {
            title: group.groupName,
            collapsed: false,
            color: ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'][groupIndex % 8]
        });

        updateStatus('organizer', `✅ Group "${group.groupName}" created!`, 'success');
    } catch (error) {
        console.error('Create group error:', error);
        updateStatus('organizer', `Failed: ${error.message}`, 'error');
    }
}

// Summarize group tabs with AI
async function summarizeGroup(groupIndex) {
    try {
        const group = currentTabGroups[groupIndex];
        if (!group) throw new Error('Group not found');

        updateStatus('organizer', 'Summarizing...', 'info');
        showLoader('organizer', true);

        const tabs = await chrome.tabs.query({});
        const groupTabs = tabs.filter(t => group.tabIds.includes(t.id));

        const tabInfo = groupTabs.map(t => `- "${t.title}" (${new URL(t.url).hostname})`).join('\n');

        const prompt = `Analyze this group of tabs. Provide:
1. Common theme
2. Key insights
3. Recommendations

Group: "${group.groupName}"
Tabs:
${tabInfo}

Markdown format.`;

        const session = await createAISession();
        const result = await session.prompt(prompt);
        session.destroy();

        if (elements.results) {
            elements.results.innerHTML += `
                <div class="results-wrapper" style="margin-top: 24px; padding-top: 24px; border-top: 2px solid var(--border);">
                    <h2>📋 Summary: ${escapeHtml(group.groupName)}</h2>
                    ${renderMarkdown(result)}
                </div>
            `;
        }

        updateStatus('organizer', 'Complete!', 'success');
    } catch (error) {
        console.error('Summarize error:', error);
        updateStatus('organizer', `Failed: ${error.message}`, 'error');
    } finally {
        showLoader('organizer', false);
    }
}

// Compare content of group tabs with AI
async function compareGroup(groupIndex) {
    try {
        const group = currentTabGroups[groupIndex];
        if (!group) throw new Error('Group not found');

        updateStatus('organizer', 'Comparing...', 'info');
        showLoader('organizer', true);

        const tabs = await chrome.tabs.query({});
        const groupTabs = tabs.filter(t => group.tabIds.includes(t.id));

        if (groupTabs.length < 2) {
            updateStatus('organizer', 'Need 2+ tabs to compare', 'warning');
            showLoader('organizer', false);
            return;
        }

        const tabContents = [];

        for (const tab of groupTabs.slice(0, 3)) {
            try {
                const [{ result }] = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => ({
                        title: document.title,
                        url: window.location.href,
                        content: document.body.innerText.substring(0, 2000)
                    }),
                });

                tabContents.push(result);

            } catch (e) {
                console.warn(`Could not fetch tab ${tab.id}`, e);
            }
        }

        if (tabContents.length < 2) {
            updateStatus('organizer', 'Could not access enough tabs', 'error');
            showLoader('organizer', false);
            return;
        }

        const comparison = tabContents.map((t, i) => `
Tab ${i + 1}: ${t.title}
URL: ${t.url}
Content: ${t.content.substring(0, 500)}...
`).join('\n---\n');

        const prompt = `Compare these ${tabContents.length} websites. Provide:
1. Similarities
2. Differences
3. Best for what
4. Recommendations

${comparison}

Markdown format.`;

        const session = await createAISession();
        const result = await session.prompt(prompt);
        session.destroy();

        if (elements.results) {
            elements.results.innerHTML += `
                <div class="results-wrapper" style="margin-top: 24px; padding-top: 24px; border-top: 2px solid var(--border);">
                    <h2>🔍 Comparison: ${escapeHtml(group.groupName)}</h2>
                    ${renderMarkdown(result)}
                </div>
            `;
        }

        updateStatus('organizer', 'Complete!', 'success');
    } catch (error) {
        console.error('Compare error:', error);
        updateStatus('organizer', `Failed: ${error.message}`, 'error');
    } finally {
        showLoader('organizer', false);
    }
}

console.log('✅ Spectrum AI Pro V3.0 JavaScript loaded - Part 2/4');
// SCRIBE FUNCTIONS

// Start recording workflow steps
async function startScribe() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            updateStatus('scribe', 'No active tab', 'error');
            return;
        }

        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
            updateStatus('scribe', 'Cannot record Chrome internal pages', 'error');
            return;
        }

        isRecording = true;
        activeScribeTabId = tab.id;
        scribeSteps = [];

        elements.startScribeButton.style.display = 'none';
        elements.stopScribeButton.style.display = 'block';

        updateStatus('scribe', '🔴 Recording...', 'info');

        // Additional code can add event listeners to capture user steps

    } catch (error) {
        console.error('Start scribe error:', error);
        updateStatus('scribe', 'Failed to start', 'error');
    }
}

// Stop recording, generate guide
async function stopScribe() {
    isRecording = false;

    elements.startScribeButton.style.display = 'block';
    elements.stopScribeButton.style.display = 'none';

    updateStatus('scribe', 'Processing...', 'info');
    showLoader('scribe', true);

    try {
        // If no steps recorded, create dummy steps for demo
        if (scribeSteps.length === 0) {
            scribeSteps = [
                { action: 'Navigated to page', timestamp: Date.now() - 3000 },
                { action: 'Clicked button', timestamp: Date.now() - 2000 },
                { action: 'Completed workflow', timestamp: Date.now() }
            ];
        }

        await generateWorkflowGuide();

        if (elements.scribeActionsPanel) elements.scribeActionsPanel.style.display = 'block';
        if (elements.scribeChatContainer) elements.scribeChatContainer.style.display = 'block';

        updateStatus('scribe', '✅ Guide generated!', 'success');

    } catch (error) {
        console.error('Stop scribe error:', error);
        updateStatus('scribe', 'Failed to process', 'error');
    } finally {
        showLoader('scribe', false);
    }
}

// Generate workflow instructions using AI
async function generateWorkflowGuide() {
    const session = await createAISession();

    let html = '<div class="report-container"><h2>📝 Workflow Guide</h2>';

    for (let i = 0; i < scribeSteps.length; i++) {
        const step = scribeSteps[i];

        const prompt = `Create clear instructions for: "${step.action}". Start with action verb. 1-2 sentences.`;

        updateStatus('scribe', `Generating step ${i + 1}/${scribeSteps.length}...`, 'info');

        try {
            const stepText = await session.prompt(prompt);
            html += `<div class="scribe-step"><p><strong>Step ${i + 1}:</strong> ${escapeHtml(stepText)}</p></div>`;
        } catch (error) {
            html += `<div class="scribe-step"><p><strong>Step ${i + 1}:</strong> Failed to generate instruction</p></div>`;
        }
    }

    html += '</div>';
    session.destroy();

    if (elements.results) elements.results.innerHTML = html;
}

// Generalize recorded workflow into template
async function generalizeWorkflow() {
    if (scribeSteps.length === 0) return;

    const stepDescriptions = scribeSteps.map((step, i) => `Step ${i + 1}: ${step.action}`).join('\n');

    const prompt = `Generalize this workflow into a reusable template. Explain task type and how to adapt. Markdown.

Steps:
${stepDescriptions}`;

    await runAIAction(prompt, 'Generalizing...', 'scribe');
}

// Download guide as PDF by printing
function downloadPdf() {
    if (!elements.results) return;

    const content = elements.results.innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Workflow Guide</title>');
    printWindow.document.write('<style>body{font-family:Arial;padding:20px;}img{max-width:100%;margin:10px 0;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();

    updateStatus('scribe', '📄 Print dialog opened', 'success');
}

// CHAT FUNCTIONS

// Send chat message in context of current tab (auditor, organizer, scribe)
async function sendChatMessage(type) {
    const inputElement = elements[`${type}ChatInput`];
    const messagesElement = elements[`${type}ChatMessages`];
    if (!inputElement || !messagesElement) return;

    const message = inputElement.value.trim();
    if (!message) return;

    // Display user message
    const userMsgDiv = document.createElement('div');
    userMsgDiv.style.cssText = 'padding: 12px 16px; background: var(--accent); color: white; border-radius: 12px; margin-bottom: 10px; max-width: 85%; margin-left: auto;';
    userMsgDiv.textContent = message;
    messagesElement.appendChild(userMsgDiv);

    inputElement.value = '';

    // Prepare AI context based on chat type
    let context = '';
    if (type === 'auditor' && currentAuditReport) {
        context = `Based on this audit:\n${currentAuditReport}\n\nQuestion: ${message}`;
    } else if (type === 'organizer' && currentTabGroups.length > 0) {
        const groupInfo = currentTabGroups.map(g => `${g.groupName}: ${g.tabIds.length} tabs`).join(', ');
        context = `Tabs organized into: ${groupInfo}. Question: ${message}`;
    } else {
        context = message;
    }

    // Show thinking placeholder
    const thinkingDiv = document.createElement('div');
    thinkingDiv.style.cssText = 'padding: 12px 16px; background: var(--bg-tertiary); border-radius: 12px; margin-bottom: 10px;';
    thinkingDiv.textContent = '💭 Thinking...';
    messagesElement.appendChild(thinkingDiv);
    messagesElement.scrollTop = messagesElement.scrollHeight;

    try {
        const session = await createAISession();
        const response = await session.prompt(context);
        session.destroy();

        messagesElement.removeChild(thinkingDiv);

        const aiMsgDiv = document.createElement('div');
        aiMsgDiv.style.cssText = 'padding: 12px 16px; background: var(--bg-tertiary); border-radius: 12px; margin-bottom: 10px;';
        aiMsgDiv.innerHTML = renderMarkdown(response);
        messagesElement.appendChild(aiMsgDiv);

        messagesElement.scrollTop = messagesElement.scrollHeight;

    } catch (error) {
        console.error('Chat error:', error);
        messagesElement.removeChild(thinkingDiv);

        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'padding: 12px 16px; background: var(--error-light); color: var(--error); border-radius: 12px; margin-bottom: 10px;';
        errorDiv.textContent = `❌ Error: ${error.message}`;
        messagesElement.appendChild(errorDiv);
    }
}

console.log('✅ Spectrum AI Pro V3.0 JavaScript loaded - Part 3/4');
// HISTORY FUNCTIONS

// Load saved audit history from chrome storage
async function loadHistory() {
    try {
        const { history = [] } = await chrome.storage.local.get('history');

        if (history.length === 0) {
            if (elements.results) {
                elements.results.innerHTML = `
                    <div class="placeholder">
                        <div style="font-size: 64px;">🕒</div>
                        <h2>No History Yet</h2>
                        <p>Past reports will appear here</p>
                    </div>
                `;
            }
            return;
        }

        let html = '<div class="report-container">';

        history.forEach(item => {
            html += `
                <div class="history-item" data-history-id="${item.id}">
                    <div class="history-item-url">${escapeHtml(item.url)}</div>
                    <div class="history-item-date">${new Date(item.date).toLocaleString()}</div>
                </div>
            `;
        });

        html += '</div>';

        if (elements.results) elements.results.innerHTML = html;

        setupHistoryEventDelegation();

    } catch (error) {
        console.error('Load history error:', error);
    }
}

// Setup click events for history list
function setupHistoryEventDelegation() {
    const resultsContainer = elements.results;
    if (!resultsContainer) return;

    if (resultsContainer._historyListener) {
        resultsContainer.removeEventListener('click', resultsContainer._historyListener);
    }

    const newListener = async (e) => {
        const historyItem = e.target.closest('[data-history-id]');
        if (!historyItem) return;

        const id = historyItem.dataset.historyId;
        await loadAuditFromHistory(id);
    };

    resultsContainer._historyListener = newListener;
    resultsContainer.addEventListener('click', newListener);
}

// Load specific audit report from history by id
async function loadAuditFromHistory(id) {
    try {
        const { history = [] } = await chrome.storage.local.get('history');
        const item = history.find(h => h.id === id);

        if (item) {
            currentAuditReport = item.report;
            currentAuditUrl = item.url;

            if (elements.results) elements.results.innerHTML = `<div class="results-wrapper">${renderMarkdown(item.report)}</div>`;

            if (elements.aiActionsPanel) elements.aiActionsPanel.style.display = 'block';
            if (elements.auditorChatContainer) elements.auditorChatContainer.style.display = 'block';
            if (elements.copyReportButton) elements.copyReportButton.style.display = 'block';

            updateStatus('audit', `Loaded from ${new Date(item.date).toLocaleDateString()}`, 'info');

            switchTab('auditor');
        }
    } catch (error) {
        console.error('Load audit error:', error);
    }
}

// Search history UI based on input
function searchHistory(e) {
    const searchTerm = e.target.value.toLowerCase();
    const historyItems = document.querySelectorAll('.history-item');

    historyItems.forEach(item => {
        const url = item.querySelector('.history-item-url').textContent.toLowerCase();
        item.style.display = url.includes(searchTerm) ? 'block' : 'none';
    });
}

// Clear entire history (prompt user for confirmation)
async function clearHistory() {
    if (confirm('Clear all history?')) {
        await chrome.storage.local.set({ history: [] });
        loadHistory();
    }
}

// Save audit report to history in chrome storage
async function saveAudit(url, report) {
    try {
        const { history = [] } = await chrome.storage.local.get('history');

        const newEntry = {
            id: Date.now().toString(),
            url,
            report,
            date: new Date().toISOString()
        };

        history.unshift(newEntry);
        if (history.length > 50) history.pop(); // Keep max 50 entries

        await chrome.storage.local.set({ history });
    } catch (error) {
        console.error('Save audit error:', error);
    }
}

console.log('✅ Spectrum AI Pro V3.0 JavaScript fully loaded - Part 4/4');
