// ============================================
// SPECTRUM AI PRO ENHANCED v3.2.1
// Auditor Module - Website Analysis
// ============================================

function initializeAuditor() {
  document.getElementById('auditButton')?.addEventListener('click', runAudit);
  // FIX: Moved button listeners for report toggle to setupReportToggleButton
}

async function runAudit() {
  const auditButton = document.getElementById('auditButton'); // Cache button element
  try {
    showStatus('auditStatus', 'Starting audit...', true);
    if (auditButton) auditButton.disabled = true;

    // --- AI Check ---
    if (!AppState.settings?.aiEnabled) {
        throw new Error("AI features are disabled in settings.");
    }
    if (!aiManager) { // Ensure aiManager exists (should be initialized in main)
        throw new Error("AI Manager not initialized. Cannot run audit.");
    }
    // FIX: Check current status and attempt to create session, which handles download/errors
    // This will show status messages like "Downloading..." or throw if unavailable
    await aiManager.createSession(); // Throws if unavailable after trying
    // If it didn't throw, AI is ready or download has started/progressing. Proceed.
    // --- End AI Check ---

    showStatus('auditStatus', 'Fetching page content...', true);
    const tab = await getCurrentTab(); // Utility from core/utils
    if (!tab) throw new Error('No active tab found.');
    // FIX: Add check for restricted URLs
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('about:')) {
       throw new Error('Cannot analyze restricted browser pages (e.g., chrome://, extensions).');
    }

    const content = await getTabContent(tab.id); // Utility from core/utils -> calls service worker
    // FIX: Check specifically for content.text existence and type
    if (!content || typeof content.text !== 'string') {
        // More specific error based on potential scripting issues
        throw new Error('Could not retrieve page content. The page might be protected, too complex, or inaccessible to extensions.');
    }

    showStatus('auditStatus', 'Analyzing with AI (this may take a moment)...', true);

    // --- AI Prompt (As defined in README.md) ---
    const prompt = `
         Analyze the following web page content (first ~10000 chars) for a comprehensive 12-point audit:
         Technical, Accessibility, Performance, Security, UX, Content Quality, SEO, Links, Conversion Potential, Analytics Implementation, Competitive Standing (infer), and Mobile Friendliness (infer).

         Content Snippet (Title: ${content.title}):
         \`\`\`
         ${content.text.substring(0, 10000)}
         \`\`\`

         Respond ONLY with a single, valid JSON object containing two keys: "dashboard" and "markdownReport".

         1.  **dashboard**: An object with:
             * \`overallScore\` (number 0-100)
             * \`health\` (string: "Excellent", "Good", "Fair", or "Poor" based on overallScore)
             * \`issues\` (object: \`{ "errors": number, "warnings": number }\` - estimated counts)
             * \`scores\` (object with keys for each of the 12 points, values 0-10, e.g., \`{ "technical": 8.5, ... }\`)

         2.  **markdownReport**: A string containing a detailed Markdown report. Structure it with:
             * '# Audit Report for [Page Title]'
             * An overall '## Overview' section (score, health, total issues).
             * A section '## [Point Name]' for each of the 12 points, including:
                 * Score (e.g., '* **Score**: 8.5/10')
                 * A brief 'Assessment' (1-2 sentences).
                 * Bulleted '* **Issues**:' (if any identified).
                 * Bulleted '* **Recommendations**:' (actionable advice).

         Example JSON structure:
         {
           "dashboard": {
             "overallScore": 78, "health": "Good", "issues": { "errors": 2, "warnings": 5 },
             "scores": { "technical": 8, "accessibility": 7, "performance": 8, "security": 9, "ux": 7.5, "content": 8, "seo": 7, "links": 8, "conversion": 6.5, "analytics": 7, "competitive": 7, "mobile": 8.5 }
           },
           "markdownReport": "# Audit Report for Example Page\\n\\n## Overview\\n* Score: 78/100 (Good)\\n* Issues: 2 Errors, 5 Warnings\\n\\n## Technical\\n* **Score**: 8/10\\n* Assessment: Generally sound technical foundation.\\n* **Issues**:\\n  - Minor console errors detected.\\n* **Recommendations**:\\n  - Resolve console errors.\\n..."
         }
         `;

    const response = await aiManager.prompt(prompt);
    // --- End AI Prompt ---

    let auditResult;
    try {
        // FIX: More robust JSON extraction - look for ```json ... ``` block or a standalone {} block
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/);
        if (!jsonMatch || (!jsonMatch[1] && !jsonMatch[2])) {
             // If no clear JSON block, try parsing the whole response, it might be just the JSON
             try {
                 auditResult = JSON.parse(response);
             } catch (e) {
                 throw new Error("AI response did not contain a valid JSON object or ```json``` block.");
             }
        } else {
            const jsonString = jsonMatch[1] || jsonMatch[2]; // Get content from either capture group
            auditResult = JSON.parse(jsonString);
        }

        // Basic validation of the parsed JSON structure
        if (!auditResult.dashboard || typeof auditResult.dashboard !== 'object' ||
            !auditResult.markdownReport || typeof auditResult.markdownReport !== 'string' ||
            !auditResult.dashboard.scores || typeof auditResult.dashboard.scores !== 'object' ||
            typeof auditResult.dashboard.overallScore !== 'number' ||
            typeof auditResult.dashboard.health !== 'string' ||
            !auditResult.dashboard.issues || typeof auditResult.dashboard.issues !== 'object') {
            throw new Error("JSON response missing required fields or has incorrect types (dashboard, markdownReport, dashboard.scores, overallScore, health, issues).");
        }
        console.log("Parsed AI Audit Result:", auditResult.dashboard);
    } catch (parseError) {
        console.error("Failed to parse AI audit response:", response, parseError);
        // Provide more context in the error shown to the user
        throw new Error(`AI response format error: ${parseError.message}. AI response started with: ${response.substring(0, 200)}...`);
    }

    // --- Update State & UI ---
    AppState.auditData = auditResult.dashboard;
    AppState.auditReport = auditResult.markdownReport;

    showStatus('auditStatus', '', false); // Hide status/loader
    displayAuditDashboard(AppState.auditData); // Update dashboard UI
    displayAuditReport(AppState.auditReport); // Populate the (initially hidden) report div
    const toggleButton = document.getElementById('toggleReportButton'); // Show toggle button
    if (toggleButton) toggleButton.style.display = 'block';
    showSuccess('Audit completed successfully! ✨');
    // FIX: Add message to chat after successful audit
    if (typeof addChatMessage === 'function') {
        addChatMessage(document.getElementById('auditorChatMessages'), 'Audit complete! Review the dashboard and report. Feel free to ask me questions about the findings.', 'assistant');
    }

    // --- Save to History ---
     if (typeof saveAuditReport === 'function') {
       const reportToSave = {
           id: Date.now() + Math.random(), // Simple unique-ish ID
           url: tab.url,
           title: content.title, // Save title too
           date: new Date().toISOString(),
           data: AppState.auditData, // The dashboard data object
           report: AppState.auditReport // The markdown string
       };
       await saveAuditReport(reportToSave); // Function from history module
       if (typeof loadHistory === 'function') loadHistory(); // Refresh history tab display
     } else {
        console.warn("saveAuditReport function not found (History module might be missing or loaded later).");
     }
     // --- End Save to History ---

   } catch (error) {
     console.error('Audit failed:', error);
     // FIX: Show specific error messages for common issues
     if (error.message.includes('Could not retrieve page content') || error.message.includes('Cannot access page content') || error.message.includes('restricted browser pages')) {
        showError(error.message, 'error'); // Show specific content error
     } else if (error.message.includes('AI model is not available') || error.message.includes('AI Model is not ready')) {
         showError(`Audit failed: ${error.message}. Please check the Setup page.`, 'error'); // Specific AI error
     }
      else {
        showError(`Audit failed: ${error.message}`, 'error'); // Generic error
     }

     // Reset UI to initial state on error
     document.getElementById('dashboardContainer').style.display = 'none';
     document.getElementById('auditReportContent').style.display = 'none';
     document.getElementById('toggleReportButton').style.display = 'none';
     const placeholder = document.getElementById('initialPlaceholder');
     if(placeholder) placeholder.style.display = 'block'; // Show placeholder again

   } finally {
     showStatus('auditStatus', '', false); // Ensure status is always hidden at the end
     if (auditButton) auditButton.disabled = false; // Re-enable button
   }
 }

// Displays the dashboard view with scores and charts
function displayAuditDashboard(data) {
  if (!data) {
      showError("No audit data to display.", "warning");
      document.getElementById('initialPlaceholder').style.display = 'block';
      document.getElementById('dashboardContainer').style.display = 'none';
      return;
  }
  document.getElementById('initialPlaceholder').style.display = 'none';
  const dashboardContainer = document.getElementById('dashboardContainer');
  dashboardContainer.style.display = 'block';
  document.getElementById('auditReportContent').style.display = 'none'; // Ensure report view is hidden initially
  document.getElementById('resultsTitle').textContent = `📊 Audit Dashboard`; // Reset title


  // --- Populate Stat Cards ---
  // FIX: Use nullish coalescing for safer defaults
  document.getElementById('overallScore').textContent = data.overallScore?.toFixed(0) ?? '--';
  document.getElementById('healthStatus').textContent = data.health ?? 'Unknown';
  document.getElementById('errorCount').textContent = data.issues?.errors ?? '0';
  document.getElementById('warningCount').textContent = data.issues?.warnings ?? '0';

  // Apply score class to overall score badge visual
  const healthBadge = document.getElementById('healthStatus');
  if (healthBadge) {
     healthBadge.className = `stat-badge badge-${(data.health || 'unknown').toLowerCase()}`; // Use health string directly for class
     healthBadge.textContent = data.health ?? 'Unknown';
  }

  // --- Populate Detailed Scores Grid ---
  const detailedScoresGrid = document.getElementById('detailedScoresGrid');
  if (detailedScoresGrid && data.scores) {
      detailedScoresGrid.innerHTML = ''; // Clear previous grid items
      Object.entries(data.scores).forEach(([key, value]) => {
          const scoreItem = document.createElement('div');
          scoreItem.className = 'score-item';
          // Scale 0-10 score to 0-100 for getScoreClass utility
          const scoreClass = getScoreClass((value ?? 0) * 10);
          scoreItem.innerHTML = `
              <div class="score-header">
                  <span>${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</span>
                  <span class="score-value">${value?.toFixed(1) ?? '--'} / 10</span>
              </div>
              <div class="score-bar-container">
                  <div class="score-bar score-bar-${scoreClass}" style="width: ${Math.max(0, Math.min(100, (value ?? 0) * 10))}%;" title="Score: ${value?.toFixed(1) ?? '--'}"></div>
              </div>
          `;
          detailedScoresGrid.appendChild(scoreItem);
      });
  } else if (detailedScoresGrid) {
       detailedScoresGrid.innerHTML = '<p>Detailed scores unavailable.</p>';
  }

  // --- Chart.js Integration ---
  // Health Donut Chart
  const healthChartCtx = document.getElementById('healthChart')?.getContext('2d');
  if (healthChartCtx && window.Chart && data.issues) {
      // Destroy previous chart instance if it exists
      if (AppState.charts.healthChart instanceof Chart) AppState.charts.healthChart.destroy();
      const totalIssues = (data.issues.errors ?? 0) + (data.issues.warnings ?? 0);
      AppState.charts.healthChart = new Chart(healthChartCtx, {
          type: 'doughnut',
          data: {
              labels: ['Errors', 'Warnings', 'Good'],
              datasets: [{
                  data: [
                      data.issues.errors ?? 0,
                      data.issues.warnings ?? 0,
                      Math.max(0, 100 - totalIssues*5) // Rough estimate for 'Good' part, assuming max ~20 issues = 0 good
                  ],
                  backgroundColor: ['var(--error)', 'var(--warning)', 'var(--success)'],
                  borderWidth: 0
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '70%',
              plugins: {
                  legend: { display: false },
                  tooltip: { enabled: false } // Disable tooltips for this simple chart
              }
          }
      });
  }

  // Issue Breakdown Bar Chart
  const issueChartCtx = document.getElementById('issueChart')?.getContext('2d');
    if (issueChartCtx && window.Chart && data.scores) {
        // Destroy previous chart instance if it exists
        if (AppState.charts.issueChart instanceof Chart) AppState.charts.issueChart.destroy();
        AppState.charts.issueChart = new Chart(issueChartCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(data.scores).map(k => k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1')), // Format labels
                datasets: [{
                    label: 'Score (0-10)',
                    data: Object.values(data.scores),
                    backgroundColor: Object.values(data.scores).map(s => {
                        const scoreClass = getScoreClass((s ?? 0) * 10);
                        if (scoreClass === 'excellent') return 'var(--success)';
                        if (scoreClass === 'good') return 'var(--accent)';
                        if (scoreClass === 'fair') return 'var(--warning)';
                        return 'var(--error)';
                    }),
                    borderRadius: 4,
                    borderSkipped: false, // Ensure radius applies correctly
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allow non-square aspect ratio
                indexAxis: 'y', // Horizontal bars for better readability
                plugins: {
                    legend: { display: false }, // No legend needed for single dataset
                     tooltip: { // Customize tooltips
                         callbacks: {
                            label: (context) => ` Score: ${context.parsed.x?.toFixed(1) ?? '--'} / 10`
                         }
                    }
                },
                scales: {
                     x: { // Value axis (now horizontal)
                        beginAtZero: true,
                        max: 10,
                        grid: { color: 'var(--border)' },
                        ticks: { color: 'var(--text-secondary)', stepSize: 2 }
                    },
                    y: { // Category axis (now vertical)
                         grid: { display: false }, // Cleaner look
                         ticks: { color: 'var(--text-primary)' }
                    }
                }
            }
        });
    }
  // --- End Chart.js ---

  setupReportToggleButton(); // Ensure toggle button works correctly
}

// Renders the Markdown report into the designated div
function displayAuditReport(markdownContent) {
   const reportContentDiv = document.getElementById('auditReportContent');
   if (reportContentDiv) {
       // Use the 'marked' parser (defined in utils/core)
       reportContentDiv.innerHTML = marked.parse(markdownContent || "<p>No detailed report available.</p>");
   } else {
       console.error("Audit report content element ('auditReportContent') not found in HTML.");
   }
}

// Sets up the event listener for the dashboard/report toggle button
function setupReportToggleButton() {
   const toggleButton = document.getElementById('toggleReportButton');
   const dashboardContainer = document.getElementById('dashboardContainer');
   const auditReportContent = document.getElementById('auditReportContent');
   if (!toggleButton || !dashboardContainer || !auditReportContent) {
       console.warn("Could not find elements required for report toggle button setup.");
       return;
   }

   // FIX: Clone and replace the button to remove previous listeners reliably
   const newButton = toggleButton.cloneNode(true);
   toggleButton.parentNode.replaceChild(newButton, toggleButton);

   newButton.addEventListener('click', () => {
       const isReportHidden = auditReportContent.style.display === 'none' || auditReportContent.style.display === '';
       if (isReportHidden) {
           // Show Report, Hide Dashboard
           auditReportContent.style.display = 'block';
           dashboardContainer.style.display = 'none';
           newButton.textContent = '📊 View Dashboard';
           document.getElementById('resultsTitle').textContent = '📄 Detailed Audit Report';
       } else {
           // Show Dashboard, Hide Report
           auditReportContent.style.display = 'none';
           dashboardContainer.style.display = 'block';
           newButton.textContent = '📄 View Detailed Report';
           document.getElementById('resultsTitle').textContent = '📊 Audit Dashboard';
       }
   });

    // Set initial button text based on the dashboard's initial display state
    const isDashboardVisibleInitially = dashboardContainer.style.display === 'block';
    if (isDashboardVisibleInitially) {
        newButton.textContent = '📄 View Detailed Report';
    } else {
        newButton.textContent = '📊 View Dashboard';
    }
}


console.log('✅ Auditor module definitions loaded');
// Expose functions globally if they need to be called from elsewhere (like history module)
window.runAudit = runAudit;
window.displayAuditDashboard = displayAuditDashboard;
window.displayAuditReport = displayAuditReport; // Expose report rendering