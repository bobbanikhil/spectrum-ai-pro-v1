/**
 * Spectrum AI v3.2 - Intelligent Setup System
 * - Fixed: Added `outputLanguage` to `LM.create()` call.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 SETUP STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

const SETUP_STATE = {
    currentStep: 0,
    totalSteps: 4,
    completedSteps: [],
    requirements: {
        chromeVersion: false,
        promptApiFlag: false,
        modelFlag: false,
        modelDownloaded: false,
        aiIntegration: false
    },
    aiSession: null,
    checkIntervals: new Map(),
    isSetupComplete: false
};

// DOM elements cache
const DOM = {
    progressFill: null,
    progressText: null,
    setupSteps: new Map(),
    statusElements: new Map()
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Spectrum AI Setup v3.2 Initializing...');
    initializeSetup();
});

async function initializeSetup() {
    try {
        cacheDOMElements();
        setupEventListeners();
        updateProgress();
        await runInitialChecks();
        setupPeriodicChecks();
        console.log('✅ Setup system initialized');
    } catch (error) {
        console.error('❌ Setup initialization failed:', error);
        showError('Setup initialization failed', error.message);
    }
}

function cacheDOMElements() {
    DOM.progressFill = document.getElementById('progress-fill');
    DOM.progressText = document.getElementById('progress-text');
    DOM.setupSteps.set('chrome-version', document.getElementById('step-chrome-version'));
    DOM.setupSteps.set('chrome-flags', document.getElementById('step-chrome-flags'));
    DOM.setupSteps.set('model-download', document.getElementById('step-model-download'));
    DOM.setupSteps.set('final-setup', document.getElementById('step-final-setup'));
    DOM.statusElements.set('chrome-version-text', document.getElementById('chrome-version-text'));
    DOM.statusElements.set('chrome-version-spinner', document.getElementById('chrome-version-spinner'));
    DOM.statusElements.set('model-status-text', document.getElementById('model-status-text'));
    DOM.statusElements.set('ai-integration-text', document.getElementById('ai-integration-text'));
    DOM.statusElements.set('ai-integration-spinner', document.getElementById('ai-integration-spinner'));
}

function setupEventListeners() {
    document.getElementById('open-flags-btn')?.addEventListener('click', openChromeFlags);
    document.getElementById('copy-flags-btn')?.addEventListener('click', copyFlagNames);
    document.getElementById('open-components-btn')?.addEventListener('click', openChromeComponents);
    document.getElementById('check-model-btn')?.addEventListener('click', checkModelStatus);
    document.getElementById('restart-chrome-btn')?.addEventListener('click', showRestartInstructions);
    document.getElementById('launch-spectrum-btn')?.addEventListener('click', launchSpectrumAI);
    document.getElementById('open-spectrum-ai-btn')?.addEventListener('click', openSpectrumAI);
    document.getElementById('view-documentation-btn')?.addEventListener('click', viewDocumentation);
    document.getElementById('troubleshooting-btn')?.addEventListener('click', showTroubleshooting);
    document.getElementById('close-troubleshooting')?.addEventListener('click', hideTroubleshooting);
    document.getElementById('start-using-btn')?.addEventListener('click', startUsingSpectrumAI);
    document.getElementById('troubleshooting-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'troubleshooting-modal') hideTroubleshooting();
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔍 COMPREHENSIVE CHROME & AI DETECTION
// ═══════════════════════════════════════════════════════════════════════════

async function runInitialChecks() {
    console.log('🔍 Running comprehensive system checks...');
    await checkChromeVersion();
    await checkChromeFlags();
    await checkAIModelAvailability();
    await testAIIntegration();
    updateProgress();
}

async function checkChromeVersion() {
    try {
        console.log('🌐 Checking Chrome version...');
        const userAgent = navigator.userAgent;
        const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
        if (!chromeMatch) {
            updateStatus('chrome-version-text', 'Not Chrome Browser', 'error');
            return;
        }
        const majorVersion = parseInt(chromeMatch[1]);
        const statusElement = DOM.statusElements.get('chrome-version-text');
        const spinnerElement = DOM.statusElements.get('chrome-version-spinner');
        if (statusElement && spinnerElement) spinnerElement.style.display = 'none';

        if (majorVersion >= 127) {
            updateStatus('chrome-version-text', `Chrome ${chromeMatch[1]} ✅`, 'success');
            SETUP_STATE.requirements.chromeVersion = true;
            markStepComplete('chrome-version');
        } else {
            updateStatus('chrome-version-text', `Chrome ${chromeMatch[1]} (Need 127+)`, 'error');
        }
    } catch (error) {
        console.error('Chrome version check failed:', error);
        updateStatus('chrome-version-text', 'Check Failed', 'error');
    }
}

async function checkChromeFlags() {
    try {
        console.log('🚩 Checking Chrome flags...');
        const hasLanguageModel = typeof self.LanguageModel !== 'undefined';
        const promptApiElement = document.querySelector('#prompt-api-flag .requirement-status');
        const modelFlagElement = document.querySelector('#model-flag .requirement-status');

        if (hasLanguageModel) {
            updateFlagStatus(promptApiElement, 'Enabled ✅', 'success');
            updateFlagStatus(modelFlagElement, 'Enabled ✅', 'success');
            SETUP_STATE.requirements.promptApiFlag = true;
            SETUP_STATE.requirements.modelFlag = true;
            markStepComplete('chrome-flags');
        } else {
            updateFlagStatus(promptApiElement, 'Not Enabled ❌', 'error');
            updateFlagStatus(modelFlagElement, 'Not Enabled ❌', 'error');
        }
    } catch (error) {
        console.error('Chrome flags check failed:', error);
    }
}

async function checkAIModelAvailability() {
    try {
        console.log('🤖 Checking AI model availability...');
        const LM = typeof self.LanguageModel !== 'undefined' ? self.LanguageModel : undefined;
        if (typeof LM === 'undefined') {
            updateStatus('model-status-text', 'Flags Not Enabled', 'error');
            return;
        }
        const availability = await LM.availability();
        console.log('📊 LanguageModel availability:', availability);

        switch (availability) {
            case 'readily':
                updateStatus('model-status-text', 'Ready ✅', 'success');
                SETUP_STATE.requirements.modelDownloaded = true;
                markStepComplete('model-download');
                break;
            case 'available':
                updateStatus('model-status-text', 'Available ✅', 'success');
                SETUP_STATE.requirements.modelDownloaded = true;
                markStepComplete('model-download');
                break;
            case 'after-download':
                updateStatus('model-status-text', 'Need Download ⏳', 'warning');
                showDownloadInstructions();
                break;
            case 'no':
            default:
                updateStatus('model-status-text', `Not Supported (${availability}) ❌`, 'error');
        }
    } catch (error) {
        console.error('AI model availability check failed:', error);
        updateStatus('model-status-text', 'Check Failed ❌', 'error');
    }
}

async function testAIIntegration() {
    try {
        console.log('⚡ Testing AI integration...');
        const LM = typeof self.LanguageModel !== 'undefined' ? self.LanguageModel : undefined;
        if (!SETUP_STATE.requirements.modelDownloaded || typeof LM === 'undefined') {
            updateStatus('ai-integration-text', 'Model Not Ready', 'warning');
            return;
        }

        // ★★★ FIX: Added outputLanguage ★★★
        const session = await LM.create({ outputLanguage: 'en' });
        if (session) {
            SETUP_STATE.aiSession = session;
            const testResponse = await session.prompt('Say "Hello"');
            if (testResponse && testResponse.toLowerCase().includes('hello')) {
                updateStatus('ai-integration-text', 'Working Perfectly ✅', 'success');
                SETUP_STATE.requirements.aiIntegration = true;
                markStepComplete('final-setup');
                showLaunchButton();
            } else {
                updateStatus('ai-integration-text', 'Response Issues ⚠️', 'warning');
            }
            session.destroy();
        }
    } catch (error) {
        console.error('AI integration test failed:', error);
        updateStatus('ai-integration-text', 'Integration Failed ❌', 'error');
    } finally {
        const spinnerElement = DOM.statusElements.get('ai-integration-spinner');
        if (spinnerElement) spinnerElement.style.display = 'none';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 PROGRESS & STATUS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function updateProgress() {
    const completedCount = Object.values(SETUP_STATE.requirements).filter(Boolean).length;
    const totalRequirements = Object.keys(SETUP_STATE.requirements).length;
    const percentage = Math.round((completedCount / totalRequirements) * 100);

    if (DOM.progressFill) DOM.progressFill.style.width = `${percentage}%`;
    if (DOM.progressText) DOM.progressText.textContent = `${percentage}% Complete`;
    if (completedCount === totalRequirements) {
        SETUP_STATE.isSetupComplete = true;
        showSetupComplete();
    }
    console.log(`📊 Setup progress: ${completedCount}/${totalRequirements} (${percentage}%)`);
}

function updateStatus(elementId, text, type = 'info') {
    const element = DOM.statusElements.get(elementId);
    if (!element) return;
    element.textContent = text;
    element.className = `status-text ${type}`;
}

function updateFlagStatus(parentElement, text, type) {
    if (!parentElement) return;
    const statusText = parentElement.querySelector('.status-text');
    const statusIndicator = parentElement.querySelector('.status-indicator');
    if (statusText) statusText.textContent = text;
    if (statusIndicator) {
        statusIndicator.className = `status-indicator ${type === 'success' ? 'complete' : 'pending'}`;
        statusIndicator.textContent = getStatusIcon(type);
    }
}

function getStatusIcon(type) {
    return {
        success: '✅ Enabled',
        error: '❌ Not Enabled',
        warning: '⏳ Pending',
        pending: '⏳ Pending'
    }[type] || '⏳ Pending';
}

function markStepComplete(stepId) {
    const stepElement = DOM.setupSteps.get(stepId);
    if (stepElement && !stepElement.classList.contains('completed')) {
        stepElement.classList.add('completed');
        const stepNumber = stepElement.querySelector('.step-number');
        if (stepNumber) {
            stepNumber.style.background = 'var(--success)';
            stepNumber.innerHTML = '✅';
        }
        if (!SETUP_STATE.completedSteps.includes(stepId)) {
            SETUP_STATE.completedSteps.push(stepId);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 PERIODIC MONITORING & ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function setupPeriodicChecks() {
    const aiCheckInterval = setInterval(async () => {
        if (!SETUP_STATE.requirements.aiIntegration) {
            await checkAIModelAvailability();
            await testAIIntegration();
            updateProgress();
        } else {
            clearInterval(aiCheckInterval);
        }
    }, 10000);
    SETUP_STATE.checkIntervals.set('aiCheck', aiCheckInterval);

    const flagsCheckInterval = setInterval(async () => {
        if (!SETUP_STATE.requirements.promptApiFlag) {
            await checkChromeFlags();
            updateProgress();
        } else {
            clearInterval(flagsCheckInterval);
        }
    }, 5000);
    SETUP_STATE.checkIntervals.set('flagsCheck', flagsCheckInterval);
}

async function checkModelStatus() {
    await checkAIModelAvailability();
    await testAIIntegration();
    updateProgress();
    showNotification('Model status refreshed', 'info');
}

function openChromeFlags() {
    chrome.tabs.create({ url: 'chrome://flags/#prompt-api-for-gemini-nano' });
    showNotification('Chrome flags page opened', 'success');
    setTimeout(showFlagInstructions, 1000);
}

function copyFlagNames() {
    const flagNames = `#prompt-api-for-gemini-nano
#optimization-guide-on-device-model`;
    navigator.clipboard.writeText(flagNames).then(() => {
        showNotification('Flag names copied to clipboard', 'success');
    }).catch(() => {
        showNotification('Failed to copy flag names', 'error');
    });
}

function openChromeComponents() {
    chrome.tabs.create({ url: 'chrome://components/' });
    showNotification('Chrome components page opened', 'success');
    setTimeout(showDownloadInstructions, 1000);
}

function showRestartInstructions() {
    showNotification('Please restart Chrome completely and return', 'warning', 5000);
    showModal('Restart Chrome', `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">🔄</div>
            <h3 style="margin-bottom: 16px; color: var(--text-primary);">Restart Chrome Browser</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">Please close Chrome completely and reopen it for changes to take effect.</p>
            <p style="color: var(--text-secondary); font-size: 14px;">Tip: Make sure to close all Chrome windows, then reopen Chrome and return to this setup page.</p>
        </div>
    `);
}

function launchSpectrumAI() {
    chrome.sidePanel.open({});
    showSetupComplete();
}

function openSpectrumAI() {
    chrome.sidePanel.open({});
}

function startUsingSpectrumAI() {
    hideSuccessCelebration();
    chrome.sidePanel.open({});
    setTimeout(() => {
        try { window.close(); } catch (e) {}
    }, 1000);
}

function viewDocumentation() {
    const docUrl = 'https://github.com/bobbanikhil/spectrum-ai-pro/blob/FINAL/README.md';
    chrome.tabs.create({ url: docUrl });
}

// ═══════════════════════════════════════════════════════════════════════════
// 💡 INSTRUCTION & GUIDANCE MODALS
// ═══════════════════════════════════════════════════════════════════════════

function showFlagInstructions() {
    showModal('Chrome Flags Instructions', `
        <div style="color: var(--text-secondary); line-height: 1.6;">
            <h4 style="color: var(--text-primary); margin-bottom: 16px;">🚩 Enable These Flags:</h4>
            <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; margin: 16px 0;">
                <strong style="color: var(--text-primary);">1. #prompt-api-for-gemini-nano</strong><br>
                Set to: <span style="color: #10b981; font-weight: 600;">Enabled</span>
            </div>
            <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; margin: 16px 0;">
                <strong style="color: var(--text-primary);">2. #optimization-guide-on-device-model</strong><br>
                Set to: <span style="color: #10b981; font-weight: 600;">Enabled</span>
            </div>
            <div style="background: var(--accent-light); padding: 16px; border-radius: 8px; border: 1px solid var(--accent); margin-top: 20px;">
                <strong style="color: var(--accent);">⚡ Important:</strong>
                <p style="margin: 8px 0 0;">Click "Relaunch" button in Chrome after enabling both flags.</p>
            </div>
        </div>
    `);
}

function showDownloadInstructions() {
    showModal('Model Download Instructions', `
        <div style="color: var(--text-secondary); line-height: 1.6;">
            <h4 style="color: var(--text-primary); margin-bottom: 16px;">📥 Download Steps:</h4>
            <ol style="padding-left: 20px;">
                <li style="margin-bottom: 12px;"><strong>Find "On-Device Model"</strong><br>Look for "Optimization Guide On-Device Model"</li>
                <li style="margin-bottom: 12px;"><strong>Click "Check for update"</strong><br>This will start downloading the Gemini Nano model.</li>
                <li style="margin-bottom: 12px;"><strong>Wait for download</strong><br>The model is ~600MB and may take a few minutes.</li>
                <li style="margin-bottom: 12px;"><strong>Restart Chrome</strong><br>Fully close and reopen Chrome after download completes.</li>
            </ol>
            <div style="background: var(--success-light); padding: 16px; border-radius: 8px; border: 1px solid var(--success); margin-top: 20px;">
                <strong style="color: var(--success);">💡 Tip:</strong>
                <p style="margin: 8px 0 0;">Return to this page after restarting to verify the setup.</p>
            </div>
        </div>
    `);
}

function showTroubleshooting() {
    document.getElementById('troubleshooting-modal').style.display = 'flex';
}

function hideTroubleshooting() {
    document.getElementById('troubleshooting-modal').style.display = 'none';
}

function showLaunchButton() {
    const launchBtn = document.getElementById('launch-spectrum-btn');
    const openBtn = document.getElementById('open-spectrum-ai-btn');
    if (launchBtn) {
        launchBtn.style.display = 'flex';
        launchBtn.style.animation = 'fadeIn 0.5s ease-out';
    }
    if (openBtn) {
        openBtn.style.display = 'flex';
        openBtn.style.animation = 'fadeIn 0.5s ease-out';
    }
}

function showSetupComplete() {
    document.getElementById('success-celebration').style.display = 'flex';
    createConfetti();
    SETUP_STATE.checkIntervals.forEach(clearInterval);
    SETUP_STATE.checkIntervals.clear();
}

function hideSuccessCelebration() {
    document.getElementById('success-celebration').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎉 VISUAL EFFECTS & NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'setup-notification';
    const colors = { success: 'var(--success)', error: 'var(--error)', warning: 'var(--warning)', info: 'var(--accent)' };
    notification.style.cssText = `
        position: fixed; top: 80px; right: 20px; z-index: 10000;
        background: ${colors[type] || colors.info}; color: white; padding: 16px 20px;
        border-radius: 12px; font-size: 14px; font-weight: 600;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2); backdrop-filter: blur(10px);
        animation: notificationSlide 0.3s ease-out; max-width: 300px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'notificationSlide 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, duration);
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `@keyframes notificationSlide { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
        document.head.appendChild(style);
    }
}

function showModal(title, content) {
    const existingModal = document.getElementById('setup-modal');
    if (existingModal) existingModal.remove();
    const modal = document.createElement('div');
    modal.id = 'setup-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); z-index: 10000; backdrop-filter: blur(5px);
        display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease;`;
    modal.innerHTML = `
        <div style="background: var(--bg-secondary); border-radius: 16px; padding: 32px; max-width: 500px; width: 90%; box-shadow: var(--shadow-xl); animation: slideInUp 0.3s ease-out;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 style="color: var(--text-primary); font-size: 20px; font-weight: 700;">${title}</h3>
                <button id="close-modal" style="background: none; border: none; color: var(--text-muted); font-size: 28px; cursor: pointer; line-height: 1; padding: 0;">×</button>
            </div>
            ${content}
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function createConfetti() {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
    const celebrationContainer = document.getElementById('success-celebration');
    if (!celebrationContainer) return;
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: absolute; top: -10px; left: ${Math.random() * 100}%;
                width: 10px; height: 10px; background: ${colors[Math.floor(Math.random() * colors.length)]};
                z-index: 9999; border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                animation: confettiFall ${2 + Math.random() * 3}s linear forwards;`;
            celebrationContainer.appendChild(confetti);
            setTimeout(() => confetti.remove(), 5000);
        }, i * 100);
    }
    if (!document.getElementById('confetti-styles')) {
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.textContent = `@keyframes confettiFall { to { transform: translateY(100vh) rotate(${360 + Math.random() * 360}deg); opacity: 0; } }`;
        document.head.appendChild(style);
    }
}

function showError(title, message) {
    const errorHtml = `
        <div style="text-align: center; color: var(--text-secondary);">
            <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
            <h3 style="color: #ef4444; margin-bottom: 16px;">${title}</h3>
            <p style="margin-bottom: 20px;">${message}</p>
            <button onclick="location.reload()" style="background: var(--error); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">🔄 Retry Setup</button>
        </div>
    `;
    showModal('Setup Error', errorHtml);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 CLEANUP & LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════

window.addEventListener('beforeunload', () => {
    SETUP_STATE.checkIntervals.forEach(clearInterval);
    if (SETUP_STATE.aiSession) {
        try { SETUP_STATE.aiSession.destroy(); } catch (e) {}
    }
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !SETUP_STATE.isSetupComplete) {
        setTimeout(runInitialChecks, 1000);
    }
});

window.addEventListener('focus', () => {
    if (!SETUP_STATE.isSetupComplete) {
        setTimeout(runInitialChecks, 1000);
    }
});