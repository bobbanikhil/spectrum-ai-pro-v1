/**
 * Spectrum AI v3.0 - Intelligent Setup System
 * Comprehensive Chrome AI detection and configuration
 * Production-ready for Chrome Built-in AI Challenge 2025
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
    console.log('🚀 Spectrum AI Setup v3.0 Initializing...');

    initializeSetup();
});

async function initializeSetup() {
    try {
        // Cache DOM elements
        cacheDOMElements();

        // Setup event listeners
        setupEventListeners();

        // Initialize progress tracking
        updateProgress();

        // Start comprehensive checks
        await runInitialChecks();

        // Setup periodic monitoring
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

    // Cache step elements
    DOM.setupSteps.set('chrome-version', document.getElementById('step-chrome-version'));
    DOM.setupSteps.set('chrome-flags', document.getElementById('step-chrome-flags'));
    DOM.setupSteps.set('model-download', document.getElementById('step-model-download'));
    DOM.setupSteps.set('final-setup', document.getElementById('step-final-setup'));

    // Cache status elements
    DOM.statusElements.set('chrome-version-text', document.getElementById('chrome-version-text'));
    DOM.statusElements.set('chrome-version-spinner', document.getElementById('chrome-version-spinner'));
    DOM.statusElements.set('model-status-text', document.getElementById('model-status-text'));
    DOM.statusElements.set('ai-integration-text', document.getElementById('ai-integration-text'));
    DOM.statusElements.set('ai-integration-spinner', document.getElementById('ai-integration-spinner'));
}

function setupEventListeners() {
    // Chrome Flags buttons
    document.getElementById('open-flags-btn')?.addEventListener('click', openChromeFlags);
    document.getElementById('copy-flags-btn')?.addEventListener('click', copyFlagNames);

    // Model download buttons
    document.getElementById('open-components-btn')?.addEventListener('click', openChromeComponents);
    document.getElementById('check-model-btn')?.addEventListener('click', checkModelStatus);

    // Final setup buttons
    document.getElementById('restart-chrome-btn')?.addEventListener('click', showRestartInstructions);
    document.getElementById('launch-spectrum-btn')?.addEventListener('click', launchSpectrumAI);

    // Additional action buttons
    document.getElementById('open-spectrum-ai-btn')?.addEventListener('click', openSpectrumAI);
    document.getElementById('view-documentation-btn')?.addEventListener('click', viewDocumentation);
    document.getElementById('troubleshooting-btn')?.addEventListener('click', showTroubleshooting);

    // Modal controls
    document.getElementById('close-troubleshooting')?.addEventListener('click', hideTroubleshooting);
    document.getElementById('start-using-btn')?.addEventListener('click', startUsingSpectrumAI);

    // Background click to close modals
    document.getElementById('troubleshooting-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'troubleshooting-modal') {
            hideTroubleshooting();
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔍 COMPREHENSIVE CHROME & AI DETECTION
// ═══════════════════════════════════════════════════════════════════════════

async function runInitialChecks() {
    console.log('🔍 Running comprehensive system checks...');

    // Step 1: Chrome version check
    await checkChromeVersion();

    // Step 2: Check Chrome flags
    await checkChromeFlags();

    // Step 3: Check AI model availability
    await checkAIModelAvailability();

    // Step 4: Test AI integration
    await testAIIntegration();

    // Update overall progress
    updateProgress();
    updateAIStatus();
}

async function checkChromeVersion() {
    try {
        console.log('🌐 Checking Chrome version...');

        const userAgent = navigator.userAgent;
        const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);

        if (!chromeMatch) {
            updateStatus('chrome-version-text', 'Not Chrome Browser', 'error');
            SETUP_STATE.requirements.chromeVersion = false;
            return;
        }

        const chromeVersion = chromeMatch[1];
        const majorVersion = parseInt(chromeVersion.split('.')[0]);

        const statusElement = DOM.statusElements.get('chrome-version-text');
        const spinnerElement = DOM.statusElements.get('chrome-version-spinner');

        if (statusElement && spinnerElement) {
            spinnerElement.style.display = 'none';
        }

        if (majorVersion >= 127) {
            updateStatus('chrome-version-text', `Chrome ${chromeVersion} ✅`, 'success');
            SETUP_STATE.requirements.chromeVersion = true;
            markStepComplete('chrome-version');
            console.log('✅ Chrome version check passed:', chromeVersion);
        } else {
            updateStatus('chrome-version-text', `Chrome ${chromeVersion} (Need 127+)`, 'error');
            SETUP_STATE.requirements.chromeVersion = false;
            console.log('❌ Chrome version too old:', chromeVersion);
        }

    } catch (error) {
        console.error('Chrome version check failed:', error);
        updateStatus('chrome-version-text', 'Check Failed', 'error');
        SETUP_STATE.requirements.chromeVersion = false;
    }
}

async function checkChromeFlags() {
    try {
        console.log('🚩 Checking Chrome flags...');

        // Check LanguageModel API availability
        const hasLanguageModel = typeof LanguageModel !== 'undefined';

        // Update flag status indicators
        const promptApiElement = document.querySelector('#prompt-api-flag .requirement-status');
        const modelFlagElement = document.querySelector('#model-flag .requirement-status');

        if (hasLanguageModel) {
            // Flags are likely enabled
            updateFlagStatus(promptApiElement, 'Enabled ✅', 'success');
            updateFlagStatus(modelFlagElement, 'Enabled ✅', 'success');

            SETUP_STATE.requirements.promptApiFlag = true;
            SETUP_STATE.requirements.modelFlag = true;

            console.log('✅ Chrome flags appear to be enabled');
        } else {
            // Flags are not enabled
            updateFlagStatus(promptApiElement, 'Not Enabled ❌', 'error');
            updateFlagStatus(modelFlagElement, 'Not Enabled ❌', 'error');

            SETUP_STATE.requirements.promptApiFlag = false;
            SETUP_STATE.requirements.modelFlag = false;

            console.log('❌ Chrome flags need to be enabled');
        }

    } catch (error) {
        console.error('Chrome flags check failed:', error);
    }
}

async function checkAIModelAvailability() {
    try {
        console.log('🤖 Checking AI model availability...');

        if (typeof LanguageModel === 'undefined') {
            updateStatus('model-status-text', 'Flags Not Enabled', 'error');
            SETUP_STATE.requirements.modelDownloaded = false;
            return;
        }

        const availability = await LanguageModel.availability();
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
                break;

            case 'after-download':
                updateStatus('model-status-text', 'Need Download ⏳', 'warning');
                SETUP_STATE.requirements.modelDownloaded = false;
                showDownloadInstructions();
                break;

            case 'no':
                updateStatus('model-status-text', 'Not Supported ❌', 'error');
                SETUP_STATE.requirements.modelDownloaded = false;
                break;

            default:
                updateStatus('model-status-text', `Unknown: ${availability}`, 'warning');
                SETUP_STATE.requirements.modelDownloaded = false;
        }

    } catch (error) {
        console.error('AI model availability check failed:', error);
        updateStatus('model-status-text', 'Check Failed ❌', 'error');
        SETUP_STATE.requirements.modelDownloaded = false;
    }
}

async function testAIIntegration() {
    try {
        console.log('⚡ Testing AI integration...');

        if (!SETUP_STATE.requirements.modelDownloaded) {
            updateStatus('ai-integration-text', 'Model Not Ready', 'warning');
            return;
        }

        // Try to create an AI session
        const session = await LanguageModel.create({
            expectedOutputs: [{ type: "text", languages: ["en"] }]
        });

        if (session) {
            SETUP_STATE.aiSession = session;

            // Test a simple prompt
            const testResponse = await session.prompt('Say "Hello from Spectrum AI" if you can understand this.');

            if (testResponse && testResponse.toLowerCase().includes('hello')) {
                updateStatus('ai-integration-text', 'Working Perfectly ✅', 'success');
                SETUP_STATE.requirements.aiIntegration = true;
                markStepComplete('final-setup');
                showLaunchButton();
                console.log('✅ AI integration test passed');
            } else {
                updateStatus('ai-integration-text', 'Response Issues ⚠️', 'warning');
                SETUP_STATE.requirements.aiIntegration = false;
            }
        }

    } catch (error) {
        console.error('AI integration test failed:', error);
        updateStatus('ai-integration-text', 'Integration Failed ❌', 'error');
        SETUP_STATE.requirements.aiIntegration = false;
    } finally {
        // Hide spinner
        const spinnerElement = DOM.statusElements.get('ai-integration-spinner');
        if (spinnerElement) {
            spinnerElement.style.display = 'none';
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 PROGRESS & STATUS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function updateProgress() {
    const completedCount = Object.values(SETUP_STATE.requirements).filter(Boolean).length;
    const totalRequirements = Object.keys(SETUP_STATE.requirements).length;
    const percentage = Math.round((completedCount / totalRequirements) * 100);

    // Update progress bar
    if (DOM.progressFill) {
        DOM.progressFill.style.width = `${percentage}%`;
    }

    if (DOM.progressText) {
        DOM.progressText.textContent = `${percentage}% Complete`;
    }

    // Check if setup is complete
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

    // Update parent requirement element
    const requirement = element.closest('.ai-requirement');
    if (requirement) {
        const statusIndicator = requirement.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${type}`;
            statusIndicator.textContent = getStatusIcon(type);
        }
    }
}

function updateFlagStatus(parentElement, text, type) {
    if (!parentElement) return;

    const statusText = parentElement.querySelector('.status-text');
    const statusIndicator = parentElement.querySelector('.status-indicator');

    if (statusText) statusText.textContent = text;
    if (statusIndicator) {
        statusIndicator.className = `status-indicator ${type}`;
        statusIndicator.textContent = getStatusIcon(type);
    }
}

function getStatusIcon(type) {
    const icons = {
        success: '✅ Complete',
        error: '❌ Failed',
        warning: '⚠️ Pending',
        pending: '⏳ Checking'
    };
    return icons[type] || '⏳ Pending';
}

function markStepComplete(stepId) {
    const stepElement = DOM.setupSteps.get(stepId);
    if (!stepElement) return;

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

async function updateAIStatus() {
    const statusDisplay = document.getElementById('ai-status-display');
    if (!statusDisplay) return;

    const requirements = [
        { name: 'Chrome Version 127+', status: SETUP_STATE.requirements.chromeVersion, icon: '🌐' },
        { name: 'Prompt API Flag', status: SETUP_STATE.requirements.promptApiFlag, icon: '🚩' },
        { name: 'On-Device Model Flag', status: SETUP_STATE.requirements.modelFlag, icon: '🔧' },
        { name: 'Gemini Nano Downloaded', status: SETUP_STATE.requirements.modelDownloaded, icon: '📥' },
        { name: 'AI Integration Working', status: SETUP_STATE.requirements.aiIntegration, icon: '⚡' }
    ];

    statusDisplay.innerHTML = requirements.map(req => {
        const statusClass = req.status ? 'complete' : 'pending';
        const statusIcon = req.status ? '✅' : '⏳';

        return `
            <div class="ai-requirement">
                <div class="requirement-info">
                    <span class="requirement-icon">${req.icon}</span>
                    <span class="requirement-text">${req.name}</span>
                </div>
                <div class="requirement-status">
                    <span class="status-text">${req.status ? 'Ready' : 'Pending'}</span>
                    <div class="status-indicator ${statusClass}">${statusIcon}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 PERIODIC MONITORING
// ═══════════════════════════════════════════════════════════════════════════

function setupPeriodicChecks() {
    // Check AI status every 10 seconds
    const aiCheckInterval = setInterval(async () => {
        if (!SETUP_STATE.requirements.aiIntegration) {
            await checkAIModelAvailability();
            await testAIIntegration();
            updateProgress();
            updateAIStatus();
        } else {
            clearInterval(aiCheckInterval);
        }
    }, 10000);

    SETUP_STATE.checkIntervals.set('aiCheck', aiCheckInterval);

    // Check Chrome flags every 5 seconds
    const flagsCheckInterval = setInterval(async () => {
        if (!SETUP_STATE.requirements.promptApiFlag || !SETUP_STATE.requirements.modelFlag) {
            await checkChromeFlags();
            updateProgress();
            updateAIStatus();
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
    updateAIStatus();

    showNotification('Model status refreshed', 'info');
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function openChromeFlags() {
    try {
        chrome.tabs.create({ url: 'chrome://flags/#prompt-api-for-gemini-nano' });
        showNotification('Chrome flags page opened', 'success');

        // Show additional instructions
        setTimeout(() => {
            showFlagInstructions();
        }, 1000);

    } catch (error) {
        console.error('Failed to open Chrome flags:', error);
        showNotification('Failed to open Chrome flags', 'error');
    }
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
    try {
        chrome.tabs.create({ url: 'chrome://components/' });
        showNotification('Chrome components page opened', 'success');

        // Show download instructions
        setTimeout(() => {
            showDownloadInstructions();
        }, 1000);

    } catch (error) {
        console.error('Failed to open Chrome components:', error);
        showNotification('Failed to open Chrome components', 'error');
    }
}

function showRestartInstructions() {
    showNotification('Please restart Chrome completely and return to this page', 'warning', 5000);

    // Show restart modal
    showModal('Restart Chrome', `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">🔄</div>
            <h3 style="margin-bottom: 16px; color: var(--text-primary);">Restart Chrome Browser</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                Please close Chrome completely and reopen it for changes to take effect.
            </p>
            <p style="color: var(--text-secondary); font-size: 14px;">
                💡 Tip: Make sure to close all Chrome windows, then reopen Chrome and return to this setup page.
            </p>
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

    // Close setup tab after short delay
    setTimeout(() => {
        window.close();
    }, 1000);
}

function viewDocumentation() {
    const docUrl = 'https://github.com/your-repo/spectrum-ai/wiki';
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
                Set to: <span style="color: #43e97b; font-weight: 600;">Enabled</span>
            </div>

            <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; margin: 16px 0;">
                <strong style="color: var(--text-primary);">2. #optimization-guide-on-device-model</strong><br>
                Set to: <span style="color: #43e97b; font-weight: 600;">Enabled</span>
            </div>

            <div style="background: rgba(102, 126, 234, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2); margin-top: 20px;">
                <strong style="color: #667eea;">⚡ Important:</strong>
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
                <li style="margin-bottom: 12px;">
                    <strong style="color: var(--text-primary);">Find "On-Device Model"</strong><br>
                    Look for this component in the Chrome components page
                </li>

                <li style="margin-bottom: 12px;">
                    <strong style="color: var(--text-primary);">Click "Check for update"</strong><br>
                    This will start downloading the Gemini Nano model
                </li>

                <li style="margin-bottom: 12px;">
                    <strong style="color: var(--text-primary);">Wait for download</strong><br>
                    Download may take 5-15 minutes depending on your connection
                </li>

                <li style="margin-bottom: 12px;">
                    <strong style="color: var(--text-primary);">Restart Chrome</strong><br>
                    Fully close and reopen Chrome after download completes
                </li>
            </ol>

            <div style="background: rgba(67, 233, 123, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(67, 233, 123, 0.2); margin-top: 20px;">
                <strong style="color: #43e97b;">💡 Tip:</strong>
                <p style="margin: 8px 0 0;">The model is about 22MB and will be downloaded to your device for offline use.</p>
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

    // Confetti effect
    createConfetti();

    // Clear all monitoring intervals
    SETUP_STATE.checkIntervals.forEach((interval) => {
        clearInterval(interval);
    });
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

    const colors = {
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
        info: 'var(--accent)'
    };

    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 10000;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        backdrop-filter: blur(10px);
        animation: notificationSlide 0.3s ease-out;
        max-width: 300px;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'notificationSlide 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, duration);

    // Add animation styles
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes notificationSlide {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

function showModal(title, content) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    modal.innerHTML = `
        <div style="
            background: var(--bg-secondary);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            backdrop-filter: var(--glass-backdrop);
            -webkit-backdrop-filter: var(--glass-backdrop);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 style="color: var(--text-primary); font-size: 20px; font-weight: 700;">${title}</h3>
                <button id="close-modal" style="background: none; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">×</button>
            </div>
            ${content}
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal functionality
    modal.querySelector('#close-modal').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function createConfetti() {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                top: -10px;
                left: ${Math.random() * 100}%;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                z-index: 9999;
                border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                animation: confettiFall ${2 + Math.random() * 3}s linear forwards;
            `;

            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 5000);
        }, i * 100);
    }

    // Add confetti animation styles
    if (!document.getElementById('confetti-styles')) {
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.textContent = `
            @keyframes confettiFall {
                to {
                    transform: translateY(100vh) rotate(360deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function showError(title, message) {
    const errorHtml = `
        <div style="text-align: center; color: var(--text-secondary);">
            <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
            <h3 style="color: #ef4444; margin-bottom: 16px;">${title}</h3>
            <p style="margin-bottom: 20px;">${message}</p>
            <button onclick="location.reload()" style="
                background: var(--error);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
            ">🔄 Retry Setup</button>
        </div>
    `;

    showModal('Setup Error', errorHtml);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 CLEANUP & LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════

window.addEventListener('beforeunload', () => {
    // Clean up intervals
    SETUP_STATE.checkIntervals.forEach((interval) => {
        clearInterval(interval);
    });

    // Clean up AI session
    if (SETUP_STATE.aiSession) {
        try {
            SETUP_STATE.aiSession.destroy();
        } catch (error) {
            console.log('AI session cleanup error (expected):', error);
        }
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !SETUP_STATE.isSetupComplete) {
        // Page became visible, re-run checks
        setTimeout(() => {
            runInitialChecks();
        }, 1000);
    }
});

// Handle window focus
window.addEventListener('focus', () => {
    if (!SETUP_STATE.isSetupComplete) {
        // Window gained focus, re-run checks
        setTimeout(() => {
            runInitialChecks();
        }, 1000);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 ADVANCED DETECTION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function detectChromeFeatureSupport() {
    const features = {
        sidePanel: 'sidePanel' in chrome,
        offscreen: 'offscreen' in chrome,
        languageModel: typeof LanguageModel !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        webGPU: 'gpu' in navigator
    };

    console.log('🔍 Chrome feature support:', features);
    return features;
}

async function benchmarkAIPerformance() {
    if (!SETUP_STATE.aiSession) return null;

    try {
        const startTime = performance.now();
        await SETUP_STATE.aiSession.prompt('Generate a short sentence about AI.');
        const endTime = performance.now();

        const responseTime = endTime - startTime;
        console.log(`⚡ AI response time: ${responseTime.toFixed(2)}ms`);

        return {
            responseTime,
            performanceGrade: responseTime < 1000 ? 'Excellent' :
                             responseTime < 3000 ? 'Good' :
                             responseTime < 5000 ? 'Fair' : 'Slow'
        };
    } catch (error) {
        console.error('AI performance benchmark failed:', error);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎉 SETUP SYSTEM READY
// ═══════════════════════════════════════════════════════════════════════════

console.log('✅ Spectrum AI Setup System v3.0 Loaded');
console.log('🚀 Features: Intelligent Detection, Real-time Monitoring, Guided Setup');
console.log('⚡ Ready for Chrome Built-in AI Challenge 2025');

// Export for testing (development only)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SETUP_STATE,
        checkChromeVersion,
        checkAIModelAvailability,
        testAIIntegration,
        detectChromeFeatureSupport,
        benchmarkAIPerformance
    };
}

// Auto-start setup check after DOM load
setTimeout(() => {
    if (document.readyState === 'complete' && !SETUP_STATE.isSetupComplete) {
        runInitialChecks();
    }
}, 1000);