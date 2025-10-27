// ============================================
// SPECTRUM AI PRO ENHANCED v3.2.1
// Organizer Module - Intelligent Tab Grouping (FIXED)
// ============================================

function initializeOrganizer() {
  document.getElementById('organizeTabsButton')?.addEventListener('click', organizeTabs);

  // Add listeners for all contextual action buttons using event delegation on the panel
   const actionsPanel = document.getElementById('organizerActionsPanel');
   if (actionsPanel) {
      actionsPanel.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON' && e.target.dataset.action) {
              performGroupAction(e.target.dataset.action);
          }
      });
   }

   // Assign data-action attributes to buttons
   document.getElementById('summarizeGroupButton')?.setAttribute('data-action', 'summarize');
   document.getElementById('extractDataButton')?.setAttribute('data-action', 'extract');
   document.getElementById('findContactsButton')?.setAttribute('data-action', 'contacts');
   document.getElementById('analyzeContentButton')?.setAttribute('data-action', 'analyze');
   document.getElementById('compareGroupButton')?.setAttribute('data-action', 'compare');
   document.getElementById('predictGroupButton')?.setAttribute('data-action', 'predict');
}

async function organizeTabs() {
  const organizeButton = document.getElementById('organizeTabsButton');
  const organizerResultsElement = document.getElementById('organizerResults');
  const placeholder = document.getElementById('initialPlaceholder'); // Assume placeholder exists

  try {
    showStatus('organizerStatus', 'Analyzing tabs...', true);
    if (organizeButton) organizeButton.disabled = true;
    if (placeholder) placeholder.style.display = 'none'; // Hide placeholder
    if (organizerResultsElement) organizerResultsElement.innerHTML = '<div class="loader"></div>'; // Show loader

    // Determine if AI should be used
    const useAI = AppState.settings?.aiEnabled;
    let aiReady = false;
    if (useAI && aiManager) {
        try {
            // Attempt to initialize/check AI, don't throw error here, fallback later
            await aiManager.initialize(); // Updates aiManager.availability
            aiReady = aiManager.availability === 'readily';
            if (!aiReady && aiManager.availability !== 'downloadable' && aiManager.availability !== 'downloading') {
                 showError("AI not ready. Using basic domain grouping. Check Setup.", "warning");
            } else if (!aiReady) {
                 showError("AI model needs download. Click an AI action to start. Using domain grouping for now.", "info");
            }
        } catch (initError) {
             console.warn("AI initialization check failed:", initError);
             showError("AI check failed. Using basic domain grouping.", "warning");
             aiReady = false;
        }
    } else if (useAI && !aiManager) {
         showError("AI Manager not initialized. Using basic domain grouping.", "warning");
    } else if (!useAI) {
         showError("AI features disabled. Using basic domain grouping.", "info");
    }


    // Always fetch tabs first
    const tabs = await chrome.tabs.query({ currentWindow: true, pinned: false });
    const validTabs = tabs.filter(tab => tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('about:'));

    if (validTabs.length < 2) {
      throw new Error('Need at least 2 open tabs (excluding special pages like chrome://) to organize.');
    }

    let groups;
    if (useAI && aiReady) {
        showStatus('organizerStatus', `Found ${validTabs.length} tabs. Grouping with AI...`, true);
        try {
            // FIX: Add try...catch around AI specific logic
            await aiManager.createSession(); // Ensure session ready, triggers download if needed
            groups = await generateTabGroups(validTabs); // AI grouping
        } catch (aiError) {
             console.error("AI Grouping failed, falling back:", aiError);
             showError(`AI grouping failed (${aiError.message}). Falling back to domain grouping.`, 'warning');
             groups = generateFallbackGroups(validTabs); // Fallback on AI error
        }
    } else {
        // Use fallback if AI disabled, unavailable, or errored during init check
        groups = generateFallbackGroups(validTabs);
    }

    // --- Update State & UI ---
    AppState.organizerGroups = groups;
    AppState.selectedGroup = null; // Reset selection

    displayOrganizerResults(groups); // Update the results panel display
    resetOrganizerActions(); // Reset actions panel state (disables buttons)
    // Only show actions panel if groups were generated
    const actionsPanel = document.getElementById('organizerActionsPanel');
    if (actionsPanel) actionsPanel.style.display = groups.length > 0 ? 'block' : 'none';
    const resultsContainer = document.getElementById('organizerResults');
     if (resultsContainer) resultsContainer.style.display = 'block'; // Ensure results are visible


    showSuccess(`Suggested ${groups.length} groups for ${validTabs.length} tabs ${useAI && aiReady ? '(using AI)' : '(using domain grouping)'}.`);

  } catch (error) {
    console.error('Organize tabs error:', error);
    showError(error.message || 'Failed to organize tabs.', 'error');
    if (organizerResultsElement) {
      // Show error message within the results area
      organizerResultsElement.innerHTML = `<p class="placeholder error" style="padding: 20px;">Could not organize tabs: ${error.message}</p>`;
    }
     const actionsPanel = document.getElementById('organizerActionsPanel');
     if (actionsPanel) actionsPanel.style.display = 'none'; // Hide actions on error

  } finally {
    showStatus('organizerStatus', '', false); // Hide status message/loader
    if (organizeButton) organizeButton.disabled = false; // Re-enable button
  }
}

// Generates tab groups using AI
async function generateTabGroups(tabs) {
  // Map tabs to a simpler format for the prompt, including a local ID
  const tabInfo = tabs.map((tab, i) => ({
    localId: i + 1, // 1-based index for the prompt
    id: tab.id,     // Actual Chrome tab ID
    title: tab.title?.substring(0, 100) || '', // Limit title length
    url: tab.url,
    hostname: getHostname(tab.url), // Use utility function
    favIconUrl: tab.favIconUrl // Include favicon URL
  }));

  const prompt = `Analyze these browser tabs and group them intelligently by topic, purpose, or primary domain.

Tabs:
${tabInfo.map(t => `${t.localId}. ${t.title} (${t.hostname || 'No Hostname'})`).join('\n')}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "groups": [
    {
      "name": "Concise Group Name (1-3 words)",
      "tabIds": [1, 3, 5],
      "confidence": 85
    },
    // ... potentially more groups
  ]
}

Rules:
- "tabIds" MUST be an array of the numerical local IDs listed above.
- "name" must be concise (1-3 words).
- "confidence" is your estimated certainty (0-100) that the group is coherent.
- Each tab should ideally be in only ONE group. If a tab doesn't fit well, omit it.
- Aim for 2-6 meaningful groups based on common themes or tasks.`;

  // FIX: No try...catch here, let it bubble up to organizeTabs for fallback
  const response = await aiManager.prompt(prompt); // Assumes aiManager is ready
  let data;
  try {
      // More robust JSON extraction
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/);
       if (!jsonMatch || (!jsonMatch[1] && !jsonMatch[2])) {
           // If no clear JSON block, try parsing the whole response
           try { data = JSON.parse(response); }
           catch (e) { throw new Error("No JSON object or ```json``` block found in the AI response."); }
      } else {
           const jsonString = jsonMatch[1] || jsonMatch[2];
           data = JSON.parse(jsonString);
      }
      // Validate the parsed structure
      if (!data || !Array.isArray(data.groups)) {
           throw new Error("Parsed JSON is invalid or missing the 'groups' array.");
      }
  } catch (parseError) {
      console.error("Failed to parse AI response for grouping:", response, parseError);
      throw new Error(`AI response format error: ${parseError.message}`);
  }

  // Map localIds back to actual Chrome tab IDs and include full tab details
  return data.groups
    .map(group => {
      // Find the full tab info objects corresponding to the local IDs
      const tabsInGroup = (group.tabIds || [])
          .map(localId => tabInfo.find(t => t.localId === localId))
          .filter(Boolean); // Filter out any undefined results (if AI hallucinates an ID)

      // If no valid tabs were found for the group's IDs, discard the group silently
      if (tabsInGroup.length === 0) return null;

      return {
          name: group.name || 'Unnamed Group', // Provide default name
          confidence: group.confidence || 50, // Default confidence
          tabIds: tabsInGroup.map(t => t.id), // Use actual Chrome tab IDs now
          tabs: tabsInGroup // Store the full tab info objects
      };
    })
    .filter(Boolean); // Remove any null groups (those with no valid tabs)
}


// Fallback grouping function (groups by hostname)
// FIX: Safely handle undefined hostname and domain cleaning
function generateFallbackGroups(tabs) { // Accepts the full tab objects directly
  const domainGroups = {};
  tabs.forEach(tab => {
    // FIX: Safely get hostname using utility, provide fallback
    const hostname = getHostname(tab.url); // Use utility
    const domain = hostname || 'other'; // Group tabs without hostname under 'other'
    // FIX: Only call replace on strings
    const cleanDomain = typeof domain === 'string' ? domain.replace(/^www\./, '') : domain;

    if (!domainGroups[cleanDomain]) {
      // Create a new group for this domain
      const name = typeof cleanDomain === 'string' ? cleanDomain.split('.')[0] : 'Other'; // Use first part of domain or 'Other'
      domainGroups[cleanDomain] = {
        name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
        tabIds: [], // Will store Chrome tab IDs
        tabs: [],   // Will store tab info objects
        confidence: 50 // Lower confidence for fallback
      };
    }
    // Add tab to the group
    domainGroups[cleanDomain].tabIds.push(tab.id);
    domainGroups[cleanDomain].tabs.push(tab);
  });
  return Object.values(domainGroups); // Return array of group objects
}


// Displays the suggested groups in the results panel
function displayOrganizerResults(groups) {
  const resultsDiv = document.getElementById('organizerResults');
  if (!resultsDiv) {
      console.error("Organizer results container ('organizerResults') not found.");
      return;
  }
  resultsDiv.innerHTML = ''; // Clear previous results or loader

  if (!groups || groups.length === 0) {
    resultsDiv.innerHTML = '<p class="placeholder">No groups were suggested. Try opening more related tabs.</p>';
    return;
  }

  groups.forEach((group, index) => {
    const card = document.createElement('div');
    card.className = 'organizer-group group-card';
    card.dataset.groupIndex = index; // Store index for event listeners

    const confidenceClass = getScoreClass(group.confidence || 0);

    // Generate list items for tabs, including favicons and escaping HTML
    const tabListHtml = (group.tabs || []).map(tab => `
      <li>
        <img src="${tab.favIconUrl || 'icons/icon16.png'}" alt="" class="favicon" style="width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; object-fit: contain;">
        ${escapeHtml(tab.title || tab.url)}
      </li>`).join('');

    card.innerHTML = `
      <div class="organizer-group-header">
         <h3 title="${escapeHtml(group.name)}">${escapeHtml(group.name)}</h3>
        <span class="confidence-badge confidence-${confidenceClass}" title="AI Confidence">${group.confidence}%</span>
      </div>
      <ul style="max-height: 150px; overflow-y: auto; margin-bottom: 12px;">${tabListHtml}</ul>
      <div class="group-actions" style="margin-top: auto;"> <button class="primary-button create-group-btn" data-group-index="${index}" style="font-size: 13px; padding: 8px 12px;">✨ Create Group</button>
      </div>
    `;
    resultsDiv.appendChild(card);
  });

  // --- Add Event Listeners using Event Delegation on the resultsDiv ---
  resultsDiv.addEventListener('click', async (e) => {
      const card = e.target.closest('.organizer-group.group-card');
      const createButton = e.target.closest('.create-group-btn');

      if (createButton && card) {
           // Handle "Create Group" button click
          e.stopPropagation(); // Prevent card selection
          const index = parseInt(createButton.dataset.groupIndex, 10);
          if (!isNaN(index)) {
            createButton.textContent = 'Creating...';
            createButton.disabled = true;
            await createChromeTabGroup(index); // This handles success/error UI updates internally
          }
      } else if (card) {
          // Handle clicking the card itself to select it
          const index = parseInt(card.dataset.groupIndex, 10);
          if (!isNaN(index)) {
            selectGroup(index);
          }
      }
  });
}

// Resets the action panel and selection state
function resetOrganizerActions() {
    // Remove 'selected' class from all cards
    document.querySelectorAll('.organizer-group.group-card').forEach(card => card.classList.remove('selected'));
    // Reset selected group in state
    AppState.selectedGroup = null;
    // Disable all action buttons
    const actionButtons = document.querySelectorAll('#organizerActionsPanel .ai-action-button');
    actionButtons.forEach(btn => btn.disabled = true);

    // Reset context text
    const contextText = document.getElementById('organizerActionContext');
    if(contextText) contextText.textContent = 'Select a group above to enable AI actions.';
    // Clear any previous action results
    const resultsDiv = document.getElementById('groupActionResults');
    if (resultsDiv) resultsDiv.innerHTML = '';
}

// Creates an actual Chrome tab group using the service worker
async function createChromeTabGroup(groupIndex) {
  // Validate group index and data
  if (groupIndex < 0 || !AppState.organizerGroups || groupIndex >= AppState.organizerGroups.length) {
      console.error("Invalid group index for createChromeTabGroup:", groupIndex);
      return;
  }
  const group = AppState.organizerGroups[groupIndex];
  if (!group || !group.tabIds || group.tabIds.length === 0) {
      showError("Cannot create group: Invalid group data or no tabs.", 'error');
      return;
  }

  const card = document.querySelector(`.organizer-group[data-group-index="${groupIndex}"]`);
  const button = card?.querySelector('.create-group-btn'); // Get button for potential re-enabling

  try {
    // Send message to service worker to perform the grouping action
    const response = await chrome.runtime.sendMessage({
      type: 'create-tab-group',
      tabIds: group.tabIds,
      groupName: group.name
    });

    // Handle potential errors during message sending itself
    if (chrome.runtime.lastError) {
        throw new Error(`Chrome runtime error: ${chrome.runtime.lastError.message}`);
    }

    if (response.success) {
      showSuccess(`Created Chrome tab group: "${group.name}"`);
      // Update UI for the created group card
      if (card) {
          card.style.opacity = '0.5'; // Visually indicate it's been processed
          card.style.pointerEvents = 'none'; // Prevent re-clicking
          card.classList.remove('selected'); // Deselect if selected
          button?.remove(); // Remove create button
           // If this was the selected group, reset the action panel
           if (AppState.selectedGroup === groupIndex) resetOrganizerActions();
      }
    } else {
      // Handle errors reported back by the service worker
      throw new Error(response.error || 'Unknown error occurred in service worker during group creation');
    }
  } catch (error) {
    console.error('Create group error:', error);
    showError(`Failed to create tab group: ${error.message}.`, 'error');
     // Re-enable button on failure
     if (button) {
         button.textContent = '✨ Create Group';
         button.disabled = false;
     }
  }
}

// Selects a group for contextual actions
function selectGroup(groupIndex) {
  // Validate index
  if (groupIndex < 0 || !AppState.organizerGroups || groupIndex >= AppState.organizerGroups.length) {
      console.warn("Attempted to select invalid group index:", groupIndex);
      return;
  }

  // If clicking the already selected group, deselect it
  if (groupIndex === AppState.selectedGroup) {
      resetOrganizerActions();
      return;
  }

  AppState.selectedGroup = groupIndex;
  const group = AppState.organizerGroups[groupIndex];

  // Highlight the selected card and unhighlight others
  document.querySelectorAll('.organizer-group.group-card').forEach((card, i) => {
    card.classList.toggle('selected', i === groupIndex);
  });

  // Enable action buttons
   const actionButtons = document.querySelectorAll('#organizerActionsPanel .ai-action-button');
   actionButtons.forEach(btn => btn.disabled = false);

  // Update context text
  const contextText = document.getElementById('organizerActionContext');
   if(contextText) contextText.textContent =
    `Actions for: ${escapeHtml(group.name)} (${group.tabs.length} tabs)`;

  // Clear previous action results
  const resultsDiv = document.getElementById('groupActionResults');
  if (resultsDiv) resultsDiv.innerHTML = '';
}

// Performs the selected AI action on the currently selected group
async function performGroupAction(actionType) {
  if (AppState.selectedGroup === null || !AppState.organizerGroups || AppState.selectedGroup >= AppState.organizerGroups.length) {
       return showError('Please select a suggested group first before running an action.', 'warning');
  }

  const group = AppState.organizerGroups[AppState.selectedGroup];
  const resultsDiv = document.getElementById('groupActionResults');
  if (!resultsDiv) return;

  // Find the specific button clicked using data-action attribute
  const actionButton = document.querySelector(`#organizerActionsPanel button[data-action="${actionType}"]`);
  if (actionButton) actionButton.disabled = true; // Disable the button during processing

  try {
    resultsDiv.innerHTML = '<div class="loader"></div><p style="text-align: center; color: var(--text-secondary);">Performing AI action...</p>';

    // --- AI Check ---
    if (!AppState.settings?.aiEnabled) {
        throw new Error("AI features are disabled in settings.");
    }
    if (!aiManager) {
        throw new Error("AI Manager not initialized.");
    }
    // FIX: Add try...catch specifically around createSession
    try {
        await aiManager.createSession(); // Attempt to create session, handles download/errors
    } catch (aiError) {
        throw new Error(`AI Model Error: ${aiError.message}. Check Setup page.`); // Rethrow with specific context
    }
    // --- End AI Check ---

    let result;
    // Call the appropriate function based on actionType
    // FIX: Added try...catch around each specific action call for better error context
    try {
        switch (actionType) {
          case 'summarize': result = await summarizeGroup(group); break;
          case 'extract': result = await extractGroupData(group); break;
          case 'contacts': result = await findGroupContacts(group); break;
          case 'analyze': result = await analyzeGroupContent(group); break;
          case 'compare': result = await compareGroup(group); break;
          case 'predict': result = await predictGroupTrends(group); break;
          default: throw new Error(`Unknown action type: ${actionType}`);
        }
    } catch (actionError) {
         // Re-throw action-specific errors (like content fetching failure)
         throw actionError;
    }

    // Display the result
    resultsDiv.innerHTML = `
      <div class="action-result panel-section">
        <h4 class="section-title">${getActionTitle(actionType)}</h4>
        <div class="result-content">${formatActionResult(result)}</div>
      </div>
    `;
    showSuccess(`${getActionTitle(actionType)} completed!`);

  } catch (error) {
    console.error(`Group action '${actionType}' error:`, error);
    // FIX: Show specific error in the results area
    resultsDiv.innerHTML = `<p class="placeholder error" style="padding: 20px;">Action '${actionType}' failed: ${error.message}</p>`;
    showError(`Action failed: ${error.message}`, 'error');
  } finally {
     // Re-enable the button
     if (actionButton) actionButton.disabled = false;
  }
}


// --- Action Implementations (summarize, extract, contacts, analyze) ---
// These functions now include getGroupContent call and use aiManager.prompt

// Fetches content for tabs in a group
async function getGroupContent(group, maxTabs = 5, maxCharsPerTab = 1500) {
    const contents = [];
    // Limit the number of tabs processed
    const tabsToProcess = group.tabs.slice(0, maxTabs);
    showStatus('organizerStatus', `Fetching content for ${tabsToProcess.length} tabs (max ${maxTabs})...`, true);

    // Fetch content concurrently
    const contentPromises = tabsToProcess.map(tab =>
        getTabContent(tab.id).catch(error => { // Use utility function from core
            console.warn(`Failed to get content for tab ${tab.id} (${tab.title}): ${error.message}`);
            return null; // Don't fail all if one tab is inaccessible
        })
    );
    const results = await Promise.all(contentPromises);

    results.forEach((content, index) => {
        if (content && content.text) {
            contents.push({
                title: tabsToProcess[index].title || 'Untitled',
                text: content.text.substring(0, maxCharsPerTab) // Limit characters per tab
            });
        }
    });

    showStatus('organizerStatus', '', false); // Hide status
    if (contents.length === 0) {
      throw new Error(`Could not retrieve readable content from any of the first ${maxTabs} tabs. Ensure pages are loaded and accessible.`);
    }
    return contents;
}


async function summarizeGroup(group) {
  const contents = await getGroupContent(group, 5, 1000); // Limit context size
  const prompt = `Summarize the common themes, key topics, and main insights from these ${contents.length} web page snippets (grouped under the topic "${group.name}").

${contents.map((c, i) => `--- Snippet from Tab ${i + 1}: ${c.title} ---
${c.text}
`).join('\n')}

Provide a concise summary formatted in Markdown:
1.  **Overall Theme:** (1-2 sentences max)
2.  **Key Topics Covered:** (Bulleted list)
3.  **Main Insights/Takeaways:** (Bulleted list)
4.  **Relationship Between Tabs:** (Brief explanation)`;
  return await aiManager.prompt(prompt);
}

async function extractGroupData(group) {
  const contents = await getGroupContent(group, 5, 1500);
  const prompt = `Extract key data points, statistics, names (people, organizations, locations), dates, and specific factual information from these ${contents.length} text snippets (related to "${group.name}").

${contents.map((c, i) => `--- Snippet from Tab ${i + 1}: ${c.title} ---
${c.text}
`).join('\n')}

Format the output clearly in Markdown, grouping similar items:
- **Key Statistics & Numbers:** (e.g., percentages, counts, monetary values)
- **Important Dates Mentioned:**
- **Notable Names/Entities:** (People, Organizations, Products, Locations)
- **Specific Factual Claims:** (Brief, verifiable statements)

If a category has no relevant data, state "None found". Be precise and extract only from the provided text.`;
  return await aiManager.prompt(prompt);
}

async function findGroupContacts(group) {
  const contents = await getGroupContent(group, 5, 2000);
  const prompt = `Scan the following text snippets (from tabs related to "${group.name}") and extract any potential contact information.

${contents.map((c, i) => `--- Snippet from Tab ${i + 1}: ${c.title} ---
${c.text}
`).join('\n')}

Look specifically for:
- Email addresses (format: name@domain.com)
- LinkedIn profile URLs (containing linkedin.com/in/)
- Twitter handles (format: @username)
- Phone numbers (various common formats)
- Names of people if associated with a company or role mentioned nearby.

Format the findings as a Markdown bulleted list. If no contact information is found, explicitly state "No contact information found". Do not guess or infer information not present.`;
  return await aiManager.prompt(prompt);
}

async function analyzeGroupContent(group) {
  const contents = await getGroupContent(group, 5, 1000);
  const prompt = `Perform a brief content analysis on these ${contents.length} text snippets (grouped under "${group.name}").

${contents.map((c, i) => `--- Snippet from Tab ${i + 1}: ${c.title} ---
${c.text}
`).join('\n')}

Analyze and report in Markdown:
1.  **Primary Topics & Subtopics:** (Identify the main subjects based *only* on the text)
2.  **Overall Sentiment:** (Positive, Negative, Neutral, Mixed?)
3.  **Potential Target Audience:** (Infer who this content is likely written for)
4.  **Content Gaps/Unanswered Questions:** (What seems missing or unclear based *only* on these snippets?)`;
  return await aiManager.prompt(prompt);
}

// FIX: Added Compare and Predict functions based on README
async function compareGroup(group) {
  if (group.tabs.length < 2) return 'Please select a group with at least 2 tabs to compare.';
  const contents = await getGroupContent(group, 4, 800); // Compare up to 4 tabs, limit text
  if (contents.length < 2) throw new Error("Could not retrieve content from at least two tabs for comparison.");

  const prompt = `Compare and contrast the content of these ${contents.length} text snippets (related to "${group.name}"). Focus ONLY on the information present in the snippets.

${contents.map((c, i) => `--- Snippet from Tab ${i + 1}: ${c.title} ---
${c.text}
`).join('\n')}

Provide a comparative analysis in Markdown:
1.  **Key Similarities:** (Common points, themes, or facts mentioned)
2.  **Main Differences:** (Contrasting information, perspectives, or details)
3.  **Unique Aspects of Each Snippet:** (What specific info does each provide that others don't?)
4.  **(Optional) Which seems most informative based *only* on these snippets?**`;
  return await aiManager.prompt(prompt);
}

async function predictGroupTrends(group) {
  const contents = await getGroupContent(group, 5, 1000);
  const prompt = `Based *only* on the content within these ${contents.length} text snippets (grouped as "${group.name}"), identify potential trends, future outlooks, key insights, opportunities or challenges mentioned or clearly implied. Do not use external knowledge.

${contents.map((c, i) => `--- Snippet from Tab ${i + 1}: ${c.title} ---
${c.text}
`).join('\n')}

Analyze for the following and present in Markdown (State "None apparent" if nothing found):
1.  **Emerging Trends Mentioned/Implied:**
2.  **Future Predictions or Outlook Stated:**
3.  **Key Insights from Collective Content:**
4.  **Potential Opportunities/Challenges Highlighted:**`;
  return await aiManager.prompt(prompt);
}


console.log('✅ Organizer module definitions loaded');
window.organizeTabs = organizeTabs; // Expose globally if needed by commands/menus