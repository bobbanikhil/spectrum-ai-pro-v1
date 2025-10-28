// ============================================
// QUICK PATCHES FOR EXISTING MODULES
// Add these at the top of the respective files
// ============================================

// ===== FOR sidepanel-organizer.js =====
// Add this helper function at the very top, after initializeOrganizer():
// Add at start of any function that uses AI
if (!aiManager || aiManager.isAvailable === 'no') {
  throw new Error('AI is not available. Please enable Chrome AI flags.');
}

// Before calling prompt:
await aiManager.createSession(); // Ensure session exists
async function ensureAISession() {
  if (!aiManager) {
    throw new Error('AI Manager not initialized');
  }

  if (aiManager.isAvailable === 'no') {
    throw new Error('AI is not available. Please enable Chrome AI flags and restart Chrome.');
  }

  // Create session if it doesn't exist
  await aiManager.createSession();
}

// THEN UPDATE these functions to use it:

// REPLACE the organizeTabs function start:
async function organizeTabs() {
  try {
    showStatus('organizerStatus', 'Analyzing tabs...', true);
    document.getElementById('organizeTabsButton').disabled = true;

    // ADD THIS LINE:
    await ensureAISession();

    // Get all tabs
    const tabs = await chrome.tabs.query({ currentWindow: true });
    // ... rest of function stays the same
  }
}

// REPLACE each contextual action function start (summarizeGroup, extractGroupData, etc.):
async function summarizeGroup(group) {
  await ensureAISession(); // ADD THIS LINE

  // Get content from all tabs in group
  const contents = [];
  // ... rest stays the same
}

async function extractGroupData(group) {
  await ensureAISession(); // ADD THIS LINE
  // ... rest stays the same
}

async function findGroupContacts(group) {
  await ensureAISession(); // ADD THIS LINE
  // ... rest stays the same
}

async function analyzeGroupContent(group) {
  await ensureAISession(); // ADD THIS LINE
  // ... rest stays the same
}

async function compareGroup(group) {
  await ensureAISession(); // ADD THIS LINE
  // ... rest stays the same
}

async function predictGroupTrends(group) {
  await ensureAISession(); // ADD THIS LINE
  // ... rest stays the same
}

// ===== FOR sidepanel-scribe.js =====
// Add the same helper at the top:

async function ensureAISession() {
  if (!aiManager) {
    throw new Error('AI Manager not initialized');
  }

  if (aiManager.isAvailable === 'no') {
    throw new Error('AI is not available. Please enable Chrome AI flags and restart Chrome.');
  }

  await aiManager.createSession();
}

// UPDATE startScribeRecording function:
async function startScribeRecording() {
  const startButton = document.getElementById('startScribeButton');
  const stopButton = document.getElementById('stopScribeButton');
  const clearButton = document.getElementById('clearScribeButton');

  try {
    if (AppState.scribeRecording) return;
    AppState.scribeRecording = true;
    AppState.scribeSteps = [];
    scribe_lastScreenshotTime = 0;

    if (startButton) startButton.disabled = true;
    if (stopButton) {
      stopButton.disabled = false;
      stopButton.style.display = 'inline-block';
    }
    if (clearButton) clearButton.disabled = true;

    showStatus('scribeStatus', '🔴 Recording... Click elements on web pages.', true);

    const resultsDiv = document.getElementById('scribeResults');
    if (resultsDiv) resultsDiv.innerHTML = '<p class="placeholder">Recording interactions...</p>';

    const actionResultsDiv = document.getElementById('scribeActionResults');
    if (actionResultsDiv) actionResultsDiv.innerHTML = '';

    const actionsPanel = document.getElementById('scribeActionsPanel');
    if (actionsPanel) actionsPanel.style.display = 'none';

    // ADD THIS CHECK:
    await ensureAISession();

    const tab = await getCurrentTab();
    if (!tab || !tab.id || tab.url?.startsWith('chrome://') ||
        tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('about:')) {
      throw new Error('Cannot start recording on this type of page.');
    }

    await injectScribeContentScript(tab.id);
    showSuccess('Recording started! Interact with web pages to capture steps.');

  } catch (error) {
    console.error('Start Scribe recording error:', error);
    showError(`Failed to start recording: ${error.message}`, 'error');
    // ... rest of error handling stays the same
  }
}

// UPDATE generateStepInstruction function:
async function generateStepInstruction(clickData, stepNumber) {
  await ensureAISession(); // ADD THIS LINE AT THE VERY TOP

  let elementDescription = clickData.tagName?.toLowerCase() || 'element';
  // ... rest stays the same
}

// UPDATE generateWorkflowGuide function:
async function generateWorkflowGuide() {
  if (!AppState.scribeSteps || AppState.scribeSteps.length === 0 || AppState.scribeRecording) {
    displayScribeSteps();
    return;
  }

  // ADD THESE CHECKS:
  if (!aiManager || aiManager.isAvailable !== 'readily') {
    console.warn("AI not ready, skipping title/summary generation.");
    displayScribeSteps();
    return;
  }

  showStatus('scribeStatus', 'Generating title & summary...', true);
  // ... rest stays the same
}

// UPDATE generalizeWorkflow function:
async function generalizeWorkflow() {
  if (!AppState.scribeSteps || AppState.scribeSteps.length === 0) {
    return showError("No steps recorded to generalize.", "warning");
  }

  const actionButton = document.getElementById('generalizeWorkflowButton');
  const resultsDiv = document.getElementById('scribeActionResults');
  if (!resultsDiv || !actionButton) return;

  actionButton.disabled = true;
  resultsDiv.innerHTML = '<div class="loader"></div><p style="text-align: center;">Generalizing...</p>';

  // ADD THESE CHECKS:
  try {
    await ensureAISession();
  } catch (error) {
    resultsDiv.innerHTML = `<p class="placeholder error">${error.message}</p>`;
    showError(error.message, "warning");
    actionButton.disabled = false;
    return;
  }

  try {
    const prompt = `Take the following specific workflow steps...`;
    // ... rest stays the same
  }
}

// UPDATE analyzeWorkflow function:
async function analyzeWorkflow() {
  if (!AppState.scribeSteps || AppState.scribeSteps.length === 0) {
    return showError("No steps recorded to analyze.", "warning");
  }

  const actionButton = document.getElementById('analyzeWorkflowButton');
  const resultsDiv = document.getElementById('scribeActionResults');
  if (!resultsDiv || !actionButton) return;

  actionButton.disabled = true;
  resultsDiv.innerHTML = '<div class="loader"></div><p style="text-align: center;">Analyzing...</p>';

  // ADD THESE CHECKS:
  try {
    await ensureAISession();
  } catch (error) {
    resultsDiv.innerHTML = `<p class="placeholder error">${error.message}</p>`;
    showError(error.message, "warning");
    actionButton.disabled = false;
    return;
  }

  try {
    const prompt = `Analyze the following recorded workflow...`;
    // ... rest stays the same
  }
}

// ===== SUMMARY OF CHANGES =====
/*
1. Add ensureAISession() helper function to both files
2. Call await ensureAISession() at the start of every AI-using function
3. Wrap in try-catch and show user-friendly errors
4. This ensures AI session exists before any prompt() calls

FUNCTIONS TO UPDATE IN sidepanel-organizer.js:
- organizeTabs()
- summarizeGroup()
- extractGroupData()
- findGroupContacts()
- analyzeGroupContent()
- compareGroup()
- predictGroupTrends()
- generateTabGroups() (add check at start)

FUNCTIONS TO UPDATE IN sidepanel-scribe.js:
- startScribeRecording()
- generateStepInstruction()
- generateWorkflowGuide()
- generalizeWorkflow()
- analyzeWorkflow()
*/