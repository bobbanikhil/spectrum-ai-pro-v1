/**
 * SPECTRUM AI PRO ENHANCED v3.2.1
 * Chat Module - Context-Aware AI Assistant
 */

console.log('💬 Chat module loading...');

// Chat histories for each module (in-memory, reset on panel close/reload)
const chatHistories = {
  auditor: [],
  organizer: [],
  scribe: []
};

// **FIX: Define getWelcomeMessage BEFORE initializeChat calls initializeChatWelcome**
/**
 * Get welcome message for a module
 * @param {string} module - Module name
 * @returns {string} Welcome message
 */
function getWelcomeMessage(module) {
  switch (module) {
    case 'auditor':
      return 'Run an audit using the "Run 12-Point Audit" button, then ask me anything about the results, scores, or recommendations!';
    case 'organizer':
      return 'Click "Analyze & Group Tabs" to get started, then ask me about the suggested groups or select one for actions.';
    case 'scribe':
      return 'Click "Start Recording" to capture a workflow, then ask me about the steps or potential improvements.';
    default:
      return 'Welcome! How can I assist you today?';
  }
}

/**
 * Initialize chat interfaces for all modules
 */
function initializeChat() {
  ['auditor', 'organizer', 'scribe'].forEach(module => {
    const input = document.getElementById(`${module}ChatInput`);
    const sendBtn = document.getElementById(`${module}ChatSend`);
    const clearBtn = document.getElementById(`${module}ChatClear`); // Assuming clear buttons exist with this ID pattern
    const messagesContainer = document.getElementById(`${module}ChatMessages`); // Need this for welcome message

    // Enter key listener
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !input.disabled) { // Send on Enter (not Shift+Enter), ignore if disabled
        e.preventDefault(); // Prevent newline
        sendChatMessage(module);
      }
    });

    // Send button listener
    sendBtn?.addEventListener('click', () => sendChatMessage(module));

    // Clear button listener
    clearBtn?.addEventListener('click', () => clearChatHistory(module));

    // Initialize welcome message if container exists
    if (messagesContainer) {
        initializeChatWelcome(module); // Call welcome message setup
    } else {
         console.warn(`Messages container not found for ${module} chat.`);
    }

  });
  console.log('Chat interfaces initialized.');
}


/**
 * Send chat message for a specific module
 * @param {string} module - Module name (auditor, organizer, scribe)
 */
async function sendChatMessage(module) {
  const inputId = `${module}ChatInput`;
  const messagesId = `${module}ChatMessages`;
  const input = document.getElementById(inputId);
  const messagesContainer = document.getElementById(messagesId);
  const sendButton = document.getElementById(`${module}ChatSend`);

  if (!input || !messagesContainer || !sendButton) {
      console.error(`Chat elements for module "${module}" not found.`);
      return;
  }

  const userMessage = input.value.trim();
  if (!userMessage) return; // Ignore empty messages

  // --- Disable input during processing ---
  input.value = ''; // Clear input immediately
  input.disabled = true;
  sendButton.disabled = true;
  // ---

  // Add user message to UI and history
  addChatMessage(messagesContainer, userMessage, 'user');
  chatHistories[module].push({ role: 'user', content: userMessage });

  // Get context specific to the module
  const context = getChatContext(module);

  // If context is explicitly null (meaning prerequisites not met), show specific message
  if (context === null) {
    const noContextMsg = getNoContextMessage(module);
    addChatMessage(messagesContainer, noContextMsg, 'assistant error'); // Use error style for this message
    chatHistories[module].push({ role: 'assistant', content: noContextMsg });
    // Re-enable input
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
    return;
  }

  // Show typing indicator
  const typingIndicator = addChatMessage(messagesContainer, '...', 'assistant typing');

  try {
     // --- AI Check ---
     if (!AppState.settings?.aiEnabled) {
        throw new Error("AI features are currently disabled in settings.");
     }
     if (!aiManager) { // Should not happen if main.js is correct
         throw new Error("AI Manager not initialized.");
     }
     // FIX: Attempt to create session; this handles availability checks & download triggers
     await aiManager.createSession(); // Throws if unavailable after check/attempt
     // --- End AI Check ---

    // Create a container for the streaming AI response
    const assistantMessageDiv = document.createElement('div');
    assistantMessageDiv.className = 'chat-message assistant'; // Style as assistant message
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content'; // Add class for potential styling
    assistantMessageDiv.appendChild(contentDiv);

    // Remove typing indicator *before* adding the new message container
    typingIndicator.remove();
    messagesContainer.appendChild(assistantMessageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll down

    // Stream the AI response
    let fullResponse = '';
    // Use the streamPrompt method which expects context as the second argument
    await aiManager.streamPrompt(userMessage, context, (chunk) => {
      fullResponse = chunk; // Update full response with latest chunk
      // Render the markdown chunk into the content div using the 'marked' utility
      contentDiv.innerHTML = marked.parse(chunk); // Assumes 'marked' is globally available from utils/core
      // Keep scrolled to the bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, {}); // Pass empty options object if needed

    // Add final response to history
    chatHistories[module].push({ role: 'assistant', content: fullResponse });

  } catch (error) {
    console.error(`Chat error in module ${module}:`, error);
    // Ensure typing indicator is removed on error, check if it still exists
    const stillTyping = messagesContainer.querySelector('.assistant.typing');
    if (stillTyping) stillTyping.remove();

    // Add error message to chat UI
    addChatMessage(messagesContainer, `Sorry, I encountered an error: ${error.message}. Please check AI status or try again.`, 'assistant error');
     // Optionally add error to history
    // chatHistories[module].push({ role: 'assistant', content: `Error: ${error.message}` });
  } finally {
    // Re-enable input regardless of success or failure
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
  }
}

/**
 * Add a chat message to the container
 * @param {HTMLElement} messagesContainer - Container element
 * @param {string} content - Message content
 * @param {string} role - Message role (user, assistant, assistant typing, assistant error, assistant welcome)
 * @returns {HTMLElement} Created message element
 */
function addChatMessage(messagesContainer, content, role) {
  // Ensure messagesContainer exists
  if (!messagesContainer) {
      console.error("Cannot add chat message: messagesContainer is null or undefined.");
      // Return a dummy element to prevent errors in caller
      return document.createElement('div');
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${role}`; // Role doubles as class

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  if (role === 'assistant typing') {
      // Specific HTML for typing indicator
      contentDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  } else if (role === 'user') {
      // Use textContent for user messages to prevent HTML injection
      contentDiv.textContent = content;
  } else {
       // Use markdown parser for assistant messages (including welcome and errors)
       // Check if 'marked' exists before using it
       if (typeof marked !== 'undefined' && marked.parse) {
         contentDiv.innerHTML = marked.parse(content);
       } else {
         console.warn("'marked' parser not found. Displaying raw content for assistant message.");
         // Fallback to textContent if marked is missing
         contentDiv.textContent = content;
       }
  }

  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);

  // Scroll to the bottom smoothly
  messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });

  return messageDiv; // Return the created element
}


/**
 * Get chat context for a module based on AppState
 * @param {string} module - Module name
 * @returns {string|null} Context string or null if prerequisite data is missing
 */
function getChatContext(module) {
  switch (module) {
    case 'auditor': return getAuditorContext();
    case 'organizer': return getOrganizerContext();
    case 'scribe': return getScribeContext();
    default:
      console.warn(`Unknown module requested for chat context: ${module}`);
      // Return a generic context if module is unknown but AI should still respond somehow
      return "You are a helpful AI assistant integrated into a browser extension. The user is in an unknown section.";
  }
}

// Context for the Auditor chat
function getAuditorContext() {
  // FIX: Return null if audit data/report is missing, indicating prerequisites not met
  if (!AppState.auditData || !AppState.auditReport) return null;
  // Construct context string with key audit data
  return `Context: The user is viewing a website audit report.
Overall Score: ${AppState.auditData.overallScore ?? 'N/A'}/100
Health Status: ${AppState.auditData.health ?? 'N/A'}
Identified Issues: ${AppState.auditData.issues?.errors ?? 0} errors, ${AppState.auditData.issues?.warnings ?? 0} warnings.
Category Scores (0-10): ${Object.entries(AppState.auditData.scores ?? {}).map(([k, v]) => `${k}: ${v?.toFixed(1) ?? 'N/A'}`).join(', ')}

Report Summary (first 1000 characters):
${AppState.auditReport.substring(0, 1000)}...

Task: Answer the user's questions based *only* on the provided audit context above. Be specific and refer to the scores or report details when relevant. Do not ask for the full report unless necessary to answer.`;
}

// Context for the Organizer chat
function getOrganizerContext() {
  // FIX: Return null if groups are missing
  if (!AppState.organizerGroups || AppState.organizerGroups.length === 0) return null;
  // Build context string with group info
  let context = `Context: The user's browser tabs have been analyzed and grouped.
Total Groups Suggested: ${AppState.organizerGroups.length}
Groups Summary:
`;
  AppState.organizerGroups.forEach((group, index) => {
    // Add safety check for group.tabs
    const tabTitles = group.tabs ? group.tabs.map(t => t.title?.substring(0, 50) || 'Untitled').join('; ') : 'No tab details';
    context += `
Group ${index + 1}: "${group.name}" (${group.tabIds?.length || 0} tabs, ${group.confidence}% confidence)
Tab Titles: ${tabTitles}`;
  });
  // Add info about the currently selected group, if any
  if (AppState.selectedGroup !== null && AppState.organizerGroups[AppState.selectedGroup]) {
    const selected = AppState.organizerGroups[AppState.selectedGroup];
    context += `

CURRENTLY SELECTED GROUP FOR ACTIONS: "${selected.name}" (${selected.tabIds?.length || 0} tabs)`;
  }
  context += `

Task: Answer questions about these tab groups, the selected group (if any), or suggest organization actions based *only* on the provided group context.`;
  return context;
}

// Context for the Scribe chat
function getScribeContext() {
  // FIX: Return null if steps are missing
  if (!AppState.scribeSteps || AppState.scribeSteps.length === 0) return null;
  const title = document.querySelector('#scribeResults .workflow-header h3')?.textContent || 'Recorded Workflow';
  // Build context with workflow title and steps
  return `Context: A user workflow titled "${title}" has been recorded.
Total Steps Recorded: ${AppState.scribeSteps.length}
Recorded Steps:
${AppState.scribeSteps.map(s => `${s.number}. ${escapeHtml(s.instruction)}`).join('\n')}

Task: Answer the user's questions about this specific workflow based *only* on the steps provided. Explain steps, discuss potential issues, or clarify the process shown.`;
}

/**
 * Get message when no context is available for a module
 * @param {string} module - Module name
 * @returns {string} No context message
 */
function getNoContextMessage(module) {
  switch (module) {
    case 'auditor':
      return 'I need an audit report to answer questions. Please click "🚀 Run 12-Point Audit" first.';
    case 'organizer':
      return 'I need analyzed tabs to help. Please click "📂 Analyze & Group Tabs" first.';
    case 'scribe':
      return 'I need a recorded workflow to discuss. Please click "🎬 Start Recording" first.';
    default:
      return 'No context is available for this section yet. Please perform the main action for this tab first.';
  }
}

/**
 * Clear chat history for a module
 * @param {string} module - Module name
 */
function clearChatHistory(module) {
  // Check if history exists for the module and has entries
  if (!chatHistories[module] || chatHistories[module].length === 0) {
      if (typeof showError === 'function') showError(`Chat history for ${module} is already empty.`, "info");
      return;
  }

  if (confirm(`Are you sure you want to clear the chat history for the ${module} tab?`)) {
    chatHistories[module] = []; // Reset the history array for the specific module

    const messagesId = `${module}ChatMessages`;
    const messagesContainer = document.getElementById(messagesId);

    if (messagesContainer) {
      messagesContainer.innerHTML = ''; // Clear the UI
      initializeChatWelcome(module); // Add back the welcome message
    } else {
        console.warn(`Messages container not found for clearing chat: ${messagesId}`);
    }

    if (typeof showSuccess === 'function') {
      showSuccess(`Chat history for ${module} cleared.`);
    }
  }
}


/**
 * Initialize welcome messages for all chat modules
 * @param {string} [specificModule=null] - Optional: Initialize only a specific module
 */
function initializeChatWelcome(specificModule = null) {
  const modules = specificModule ? [specificModule] : ['auditor', 'organizer', 'scribe'];

  modules.forEach(module => {
    const messagesId = `${module}ChatMessages`;
    const messagesContainer = document.getElementById(messagesId);

    // Add welcome message only if the container exists and is currently empty
    if (messagesContainer && messagesContainer.children.length === 0) {
        // Use addChatMessage for consistent formatting and handling (e.g., markdown)
        addChatMessage(messagesContainer, getWelcomeMessage(module), 'assistant welcome'); // Added 'welcome' class for potential styling
    }
  });
}

// Export functions if needed globally (though typically called internally or via main.js)
window.initializeChat = initializeChat;
window.sendChatMessage = sendChatMessage;
window.clearChatHistory = clearChatHistory;
// getWelcomeMessage and initializeChatWelcome are now defined correctly before use.

console.log('✅ Chat module loaded');