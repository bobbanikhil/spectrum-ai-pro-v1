// sidepanel.js - Spectrum AI V2.2 - Production Ready & Fully Functional

(async function () {
    'use strict';

    // --- STATE & CONFIGURATION ---
    const state = {
        sessions: {}, // To cache AI model sessions for performance
        auditor: { report: '', url: '' },
        organizer: { groups: [], tabs: [], context: {} },
        echoGuide: { steps: [], isRecording: false, guide: '' },
        currentTabId: 'auditor',
        splitter: { isDragging: false }
    };

    // --- DOM & UTILITY FUNCTIONS ---
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector); // FIX: Use querySelectorAll for multiple elements
    const escapeHtml = (str) => String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);

    function renderMarkdown(md) {
        if (!md) return '<p class="placeholder">No content available.</p>';
        let html = escapeHtml(md)
            .replace(/^##\s+(.*?)\[(.*?\/.*?)\]/gim, '<h2>$1<span class="score-badge">$2</span></h2>')
            .replace(/^##\s+(.*)$/gim, '<h2>$1</h2>')
            .replace(/^###\s+(.*)$/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\*\s+(.*)$/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/gis, '<ul>$1</ul>').replace(/<\/ul>\s?<ul>/g, '');
        return html.split('\n\n').map(p => {
            const trimmed = p.trim();
            if (trimmed.startsWith('<ul>') || trimmed.startsWith('<h') || trimmed.length === 0) return p;
            return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
        }).join('');
    }
    
    const updateStatus = (scope, message, type = 'info') => {
        const el = $(`#${scope}-status`);
        if (el) {
            el.innerHTML = `<p class="placeholder ${type}">${escapeHtml(message)}</p>`;
        }
    };

    // --- AI & PAGE CONTENT ABSTRACTIONS (HARDENED) ---
    const getModel = async (scope, options = {}) => {
        if (state.sessions[scope]) {
            try {
                await state.sessions[scope].prompt("ping");
                return state.sessions[scope];
            } catch (e) {
                try { state.sessions[scope].destroy(); } catch (err) {}
                delete state.sessions[scope];
            }
        }

        if (typeof self.LanguageModel === 'undefined') {
            throw new Error("AI model API not found. Please follow setup instructions.");
        }
        try {
            // FIX: Use availability() instead of canCreate()
            const availability = await self.LanguageModel.availability();
            if (availability !== 'readily') {
                 throw new Error(`AI model not ready (Status: ${availability}). Please check chrome://components.`);
            }
            // FIX: Add mandatory outputLanguage parameter
            const session = await self.LanguageModel.create({ outputLanguage: 'en', ...options });
            state.sessions[scope] = session;
            return session;
        } catch (e) {
            throw new Error(`Failed to create AI session: ${e.message}`);
        }
    };

    const getPageContent = async (maxChars = 8000) => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id || !tab.url.startsWith('http')) {
                throw new Error("Cannot access content on this page. Navigate to a valid webpage.");
            }
            const [{ result }] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => ({ url: window.location.href, title: document.title, content: document.body.innerText })
            });
            if (!result || typeof result.content !== 'string') {
                 throw new Error("Page content is empty. Please try reloading.");
            }
            return { ...result, content: result.content.substring(0, maxChars) };
        } catch (e) {
             throw new Error(`Could not access page content. Please reload the page.`);
        }
    };

    // --- CORE UI: TABS & SPLITTER ---
    function setupTabs() {
        $$('.tab-link').forEach(tab => {
            tab.addEventListener('click', () => {
                if (state.echoGuide.isRecording) {
                    updateStatus('echoGuide', 'Please stop recording before switching tabs.', 'error');
                    return;
                }
                state.currentTabId = tab.dataset.tab;
                $$('.tab-link').forEach(t => t.classList.toggle('active', t === tab));
                $$('.tab-content').forEach(c => c.classList.toggle('active', c.id === state.currentTabId));
                if (state.currentTabId === 'history') loadHistory();
                applySplitterState(state.currentTabId);
            });
        });
    }

    function setupSplitters() {
        $$('.split-resizer').forEach(resizer => {
            const layout = resizer.closest('.split-layout');
            const leftPane = layout.querySelector('.left-pane');

            const onMouseMove = (e) => {
                if (!state.splitter.isDragging) return;
                const rect = layout.getBoundingClientRect();
                let newFlexBasis = ((e.clientX - rect.left) / rect.width) * 100;
                newFlexBasis = Math.max(25, Math.min(75, newFlexBasis));
                leftPane.style.flex = `0 0 ${newFlexBasis}%`;
            };

            const onMouseUp = async () => {
                if (!state.splitter.isDragging) return;
                state.splitter.isDragging = false;
                document.body.style.cursor = 'default';
                resizer.classList.remove('resizing');
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp, { once: true });
                const percent = parseFloat(leftPane.style.flexBasis);
                await chrome.storage.local.set({ [`splitter:${state.currentTabId}`]: percent });
            };

            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                state.splitter.isDragging = true;
                document.body.style.cursor = 'col-resize';
                resizer.classList.add('resizing');
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp, { once: true });
            });
        });
    }

    async function applySplitterState(tabId) {
        const layout = $(`#${tabId} .split-layout`);
        if (!layout) return;
        const leftPane = layout.querySelector('.left-pane');
        const { [`splitter:${tabId}`]: percent } = await chrome.storage.local.get(`splitter:${tabId}`);
        leftPane.style.flex = `0 0 ${percent || 45}%`;
    }

    // --- AUDITOR FEATURE ---
    function setupAuditor() {
        $('#auditButton').addEventListener('click', async () => {
            $('#loader').style.display = 'block';
            $('#results').innerHTML = '';
            updateStatus('chat', 'Starting audit...');
            // FIX: Use $$ to select multiple elements
            $$('#aiActionsPanel, #copyButton, #auditor-chat-container').forEach(el => el.style.display = 'none');

            try {
                const page = await getPageContent();
                state.auditor.url = page.url;
                const prompt = `Perform a 12-point web audit in Markdown. For each section, provide a score [X/10], a Key Observation, and an Actionable Recommendation. End with a short Executive Summary.\n\nCONTENT:\n${page.content}`;
                let accumulated = '';
                const session = await getModel('auditor');
                const stream = session.promptStreaming(prompt);
                updateStatus('chat', 'Generating report live...');
                for await (const chunk of stream) {
                    accumulated += chunk;
                    state.auditor.report = accumulated;
                    $('#results').innerHTML = renderMarkdown(accumulated);
                }
                updateStatus('chat', 'Audit complete.');
                $$('#aiActionsPanel, #copyButton, #auditor-chat-container').forEach(el => el.style.display = el.id.includes('chat') ? 'flex' : 'grid');
                await saveHistory('audit', page.url, accumulated);
            } catch (e) {
                updateStatus('chat', `Audit failed: ${e.message}`, 'error');
                $('#results').innerHTML = `<p class="placeholder error" style="text-align: left;">${e.message}</p>`;
            } finally {
                $('#loader').style.display = 'none';
            }
        });

        $('#copyButton').addEventListener('click', async () => {
            await navigator.clipboard.writeText(state.auditor.report);
            updateStatus('chat', 'Report copied!', 'success');
        });

        setupChat('auditor', () => state.auditor.report);
    }
    
    // --- EMAIL DRAFTER FEATURE ---
    function setupEmailDrafter() {
        $('#draftEmailButton').addEventListener('click', async () => {
            $('#email-loader').style.display = 'block';
            $('#email-results').innerHTML = '';
            $('#copyEmailButton').style.display = 'none';
            updateStatus('email-drafter', 'Drafting email...');

            try {
                const page = await getPageContent(4000);
                const prompt = `Draft an email with the following parameters. Output ONLY a valid JSON object with "subject" and "body" keys.\nTone: ${$('#email-tone').value}\nObjective: ${$('#email-objective').value}\nAdditional Context: ${$('#email-context').value || 'None'}\nSource Content: ${page.content}`;
                const session = await getModel('email');
                const response = await session.prompt(prompt);
                const email = JSON.parse(response.replace(/```json\n?|```/g, '').trim());

                state.emailDrafter = email;
                $('#email-results').innerHTML = `<div class="email-output"><div class="email-subject">Subject: ${escapeHtml(email.subject)}</div><div class="email-body">${escapeHtml(email.body).replace(/\n/g, '<br>')}</div></div>`;
                updateStatus('email-drafter', 'Draft complete.', 'success');
                $('#copyEmailButton').style.display = 'block';
            } catch (e) {
                updateStatus('email-drafter', `Draft failed: ${e.message}`, 'error');
            } finally {
                $('#email-loader').style.display = 'none';
            }
        });

        $('#copyEmailButton').addEventListener('click', async () => {
            const { subject, body } = state.emailDrafter;
            await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
            updateStatus('email-drafter', 'Email copied!', 'success');
        });
    }

    // --- TAB ORGANIZER FEATURE ---
    function setupOrganizer() {
        $('#organizeTabsButton').addEventListener('click', async () => {
            $('#organizer-loader').style.display = 'block';
            $('#organizer-results').innerHTML = '';
            updateStatus('organizer', 'Analyzing tabs...');
            $('#organizer-chat-container').style.display = 'none';

            try {
                state.organizer.tabs = await chrome.tabs.query({ windowType: 'normal', url: ["http://*/*", "https://*/*"] });
                if (state.organizer.tabs.length < 2) {
                    updateStatus('organizer', 'Not enough tabs to organize.', 'info');
                    $('#organizer-loader').style.display = 'none';
                    return;
                }
                const tabInfo = state.organizer.tabs.map(t => `ID ${t.id}: "${t.title}"`).join('\n');
                const prompt = `Group these browser tabs into logical categories. Output ONLY a valid JSON array of objects, where each object has "groupName" (string) and "tabIds" (array of numbers).\n\nTabs:\n${tabInfo}`;
                const session = await getModel('organizer');
                const response = await session.prompt(prompt);
                state.organizer.groups = JSON.parse(response.replace(/```json\n?|```/g, '').trim());
                
                $('#organizer-results').innerHTML = '';
                state.organizer.groups.forEach(group => {
                    const groupDiv = document.createElement('div');
                    groupDiv.className = 'organizer-group';
                    const tabLinks = group.tabIds.map(id => {
                        const tab = state.organizer.tabs.find(t => t.id === id);
                        return tab ? `<li><a href="${tab.url}" target="_blank" title="${escapeHtml(tab.url)}">${escapeHtml(tab.title)}</a></li>` : '';
                    }).join('');
                    groupDiv.innerHTML = `<h3>${escapeHtml(group.groupName)}</h3><ul>${tabLinks}</ul>
                        <div class="contextual-actions">
                            <button class="ai-action-button group-button" data-tab-ids='${JSON.stringify(group.tabIds)}' data-group-name='${escapeHtml(group.groupName)}'>Group Tabs</button>
                            <button class="ai-action-button chat-button" data-tab-ids='${JSON.stringify(group.tabIds)}' data-group-name='${escapeHtml(group.groupName)}'>Chat with Group</button>
                        </div>`;
                    $('#organizer-results').appendChild(groupDiv);
                });
                updateStatus('organizer', 'Tabs analyzed.', 'success');

            } catch (e) {
                updateStatus('organizer', `Grouping failed: ${e.message}`, 'error');
            } finally {
                $('#organizer-loader').style.display = 'none';
            }
        });

        $('#organizer-results').addEventListener('click', async (e) => {
            const button = e.target.closest('.ai-action-button');
            if (!button) return;
            const tabIds = JSON.parse(button.dataset.tabIds);
            const groupName = button.dataset.groupName;
            
            if (button.classList.contains('group-button')) {
                const groupId = await chrome.tabs.group({ tabIds });
                await chrome.tabGroups.update(groupId, { title: groupName });
                updateStatus('organizer', `Group "${groupName}" created!`, 'success');
                button.disabled = true;
            } else if (button.classList.contains('chat-button')) {
                updateStatus('organizer', `Loading context for "${groupName}"...`);
                const { combinedContent } = await chrome.runtime.sendMessage({ action: 'getTabGroupContent', tabIds });
                state.organizer.context[groupName] = combinedContent;
                $('#organizer-chat-container').style.display = 'flex';
                $('#organizer-chat-container .panel-header').textContent = `Chat: ${groupName}`;
                $('#organizer-chat-input').dataset.currentGroup = groupName;
                updateStatus('organizer', `Ready to chat about "${groupName}".`, 'info');
            }
        });
        
        setupChat('organizer', () => {
            const groupName = $('#organizer-chat-input').dataset.currentGroup;
            return state.organizer.context[groupName] || "No context loaded for this group.";
        });
    }
    
    // --- ECHOGUIDE FEATURE ---
    function setupEchoGuide() {
        const startBtn = $('#startEchoGuideButton');
        const stopBtn = $('#stopEchoGuideButton');
        const results = $('#echoGuide-results');
        const loader = $('#echoGuide-loader');
        
        startBtn.addEventListener('click', async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url || !tab.url.startsWith('http')) {
                updateStatus('echoGuide', 'Cannot record on this page.', 'error');
                return;
            }
            state.echoGuide.isRecording = true;
            state.echoGuide.steps = [];
            results.innerHTML = '<p class="placeholder">Recording... Clicks and navigation are being captured.</p>';
            updateStatus('echoGuide', 'Recording started.', 'info');
            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
            $('#echoGuideActionsPanel, #echoGuide-chat-container').forEach(el => el.style.display = 'none');
            await chrome.runtime.sendMessage({ action: "injectScribe", tabId: tab.id });
        });

        stopBtn.addEventListener('click', async () => {
            state.echoGuide.isRecording = false;
            await chrome.runtime.sendMessage({ action: "stopScribe" });
            stopBtn.style.display = 'none';
            startBtn.style.display = 'block';
            loader.style.display = 'block';
            updateStatus('echoGuide', 'Generating guide from recorded steps...');

            setTimeout(async () => {
                try {
                    if (state.echoGuide.steps.length === 0) throw new Error("No steps were recorded.");
                    results.innerHTML = ''; // Clear placeholder before rendering steps
                    state.echoGuide.steps.forEach((step, i) => {
                        const stepDiv = document.createElement('div');
                        stepDiv.className = 'scribe-step';
                        stepDiv.innerHTML = `<p><strong>Step ${i + 1}:</strong> ${escapeHtml(step.action)}</p><img src="${step.screenshotUrl}" alt="Step ${i + 1} screenshot">`;
                        results.appendChild(stepDiv);
                    });

                    const stepDescriptions = state.echoGuide.steps.map((s, i) => `Step ${i+1}: ${s.action}`).join('\n');
                    const prompt = `You are a technical writer. Create a clear, step-by-step guide from these recorded actions. Format as clean Markdown.\n\nActions:\n${stepDescriptions}`;
                    const session = await getModel('echoGuide');
                    state.echoGuide.guide = await session.prompt(prompt);
                    
                    const aiText = document.createElement('div');
                    aiText.innerHTML = renderMarkdown(`<h2>Generated Guide</h2>${state.echoGuide.guide}`);
                    results.prepend(aiText);
                    
                    updateStatus('echoGuide', 'Guide generated.', 'success');
                    $('#echoGuideActionsPanel, #echoGuide-chat-container').forEach(el => el.style.display = el.id.includes('chat') ? 'flex' : 'grid');
                } catch (e) {
                    updateStatus('echoGuide', `Guide generation failed: ${e.message}`, 'error');
                    results.innerHTML = `<p class="placeholder error">${e.message}</p>`;
                } finally {
                    loader.style.display = 'none';
                }
            }, 500);
        });

        $('#downloadPdfButton').addEventListener('click', async () => {
             if (state.echoGuide.steps.length === 0) {
                updateStatus('echoGuide', 'No guide to download.', 'error');
                return;
            }
            updateStatus('echoGuide', 'Generating PDF...');
            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ unit: 'pt', format: 'a4' });
                
                let yPos = 40;
                doc.setFontSize(20).text("Spectrum AI - EchoGuide Workflow", doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
                yPos += 40;
                
                for (let i = 0; i < state.echoGuide.steps.length; i++) {
                    const step = state.echoGuide.steps[i];
                    const textLines = doc.splitTextToSize(`Step ${i + 1}: ${step.action}`, doc.internal.pageSize.getWidth() - 80);
                    const textHeight = textLines.length * 12;

                    const img = new Image();
                    img.src = step.screenshotUrl;
                    await new Promise(resolve => img.onload = resolve);
                    const imgProps = doc.getImageProperties(img);
                    const imgWidth = doc.internal.pageSize.getWidth() - 80;
                    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

                    if (yPos + textHeight + imgHeight + 40 > doc.internal.pageSize.getHeight()) {
                        doc.addPage();
                        yPos = 40;
                    }
                    
                    doc.setFontSize(12).setFont(undefined, 'bold').text(textLines, 40, yPos);
                    yPos += textHeight + 10;
                    
                    doc.addImage(img, 'PNG', 40, yPos, imgWidth, imgHeight);
                    yPos += imgHeight + 20;
                }
                doc.save('SpectrumAI-Guide.pdf');
                updateStatus('echoGuide', 'PDF Downloaded.', 'success');
            } catch (e) {
                updateStatus('echoGuide', `PDF generation failed: ${e.message}`, 'error');
            }
        });

        setupChat('echoGuide', () => `Guide Content:\n${state.echoGuide.guide}\n\nRecorded Steps:\n${state.echoGuide.steps.map(s => s.action).join('\n')}`);
    }
    
    // --- HISTORY FEATURE ---
    async function saveHistory(type, url, content) {
        const { history = [] } = await chrome.storage.local.get('history');
        history.unshift({ id: Date.now(), type, url, content, date: new Date().toISOString() });
        await chrome.storage.local.set({ history: history.slice(0, 50) });
    }

    async function loadHistory(filter = '') {
        const { history = [] } = await chrome.storage.local.get('history');
        const filtered = filter ? history.filter(h => h.url.toLowerCase().includes(filter.toLowerCase())) : history;
        const container = $('#history-results');
        if (filtered.length === 0) {
            container.innerHTML = '<p class="placeholder">No history found.</p>';
            return;
        }
        container.innerHTML = filtered.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-url">${item.type === 'audit' ? '🔍' : '📹'} ${escapeHtml(item.url)}</div>
                <div class="history-item-date">📅 ${new Date(item.date).toLocaleString()}</div>
            </div>
        `).join('');
    }

    function setupHistory() {
        $('#historySearchInput').addEventListener('input', (e) => loadHistory(e.target.value));
        $('#clearHistoryButton').addEventListener('click', async () => {
            await chrome.storage.local.set({ history: [] });
            loadHistory();
        });
        
        $('#history-results').addEventListener('click', async (e) => {
            const item = e.target.closest('.history-item');
            if (!item) return;
            const { history = [] } = await chrome.storage.local.get('history');
            const entry = history.find(h => h.id == item.dataset.id);
            if (!entry) return;

            $$('.tab-link').forEach(t => t.classList.toggle('active', t.dataset.tab === 'auditor'));
            $$('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'auditor'));
            
            state.auditor.report = entry.content;
            $('#results').innerHTML = renderMarkdown(entry.content);
            updateStatus('chat', `Loaded audit from ${new Date(entry.date).toLocaleDateString()}`);
            // FIX: Use $$ for multiple elements
            $$('#copyButton, #aiActionsPanel, #auditor-chat-container').forEach(el => el.style.display = el.id.includes('chat') ? 'flex' : 'grid');
        });
    }

    // --- GENERIC CHATBOT FACTORY ---
    function setupChat(scope, getContext) {
        const input = $(`#${scope}-chat-input`);
        const sendBtn = $(`#${scope}-chat-send`);
        const messages = $(`#${scope}-chat-messages`);

        const appendMessage = (sender, text) => {
            const div = document.createElement('div');
            div.className = `chat-message ${sender}`;
            div.innerHTML = `<div class="chat-message-header">${sender === 'user' ? 'You' : 'Assistant'}</div><div>${renderMarkdown(text)}</div>`;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        };

        const onSend = async () => {
            const query = input.value.trim();
            if (!query) return;
            input.value = '';
            input.disabled = true;
            sendBtn.disabled = true;
            appendMessage('user', query);
            
            try {
                const context = getContext();
                if (!context) throw new Error("No context is available for this chat.");
                const prompt = `Based *only* on the provided context below, answer the user's question concisely.\n\nContext:\n${context.substring(0, 7000)}\n\nUser Question: ${query}`;
                const session = await getModel(`${scope}-chat`);
                const response = await session.prompt(prompt);
                appendMessage('assistant', response);
            } catch (e) {
                appendMessage('assistant', `Sorry, I couldn't answer that. Error: ${e.message}`);
            } finally {
                input.disabled = false;
                sendBtn.disabled = false;
                input.focus();
            }
        };

        sendBtn.addEventListener('click', onSend);
        input.addEventListener('keydown', (e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend()));
    }

    // --- CHROME MESSAGE LISTENER (from Scribe) ---
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'scribeStepCaptured' && state.echoGuide.isRecording) {
            state.echoGuide.steps.push(request.data);
            updateStatus('echoGuide', `Step ${state.echoGuide.steps.length} captured.`, 'info');
        } else if (request.action === 'scribeStepFailed') {
            updateStatus('echoGuide', `Failed to capture screenshot. Please try the action again.`, 'error');
        }
    });

    // --- INITIALIZATION ---
    document.addEventListener('DOMContentLoaded', () => {
        setupTabs();
        setupSplitters();
        setupAuditor();
        setupEmailDrafter();
        setupOrganizer();
        setupEchoGuide();
        setupHistory();
        applySplitterState('auditor');
    });

})();