// ============================================
// SPECTRUM AI PRO ENHANCED v3.2.1
// Scribe Module - Workflow Documentation
// ============================================

// Global variables specific to Scribe, prefixed for clarity
let scribe_lastScreenshotTime = 0;
const SCRIBE_SCREENSHOT_DEBOUNCE = 1000; // 1 second debounce for screenshots

function initializeScribe() {
  document.getElementById('startScribeButton')?.addEventListener('click', startScribeRecording);
  document.getElementById('stopScribeButton')?.addEventListener('click', stopScribeRecording);
  document.getElementById('clearScribeButton')?.addEventListener('click', clearScribeSteps);

  // AI Action Buttons - Using data attributes for delegation
  document.getElementById('generalizeWorkflowButton')?.setAttribute('data-action', 'generalize');
  document.getElementById('analyzeWorkflowButton')?.setAttribute('data-action', 'analyze');

  const scribeActionsPanel = document.getElementById('scribeActionsPanel');
  if (scribeActionsPanel) {
      scribeActionsPanel.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON' && e.target.dataset.action) {
              const action = e.target.dataset.action;
              if (action === 'generalize') generalizeWorkflow();
              else if (action === 'analyze') analyzeWorkflow();
          }
      });
  }

  // Export Buttons
  document.getElementById('exportScribeTxtButton')?.addEventListener('click', () => exportScribe('txt'));
  document.getElementById('exportScribeJsonButton')?.addEventListener('click', () => exportScribe('json'));
  document.getElementById('exportScribePdfButton')?.addEventListener('click', () => exportScribe('pdf'));

  // Message listener is handled centrally in handleRuntimeMessage (CORE module)
}

// Start recording user interactions
async function startScribeRecording() {
  const startButton = document.getElementById('startScribeButton');
  const stopButton = document.getElementById('stopScribeButton');
  const clearButton = document.getElementById('clearScribeButton');

  try {
    if (AppState.scribeRecording) return; // Prevent double-start
    AppState.scribeRecording = true;
    AppState.scribeSteps = []; // Clear previous steps
    scribe_lastScreenshotTime = 0; // Reset debounce timer

    // --- Update UI ---
    if (startButton) startButton.disabled = true;
    if (stopButton) { stopButton.disabled = false; stopButton.style.display = 'inline-block'; }
    if (clearButton) clearButton.disabled = true;
    showStatus('scribeStatus', '🔴 Recording... Click elements on web pages.', true);

    // Clear results areas
    const resultsDiv = document.getElementById('scribeResults');
    if (resultsDiv) resultsDiv.innerHTML = '<p class="placeholder">Recording interactions...</p>';
    const actionResultsDiv = document.getElementById('scribeActionResults');
    if (actionResultsDiv) actionResultsDiv.innerHTML = '';
    const actionsPanel = document.getElementById('scribeActionsPanel');
    if (actionsPanel) actionsPanel.style.display = 'none';
    // --- End UI Update ---

    // --- AI Check ---
    if (!AppState.settings?.aiEnabled) {
        throw new Error("AI features are disabled in settings (needed for instructions).");
    }
    if (!aiManager) {
        throw new Error("AI Manager not initialized.");
    }
    // FIX: Attempt to create session, handles download/errors
    await aiManager.createSession(); // Throws if unavailable after trying
    // --- End AI Check ---

    // --- Get Tab and Inject Script ---
    const tab = await getCurrentTab(); // Utility from core/utils
    if (!tab || !tab.id || tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('about:')) {
      throw new Error('Cannot start recording on this type of page (e.g., Chrome settings, other extensions).');
    }
    await injectScribeContentScript(tab.id); // Inject CSS and JS
    // --- End Inject Script ---

    showSuccess('Recording started! Interact with web pages to capture steps.');

  } catch (error) {
    console.error('Start Scribe recording error:', error);
    showError(`Failed to start recording: ${error.message}`, 'error');
    // Reset state on failure
    AppState.scribeRecording = false;
    if (startButton) startButton.disabled = false;
    if (stopButton) { stopButton.disabled = true; stopButton.style.display = 'none'; }
    if (clearButton) clearButton.disabled = AppState.scribeSteps.length === 0; // Re-enable clear if steps existed
    showStatus('scribeStatus', '', false);
  }
}

// Stop recording and process steps
async function stopScribeRecording() {
  if (!AppState.scribeRecording) return; // Prevent double-stop

  const startButton = document.getElementById('startScribeButton');
  const stopButton = document.getElementById('stopScribeButton');
  const clearButton = document.getElementById('clearScribeButton');

  try {
    AppState.scribeRecording = false; // Set state immediately

    // --- Update UI ---
    if (startButton) startButton.disabled = false;
    if (stopButton) { stopButton.disabled = true; stopButton.style.display = 'none'; }
    if (clearButton) clearButton.disabled = (AppState.scribeSteps.length === 0);
    showStatus('scribeStatus', 'Processing recorded steps...', true);
    // --- End UI Update ---

    // --- Stop Content Script ---
    // Try to find any active tab where the content script might be running
     const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
     if (tabs.length > 0 && tabs[0].id) {
        try {
            await chrome.tabs.sendMessage(tabs[0].id, { type: 'stop-scribe-recording' });
            console.log("Sent stop message to content script in active tab.");
        } catch(err) {
            // Content script might not be injected or tab changed - this is often expected
            if (!err.message?.includes("Receiving end does not exist")) {
                 console.warn("Could not send stop message to Scribe content script:", err.message);
            }
        }
    }
    // --- End Stop Content Script ---

    if (AppState.scribeSteps.length === 0) {
        showError("No interactions were recorded during this session.", "warning");
        displayScribeSteps(); // Show "No steps" message in results
        showStatus('scribeStatus', '', false);
        return;
    }

    // --- Generate Guide Title/Summary with AI (if AI is ready) ---
    if (AppState.settings?.aiEnabled && aiManager && aiManager.isAvailable === 'readily') {
        await generateWorkflowGuide(); // Generates title/summary and updates display
    } else {
        console.warn("AI not ready or disabled, skipping title/summary generation.");
        displayScribeSteps(); // Update display without title/summary
    }
    // --- End Generate Guide ---

    showStatus('scribeStatus', '', false); // Hide status
    // Show action buttons now that recording stopped and steps exist
    const actionsPanel = document.getElementById('scribeActionsPanel');
    if (actionsPanel) actionsPanel.style.display = 'block';
    showSuccess(`Recording stopped. Captured ${AppState.scribeSteps.length} steps.`);

  } catch (error) {
    console.error('Stop Scribe recording error:', error);
    showError(`Failed to stop recording or generate guide: ${error.message}`, 'error');
    showStatus('scribeStatus', '', false); // Ensure status is hidden on error
    // Ensure UI is reset even on error
    if (startButton) startButton.disabled = false;
    if (stopButton) { stopButton.disabled = true; stopButton.style.display = 'none'; }
    displayScribeSteps(); // Update display (might show error or existing steps)
  }
}

// Injects the content script and CSS into the target tab
async function injectScribeContentScript(tabId) {
  try {
    // Check if script is already injected in this tab context using a flag
    const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => window.hasOwnProperty('__SPECTRUM_SCRIBE_INJECTED__'),
    }).catch(err => {
        // Handle cases where scripting on the page is disallowed (e.g., chrome web store)
        console.warn(`Could not check for existing script in tab ${tabId}: ${err.message}. Assuming not injected.`);
        // Return a structure mimicking a failed check
        return [{result: false}];
    });

    // Inject only if the flag is not set (or check failed)
    if (!results || !results[0] || !results[0].result) {
        console.log(`Injecting Scribe scripts into tab ${tabId}`);
        // Inject CSS first (less likely to fail)
        await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['Content Scripts/scribe.css'] // Path relative to extension root (from manifest)
        });
        // Inject JavaScript
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['Content Scripts/scribe-content.js'] // Path relative to extension root
            // world: 'MAIN' // Consider MAIN world if interaction with page scripts is needed, but ISOLATED is safer
        });
        console.log(`Scribe scripts injected successfully into tab ${tabId}.`);
    } else {
         console.log(`Scribe content script already present in tab ${tabId}. Attempting to ensure listener is active.`);
         // Optionally, send a message to the existing script to ensure it's listening
         try {
             await chrome.tabs.sendMessage(tabId, { type: 'ensure-scribe-active' });
         } catch(err) {
             console.warn("Could not ping existing content script, might be inactive:", err.message);
         }
    }
  } catch (error) {
    console.error(`Content script injection error in tab ${tabId}:`, error);
    // Provide more user-friendly error messages for common cases
    if (error.message.includes("Cannot access contents of url")) {
       const hostname = getHostname(error.message.split('"')[1] || 'this page'); // Extract URL if possible
       throw new Error(`Cannot record on ${hostname}. It might be a restricted page (like chrome:// or the Web Store).`);
    } else if (error.message.includes("No target specified")) {
         throw new Error(`Target tab (ID: ${tabId}) not found or closed.`);
    }
    throw new Error(`Failed to inject recorder script: ${error.message}. Try refreshing the page.`);
  }
}

// Re-injects content script if needed after navigation
async function reinjectScribeContentScript(tabId) {
  if (!AppState.scribeRecording) return; // Only reinject if currently recording

  try {
    console.log(`Tab ${tabId} updated, attempting Scribe script reinjection...`);
    // Wait a short time for the page to potentially finish loading basic structure
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get tab info again to ensure it's still a valid target (e.g., not chrome://)
    const currentTab = await chrome.tabs.get(tabId).catch(() => null);
    if (currentTab && currentTab.url && (currentTab.url.startsWith('http:') || currentTab.url.startsWith('https:'))) {
        await injectScribeContentScript(tabId); // Attempt injection (will check if already present)
    } else {
        console.log(`Skipping reinjection into inaccessible or non-http(s) tab ${tabId} (URL: ${currentTab?.url || 'unknown'})`);
    }
  } catch (error) {
    // Log error but don't stop the overall recording
    console.warn(`Scribe re-injection failed for tab ${tabId}:`, error.message);
    // Optionally show a non-critical error to the user via toast
    // showError("Recorder might miss steps on navigated page due to injection issue.", "warning");
  }
}

// Handles the captured click data received from the content script (via service worker)
async function handleClickCapture(clickData, tabId) {
  if (!AppState.scribeRecording) {
      console.log("Scribe: Ignoring click capture, recording is stopped.");
      return;
  }

  try {
    const stepNumber = AppState.scribeSteps.length + 1;
    showStatus('scribeStatus', `🔴 Recording... Capturing Step ${stepNumber}`, true); // Update status

    // --- Screenshot Logic ---
    let screenshotDataUrl = null;
    const now = Date.now();
    if (now - scribe_lastScreenshotTime > SCRIBE_SCREENSHOT_DEBOUNCE) {
      try {
        // Ensure the tabId is valid before capturing
        const tabExists = await chrome.tabs.get(tabId).catch(() => null);
        if (tabExists) {
            screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, { // Capture current tab
              format: 'jpeg',
              quality: Math.round((AppState.settings?.screenshotQuality || 0.7) * 100) // Use setting
            });
            scribe_lastScreenshotTime = now;
            console.log(`Screenshot captured for step ${stepNumber}`);
        } else {
             console.warn(`Tab ${tabId} not found for screenshot capture.`);
        }
      } catch (screenshotError) {
           console.warn(`Screenshot capture failed for step ${stepNumber}: ${screenshotError.message}`);
           // Don't stop the step, just log the warning
      }
    } else {
        console.log(`Screenshot skipped for step ${stepNumber} (debounced).`);
    }
    // --- End Screenshot Logic ---

    // --- Generate Instruction using AI ---
    let instruction = "Click interaction recorded."; // Default fallback
    if (AppState.settings?.aiEnabled && aiManager && aiManager.isAvailable === 'readily') {
         // No need to check createSession here, assume startScribeRecording ensured readiness
        instruction = await generateStepInstruction(clickData, stepNumber);
    } else {
        console.warn("AI instruction generation skipped (AI disabled or not ready).");
        // Generate a basic instruction without AI
        let fallback = `Click the ${clickData.tagName.toLowerCase()}`;
        if (clickData.text) fallback += ` containing "${clickData.text.substring(0, 30)}"`;
        else if (clickData.ariaLabel) fallback += ` labeled "${clickData.ariaLabel}"`;
        instruction = fallback + '.';
    }
    // --- End Instruction Generation ---

    // --- Store Step Data ---
    const step = {
      number: stepNumber,
      timestamp: clickData.timestamp || new Date().toISOString(), // Use precise timestamp if available
      action: 'click',
      element: clickData, // Contains tagName, id, text, ariaLabel, etc.
      instruction: instruction,
      screenshot: screenshotDataUrl, // Store Data URL
      url: clickData.url
    };
    AppState.scribeSteps.push(step);
    // --- End Store Step ---

    displayScribeSteps(); // Refresh the UI to show the new step

  } catch (error) {
    console.error('Error handling captured click:', error);
    showError(`Error capturing step ${AppState.scribeSteps.length + 1}: ${error.message}`, 'error');
    // Continue recording if possible
  } finally {
      // Keep showing recording status unless explicitly stopped
      if(AppState.scribeRecording) {
          showStatus('scribeStatus', `🔴 Recording... Step ${AppState.scribeSteps.length + 1}`, true);
      }
  }
}

// Generates a concise instruction for a recorded step using AI
async function generateStepInstruction(clickData, stepNumber) {
  // Create a more descriptive representation of the clicked element for the prompt
  let elementDescription = clickData.tagName?.toLowerCase() || 'element';
  if (clickData.type && ['button', 'submit', 'checkbox', 'radio', 'text', 'email', 'password', 'search', 'tel', 'url'].includes(clickData.type)) {
      elementDescription = clickData.type + (clickData.tagName?.toLowerCase() === 'input' ? ' input' : '');
  } else if (clickData.role) {
       elementDescription = clickData.role; // Use ARIA role if available
  }
  if (clickData.id) elementDescription += ` (ID: "${clickData.id}")`;
  // else if (clickData.className) elementDescription += ` (Class: "${clickData.className.split(' ')[0]}")`; // Class can be noisy

  // Prioritize meaningful text/labels
  let textContent = '';
  if (clickData.ariaLabel) textContent = ` labeled "${clickData.ariaLabel}"`;
  else if (clickData.text && clickData.text.length > 1 && clickData.text.length < 50) textContent = ` containing text "${clickData.text}"`; // Use short, meaningful text
  else if (clickData.placeholder) textContent = ` with placeholder "${clickData.placeholder}"`;
  else if (clickData.name) textContent = ` named "${clickData.name}"`;


  const prompt = `Generate a concise, user-friendly, imperative instruction (starting with an action verb like Click, Select, Enter) for this browser interaction:

Interaction: Clicked a ${elementDescription}${textContent}.
Page Context: ${getHostname(clickData.url)}
Step Number: ${stepNumber}

Examples:
- Click the 'Login' button.
- Select the 'Account Settings' option.
- Enter username in the username field.
- Click the product image.
- Check the 'Remember me' box.

Generate ONLY the single instruction sentence:`;

  try {
    const response = await aiManager.prompt(prompt);
    // Basic cleanup: Remove potential "Instruction:" prefix, trim, ensure punctuation.
    let instruction = response.replace(/^Instruction:\s*/i, '').trim();
    if (instruction && !/[\.\?!]$/.test(instruction)) {
        instruction += '.'; // Add period if missing
    }
    // Fallback if AI gives empty/bad response
    return instruction || `Click the ${elementDescription}${textContent}.`;
  } catch (error) {
    console.error('AI Instruction generation error:', error);
    // Construct a reasonable fallback instruction
    let fallback = `Click the ${elementDescription}`;
     if (textContent) fallback += textContent; // Use the derived textContent
    return fallback + '.';
  }
}

// Displays the recorded steps in the UI
function displayScribeSteps() {
  const resultsDiv = document.getElementById('scribeResults');
  if (!resultsDiv) return;

  const stepsExist = AppState.scribeSteps && AppState.scribeSteps.length > 0;

  // Determine button/panel states based on recording status and steps existence
  const enableActions = !AppState.scribeRecording && stepsExist;

  if (!stepsExist) {
    // Show placeholder message based on recording state
    resultsDiv.innerHTML = `<p class="placeholder" style="padding-top: 20px;">${AppState.scribeRecording ? 'Recording interactions... Click elements on the page.' : 'No steps recorded yet. Click "Start Recording" to begin.'}</p>`;
  } else {
    // Generate HTML for each step
    const stepsHtml = AppState.scribeSteps.map(step => `
      <div class="scribe-step">
        <div class="scribe-step-header">
          <span class="scribe-step-number">${step.number}</span>
          <strong class="step-instruction">${escapeHtml(step.instruction)}</strong>
        </div>
        ${step.screenshot ? `
          <div class="scribe-step-screenshot">
            <img src="${step.screenshot}" alt="Step ${step.number} screenshot" loading="lazy" title="Click to view full size (if applicable)">
          </div>` : ''}
        <div class="scribe-step-details">
          <small>URL: ${escapeHtml(getHostname(step.url))}</small>
          <small>Element: &lt;${step.element.tagName.toLowerCase()}${step.element.id ? `#${escapeHtml(step.element.id)}` : ''}&gt;</small>
          ${step.element.text ? `<small>Text: "${escapeHtml(step.element.text.substring(0, 50))}"</small>` : ''}
           ${step.element.ariaLabel ? `<small>Label: "${escapeHtml(step.element.ariaLabel.substring(0, 50))}"</small>` : ''}
        </div>
      </div>
    `).join('');

    // Preserve header if it exists, otherwise create placeholder title
    const existingHeaderHtml = resultsDiv.querySelector('.workflow-header')?.outerHTML || '';
    const guideTitleHtml = !existingHeaderHtml ? '<h3 class="section-title" style="margin-bottom: 10px;">Recorded Workflow Steps</h3>' : '';

    resultsDiv.innerHTML = `
      ${existingHeaderHtml}
      <div class="workflow-guide">
        ${guideTitleHtml}
        <div class="steps-list">${stepsHtml}</div>
      </div>
    `;
  }

  // Update button states
  document.getElementById('generalizeWorkflowButton').disabled = !enableActions;
  document.getElementById('analyzeWorkflowButton').disabled = !enableActions;
  document.getElementById('exportScribeTxtButton').disabled = !enableActions;
  document.getElementById('exportScribeJsonButton').disabled = !enableActions;
  document.getElementById('exportScribePdfButton').disabled = !enableActions;
  // Clear button is enabled if steps exist AND not currently recording
  document.getElementById('clearScribeButton').disabled = !stepsExist || AppState.scribeRecording;

  // Show/hide action panel based on whether actions are enabled
  const actionsPanel = document.getElementById('scribeActionsPanel');
  if (actionsPanel) actionsPanel.style.display = enableActions ? 'block' : 'none';

   // Show chat container if actions are enabled (meaning recording stopped and steps exist)
   const chatContainer = document.getElementById('scribeChatContainer');
   if (chatContainer) chatContainer.style.display = enableActions ? 'flex' : 'none';
}

// Generates a title and summary for the workflow using AI
async function generateWorkflowGuide() {
  // Guard clauses
  if (!AppState.scribeSteps || AppState.scribeSteps.length === 0 || AppState.scribeRecording) {
      displayScribeSteps(); // Just update display if no steps or still recording
      return;
  }
  // FIX: Check AI readiness before proceeding
  if (!AppState.settings?.aiEnabled || !aiManager || aiManager.isAvailable !== 'readily') {
      console.warn("AI not ready or disabled, skipping title/summary generation.");
      displayScribeSteps(); // Update display without new header
      return; // Don't show error, just proceed without this feature
  }

  showStatus('scribeStatus', 'Generating title & summary...', true); // Show status during AI call

  const prompt = `Based on the following recorded workflow steps, generate a concise descriptive title (max 10 words) and a brief summary (1-3 sentences) explaining the overall task performed.

Workflow Steps:
${AppState.scribeSteps.map(s => `${s.number}. ${escapeHtml(s.instruction)}`).join('\n')}

Respond ONLY in this exact format, with no extra explanation:
Title: [Generated Title Here]
Summary: [Generated Summary Here]`;

  try {
    const response = await aiManager.prompt(prompt); // Assumes AI is ready

    // More robust parsing for Title and Summary
    const titleMatch = response.match(/^Title:\s*(.*)$/im);
    const summaryMatch = response.match(/^Summary:\s*(.*)$/im);
    const title = titleMatch ? titleMatch[1].trim() : `Workflow (${AppState.scribeSteps.length} Steps)`;
    const summary = summaryMatch ? summaryMatch[1].trim() : `A recorded workflow consisting of ${AppState.scribeSteps.length} steps, captured on ${new Date().toLocaleDateString()}.`;

    // Update the UI with the generated header
    const resultsDiv = document.getElementById('scribeResults');
    if (resultsDiv) {
      // Remove old header if exists
      const oldHeader = resultsDiv.querySelector('.workflow-header');
      if (oldHeader) oldHeader.remove();
      // Create and prepend new header
      const header = document.createElement('div');
      header.className = 'workflow-header panel-section'; // Use panel-section for styling consistency
      header.innerHTML = `<h3 class="section-title">${escapeHtml(title)}</h3><p style="color: var(--text-secondary); font-size: 13px;">${escapeHtml(summary)}</p>`;
      // Prepend header before the steps list
      resultsDiv.insertBefore(header, resultsDiv.firstChild);
    }
     displayScribeSteps(); // Refresh display including the new header and button states

  } catch (error) {
    console.error('Error generating workflow title/summary:', error);
    showError('Could not generate AI title/summary for the workflow.', 'warning');
    displayScribeSteps(); // Refresh display even on error
  } finally {
      showStatus('scribeStatus', '', false); // Hide status
  }
}

// Generalizes the workflow using AI
async function generalizeWorkflow() {
  if (!AppState.scribeSteps || AppState.scribeSteps.length === 0) return showError("No steps recorded to generalize.", "warning");

  const actionButton = document.getElementById('generalizeWorkflowButton');
  const resultsDiv = document.getElementById('scribeActionResults');
  if (!resultsDiv || !actionButton) return;

  actionButton.disabled = true;
  resultsDiv.innerHTML = '<div class="loader"></div><p style="text-align: center; color: var(--text-secondary);">Generalizing workflow with AI...</p>';

  // FIX: Check AI readiness
  if (!AppState.settings?.aiEnabled || !aiManager || aiManager.isAvailable !== 'readily') {
      resultsDiv.innerHTML = `<p class="placeholder error" style="padding: 20px;">AI features unavailable. Cannot generalize workflow.</p>`;
      showError("AI features unavailable. Cannot generalize workflow.", "warning");
      actionButton.disabled = false;
      return;
  }

  try {
    const prompt = `Take the following specific workflow steps and generalize them into a reusable template. Replace specific user inputs (like names, emails, search terms), data values, or item names (like specific product titles) with clear placeholders in square brackets, e.g., [USERNAME], [EMAIL_ADDRESS], [PRODUCT_NAME], [SEARCH_QUERY]. Keep the core actions and element identifiers (like 'Login button', 'email field').

Specific Steps:
${AppState.scribeSteps.map(s => `${s.number}. ${escapeHtml(s.instruction)}`).join('\n')}

Provide ONLY the generalized steps as a numbered list in Markdown format.`;

    const result = await aiManager.prompt(prompt); // Assumes AI is ready
    resultsDiv.innerHTML = `
      <div class="action-result panel-section">
        <h4 class="section-title">🔄 Generalized Workflow Template</h4>
        <div class="result-content">${formatActionResult(result)}</div>
      </div>`;
    showSuccess('Workflow generalized successfully!');

  } catch (error) {
    console.error('Generalize workflow error:', error);
    resultsDiv.innerHTML = `<p class="placeholder error" style="padding: 20px;">Failed to generalize workflow: ${error.message}</p>`;
    showError(`Failed to generalize workflow: ${error.message}`, 'error');
  } finally {
      actionButton.disabled = false; // Re-enable button
  }
}

// Analyzes the workflow for improvements using AI
async function analyzeWorkflow() {
   if (!AppState.scribeSteps || AppState.scribeSteps.length === 0) return showError("No steps recorded to analyze.", "warning");

   const actionButton = document.getElementById('analyzeWorkflowButton');
   const resultsDiv = document.getElementById('scribeActionResults');
   if (!resultsDiv || !actionButton) return;

   actionButton.disabled = true;
   resultsDiv.innerHTML = '<div class="loader"></div><p style="text-align: center; color: var(--text-secondary);">Analyzing workflow with AI...</p>';

  // FIX: Check AI readiness
  if (!AppState.settings?.aiEnabled || !aiManager || aiManager.isAvailable !== 'readily') {
       resultsDiv.innerHTML = `<p class="placeholder error" style="padding: 20px;">AI features unavailable. Cannot analyze workflow.</p>`;
       showError("AI features unavailable. Cannot analyze workflow.", "warning");
       actionButton.disabled = false;
      return;
  }

  try {
    const prompt = `Analyze the following recorded workflow steps for potential inefficiencies, usability improvements, or alternative approaches. Consider the number of clicks, navigation patterns, and potential for automation or shortcuts.

Recorded Steps:
${AppState.scribeSteps.map(s => `${s.number}. ${escapeHtml(s.instruction)}`).join('\n')}

Provide your analysis in Markdown format, covering (if applicable):
1.  **Efficiency Analysis:** Any redundant steps or unnecessary navigation?
2.  **Potential Bottlenecks:** Identify steps likely to cause user friction or errors.
3.  **Optimization Suggestions:** Offer specific advice for making the workflow smoother or faster.
4.  **Alternative Approaches:** Suggest different methods to achieve the same goal if apparent.`;

    const result = await aiManager.prompt(prompt); // Assumes AI is ready
    resultsDiv.innerHTML = `
      <div class="action-result panel-section">
        <h4 class="section-title">🔬 Workflow Analysis & Optimization Suggestions</h4>
        <div class="result-content">${formatActionResult(result)}</div>
      </div>`;
    showSuccess('Workflow analysis complete!');
  } catch (error) {
    console.error('Analyze workflow error:', error);
    resultsDiv.innerHTML = `<p class="placeholder error" style="padding: 20px;">Failed to analyze workflow: ${error.message}</p>`;
    showError(`Failed to analyze workflow: ${error.message}`, 'error');
  } finally {
       actionButton.disabled = false; // Re-enable button
  }
}

// Clears the currently recorded steps
async function clearScribeSteps() {
  if (AppState.scribeRecording) return showError("Cannot clear steps while recording is active.", "warning");
  if (!AppState.scribeSteps || AppState.scribeSteps.length === 0) return showError('No recorded steps to clear.', 'info');

  if (confirm('Are you sure you want to clear the current recorded workflow? This cannot be undone.')) {
    AppState.scribeSteps = []; // Clear the steps array
    // Clear the UI displays
    document.getElementById('scribeResults').innerHTML = ''; // Clear main results
    document.getElementById('scribeActionResults').innerHTML = ''; // Clear action results too
    // Update display (will show placeholder) and update button states
    displayScribeSteps();
    showSuccess('Workflow steps cleared.');
  }
}

// Exports the recorded workflow in the specified format
async function exportScribe(format) {
  if (!AppState.scribeSteps || AppState.scribeSteps.length === 0) return showError('No workflow steps to export.', 'warning');

  const filenameBase = `spectrum-ai-scribe-workflow-${Date.now()}`;
  try {
    let content, mimeType, filename;

    // Get title and summary for context, providing defaults
    const title = document.querySelector('#scribeResults .workflow-header h3')?.textContent || `Recorded Workflow (${AppState.scribeSteps.length} Steps)`;
    const summary = document.querySelector('#scribeResults .workflow-header p')?.textContent || `Exported on ${new Date().toLocaleString()}`;

    if (format === 'txt') {
      content = `${title}\n${summary}\n---\n\n`;
      content += AppState.scribeSteps.map(s => `${s.number}. ${s.instruction}\n   (URL: ${s.url})`).join('\n\n');
      mimeType = 'text/plain;charset=utf-8';
      filename = `${filenameBase}.txt`;
      downloadFile(content, filename, mimeType); // Use utility function

    } else if (format === 'json') {
      const dataToExport = {
        title: title,
        summary: summary,
        exportedAt: new Date().toISOString(),
        totalSteps: AppState.scribeSteps.length,
        steps: AppState.scribeSteps.map(s => ({
          number: s.number, instruction: s.instruction, action: s.action,
          element: { // Include key element details for potential reconstruction or analysis
              tagName: s.element.tagName,
              id: s.element.id || null,
              className: s.element.className || null,
              text: s.element.text || null,
              ariaLabel: s.element.ariaLabel || null,
              placeholder: s.element.placeholder || null,
              type: s.element.type || null,
              name: s.element.name || null,
              value: s.element.value || null, // Be mindful of sensitive data in values
              href: s.element.href || null
          },
          timestamp: s.timestamp,
          url: s.url
          // Note: Screenshot data URL is intentionally omitted from JSON for size and potential privacy
        })),
      };
      content = JSON.stringify(dataToExport, null, 2); // Pretty print JSON
      mimeType = 'application/json;charset=utf-8';
      filename = `${filenameBase}.json`;
      downloadFile(content, filename, mimeType);

    } else if (format === 'pdf') {
      // Check if jsPDF library is loaded
      if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        throw new Error("jsPDF library is not loaded. Cannot export as PDF. Ensure jspdf.umd.min.js is included.");
      }
      showStatus('scribeStatus', 'Generating PDF, please wait...', true);
      // Use a timeout to allow UI update before blocking for PDF generation
      await new Promise(resolve => setTimeout(resolve, 50));
      await exportScribePDF(filenameBase); // Call dedicated PDF export function
      showStatus('scribeStatus', '', false);
      // Success message is handled within exportScribePDF
      return; // Return early as download happens in exportScribePDF

    } else {
        throw new Error(`Unsupported export format requested: ${format}`);
    }

    showSuccess(`Workflow successfully exported as ${format.toUpperCase()}`);

  } catch (error) {
    console.error(`Export Scribe (${format}) error:`, error);
    showError(`Export failed: ${error.message}`, 'error');
    showStatus('scribeStatus', '', false); // Clear status if PDF export fails here
  }
}

// Handles PDF generation using jsPDF
async function exportScribePDF(filenameBase) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' }); // Use points, standard A4
  const margin = 40;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - 2 * margin;
  let y = margin; // Current y position on the page

  // --- Add Title and Summary ---
  const title = document.querySelector('#scribeResults .workflow-header h3')?.textContent || 'Recorded Workflow';
  const summary = document.querySelector('#scribeResults .workflow-header p')?.textContent || '';

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  // Use splitTextToSize for potentially long titles
  const titleLines = doc.splitTextToSize(title, usableWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * (18 * 1.15) + 10; // Adjust spacing based on line height factor

  if (summary) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const summaryLines = doc.splitTextToSize(summary, usableWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * (10 * 1.15) + 15; // Space after summary
  }
  // --- End Title and Summary ---


  // --- Add Steps ---
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  for (const step of AppState.scribeSteps) {
      // Check if new page is needed BEFORE adding content
      const stepText = `${step.number}. ${step.instruction}`;
      const textLines = doc.splitTextToSize(stepText, usableWidth);
      const textHeight = textLines.length * (10 * 1.15); // Use line height factor
      let spaceNeeded = textHeight + 10; // Base space + padding

      // Check if screenshot exists and estimate its height
      let imgHeight = 0;
      let imgWidth = usableWidth * 0.8; // Make image slightly smaller than usable width
       const imgX = margin + (usableWidth * 0.1); // Center the smaller image
      if (step.screenshot) {
          try {
              const imgProps = doc.getImageProperties(step.screenshot);
              imgHeight = (imgProps.height * imgWidth) / imgProps.width;
              // Limit max image height to prevent huge images dominating page
              imgHeight = Math.min(imgHeight, pageHeight / 3);
              spaceNeeded += imgHeight + 10; // Add screenshot height + padding
          } catch {
              console.warn(`Could not get properties for screenshot ${step.number}, estimating space.`);
              imgHeight = 0; // Reset height if properties fail
              spaceNeeded += 20; // Add some space for potential error message or placeholder
          }
      }

      // Add new page if current step doesn't fit
      if (y + spaceNeeded > pageHeight - margin) {
          doc.addPage();
          y = margin; // Reset y position for new page
      }

      // Add step text (instruction)
      doc.setFont(undefined, 'bold');
      doc.text(stepText, margin, y, { maxWidth: usableWidth });
      doc.setFont(undefined, 'normal');
      y += textHeight + 5; // Move y down after text

      // Add screenshot
      if (step.screenshot && imgHeight > 0) {
          try {
              // Add a border around the image for clarity
              doc.setDrawColor(200); // Light gray border
              doc.rect(imgX - 1, y - 1, imgWidth + 2, imgHeight + 2);
              // Add the image
              doc.addImage(step.screenshot, 'JPEG', imgX, y, imgWidth, imgHeight);
              y += imgHeight + 10; // Move y down after image + padding
          } catch (imgError) {
              console.warn(`Failed to add screenshot image for step ${step.number} to PDF:`, imgError);
              doc.setFontSize(8).setTextColor(150, 0, 0); // Error color
              doc.text(`[Could not embed screenshot: ${imgError.message.substring(0,50)}...]`, imgX, y);
              doc.setTextColor(0); // Reset color
              doc.setFontSize(10); // Reset font size
              y += 15;
          }
      } else if (step.screenshot) { // If screenshot existed but failed properties earlier
           doc.setFontSize(8).setTextColor(150); // Muted color
           doc.text(`[Screenshot data invalid or missing]`, margin + 10, y);
           doc.setTextColor(0); // Reset color
           doc.setFontSize(10); // Reset font size
           y += 15;
      }
       else {
           y += 5; // Add smaller padding below text if there was no screenshot attempt
      }
  }
  // --- End Steps ---

  // --- Save PDF ---
  try {
      // Use blob output for potentially better performance/compatibility
      const pdfBlob = doc.output('blob');
      downloadFile(pdfBlob, `${filenameBase}.pdf`, 'application/pdf'); // Use utility
      showSuccess('Workflow PDF generated successfully!');
  } catch (saveError) {
       console.error("Failed to generate or save PDF:", saveError);
       showError(`Could not save PDF: ${saveError.message}`, 'error');
  }
  // --- End Save PDF ---
}

// Triggers a file download in the browser (Utility Function)
function downloadFile(content, filename, mimeType) {
  try {
    const blob = (content instanceof Blob) ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // Append link to body for Firefox compatibility
    a.click(); // Simulate click to trigger download
    // Cleanup
    setTimeout(() => {
       document.body.removeChild(a);
       URL.revokeObjectURL(url); // Free up memory
    }, 100);
  } catch (e) {
      console.error("File download failed:", e);
      showError("Could not trigger file download.", "error");
  }
}

// Make functions available globally if needed by other parts (e.g., message handler, commands)
window.reinjectScribeContentScript = reinjectScribeContentScript;
window.startScribeRecording = startScribeRecording; // Expose for context menu/command
window.handleClickCapture = handleClickCapture; // Called by central message handler

console.log('✅ Scribe module definitions loaded');