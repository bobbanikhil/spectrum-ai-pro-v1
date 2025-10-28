// ============================================
// SPECTRUM AI PRO ENHANCED v3.2.2
// Auditor Module (FIXED)
// ============================================

console.log('🎯 Loading Auditor module...');

function initializeAuditor() {
  const auditButton = document.getElementById('auditButton');
  if (auditButton) {
    auditButton.addEventListener('click', runAudit);
    console.log('[AUDITOR] Button listener attached');
  }
}

async function runAudit() {
  const auditButton = document.getElementById('auditButton');

  try {
    console.log('[AUDIT] Starting audit...');
    showStatus('auditStatus', 'Starting audit...', true);
    if (auditButton) auditButton.disabled = true;

    // 1. Get current tab
    const tab = await getCurrentTab();
    if (!tab || !tab.url || !tab.url.startsWith('http')) {
      throw new Error('Please navigate to a valid web page (http/https) to run an audit.');
    }
    console.log('[AUDIT] Analyzing:', tab.url);

    // 2. Check AI availability
    if (!aiManager || aiManager.isAvailable === 'no') {
      throw new Error('AI is not available. Please enable Chrome AI flags and restart Chrome.');
    }

    // 3. Get page content
    showStatus('auditStatus', 'Fetching page content...', true);
    const content = await getTabContent(tab.id);

    if (!content || !content.text) {
      throw new Error('Could not retrieve page content. The page might be protected.');
    }
    console.log('[AUDIT] Content length:', content.text.length);

    // 4. Create AI session and prompt
    showStatus('auditStatus', 'Analyzing with Gemini Nano...', true);

    await aiManager.createSession(); // Ensure session exists

    const prompt = `Analyze this web page for a comprehensive 12-point audit.

Page: "${content.title}"
Content (first 8000 chars):
${content.text.substring(0, 8000)}

Respond with ONLY a valid JSON object in this exact format:
{
  "dashboard": {
    "overallScore": 85,
    "health": "Good",
    "issues": {
      "errors": 3,
      "warnings": 8
    },
    "scores": {
      "technical": 8.5,
      "accessibility": 7.2,
      "performance": 9.0,
      "security": 8.0,
      "ux": 7.5,
      "content": 8.5,
      "seo": 7.0,
      "links": 8.0,
      "conversion": 7.5,
      "analytics": 6.0,
      "competitive": 7.0,
      "mobile": 8.5
    }
  },
  "markdownReport": "# Website Audit Report\\n\\n## Technical (8.5/10)\\n**Assessment:** ...\\n\\n**Issues:** ...\\n\\n**Recommendations:** ..."
}

Generate realistic scores and a detailed markdown report with sections for all 12 categories.`;

    const responseText = await aiManager.prompt(prompt);
    console.log('[AUDIT] AI response received');

    // 5. Parse response
    let auditResult;
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      auditResult = JSON.parse(jsonMatch[0]);

      if (!auditResult.dashboard || !auditResult.markdownReport) {
        throw new Error('Invalid audit format - missing required fields');
      }

      console.log('[AUDIT] Parsed successfully');
    } catch (parseError) {
      console.error('[AUDIT] Parse error:', parseError);
      console.error('[AUDIT] Response was:', responseText);
      throw new Error(`Could not parse AI response: ${parseError.message}`);
    }

    // 6. Save and display results
    AppState.auditData = auditResult.dashboard;
    AppState.auditReport = auditResult.markdownReport;

    displayAuditDashboard(auditResult.dashboard);
    displayAuditReport(auditResult.markdownReport);

    // 7. Save to history
    await saveAuditToHistory(tab.url, auditResult);

    showSuccess('✅ Audit completed successfully!');
    console.log('[AUDIT] Complete');

  } catch (error) {
    console.error('[AUDIT] Error:', error);
    showError(`Audit failed: ${error.message}`, 'error');

    // Show error in results
    const resultsDiv = document.getElementById('auditorResults');
    if (resultsDiv) {
      resultsDiv.innerHTML = `
        <div class="placeholder error">
          <div class="placeholder-icon">⚠️</div>
          <h2>Audit Failed</h2>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
      resultsDiv.style.display = 'block';
    }
  } finally {
    showStatus('auditStatus', '', false);
    if (auditButton) auditButton.disabled = false;
  }
}

function displayAuditDashboard(data) {
  console.log('[AUDIT] Displaying dashboard');

  const resultsDiv = document.getElementById('auditorResults');
  if (!resultsDiv) return;

  const healthClass = getScoreClass(data.overallScore);

  const html = `
    <div class="dashboard-container">
      <div class="dashboard-stats">
        <div class="stat-card">
          <div class="stat-label">Overall Score</div>
          <div class="stat-value">${data.overallScore}/100</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Health Status</div>
          <div class="stat-badge badge-${healthClass}">${data.health}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Errors</div>
          <div class="stat-value error">${data.issues?.errors || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Warnings</div>
          <div class="stat-value warning">${data.issues?.warnings || 0}</div>
        </div>
      </div>

      <div class="scores-section">
        <h3>Detailed Scores</h3>
        <div class="score-grid">
          ${Object.entries(data.scores || {}).map(([category, score]) => `
            <div class="score-item">
              <div class="score-header">
                <span>${capitalize(category)}</span>
                <span class="score-value">${score.toFixed(1)}/10</span>
              </div>
              <div class="score-bar-container">
                <div class="score-bar score-bar-${getScoreClass(score * 10)}"
                     style="width: ${score * 10}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <button id="toggleReportBtn" class="toggle-report-btn">
        📄 View Detailed Report
      </button>
    </div>
  `;

  resultsDiv.innerHTML = html;
  resultsDiv.style.display = 'block';

  // Show dashboard
  const dashboardContainer = document.getElementById('dashboardContainer');
  if (dashboardContainer) {
    dashboardContainer.style.display = 'block';
  }

  // Add toggle button listener
  const toggleBtn = document.getElementById('toggleReportBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const reportContainer = document.getElementById('auditReportContainer');
      if (reportContainer) {
        const isVisible = reportContainer.style.display !== 'none';
        reportContainer.style.display = isVisible ? 'none' : 'block';
        toggleBtn.textContent = isVisible ? '📄 View Detailed Report' : '📄 Hide Detailed Report';
      }
    });
  }
}

function displayAuditReport(markdownReport) {
  console.log('[AUDIT] Displaying report');

  const resultsDiv = document.getElementById('auditorResults');
  if (!resultsDiv) return;

  // Create report container if it doesn't exist
  let reportContainer = document.getElementById('auditReportContainer');
  if (!reportContainer) {
    reportContainer = document.createElement('div');
    reportContainer.id = 'auditReportContainer';
    reportContainer.style.display = 'none';
    resultsDiv.appendChild(reportContainer);
  }

  // Convert markdown to HTML (simple implementation)
  const htmlReport = marked.parse(markdownReport);

  reportContainer.innerHTML = `
    <div class="results-wrapper">
      ${htmlReport}
    </div>
  `;
}

async function saveAuditToHistory(url, auditResult) {
  try {
    const result = await chrome.storage.local.get('auditHistory');
    let history = result.auditHistory || [];

    const historyItem = {
      id: Date.now(),
      url: url,
      date: new Date().toISOString(),
      data: auditResult.dashboard,
      report: auditResult.markdownReport
    };

    history.unshift(historyItem);

    // Respect max history limit
    const maxHistory = AppState.settings?.maxHistory || 100;
    if (history.length > maxHistory) {
      history = history.slice(0, maxHistory);
    }

    await chrome.storage.local.set({ auditHistory: history });
    console.log('[AUDIT] Saved to history');
  } catch (error) {
    console.error('[AUDIT] Save history error:', error);
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Export for global use
window.initializeAuditor = initializeAuditor;
window.runAudit = runAudit;

console.log('✅ Auditor module loaded');