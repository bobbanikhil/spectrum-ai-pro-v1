// ============================================
// SPECTRUM AI PRO ENHANCED v3.1
// History Module - Audit History Management
// ============================================
// ============================================
// HISTORY MODULE
// ============================================

console.log('✅ History module loaded');


function initializeHistory() {
  const searchInput = document.getElementById('historySearchInput');
  const exportBtn = document.getElementById('exportHistoryButton');
  const importBtn = document.getElementById('importHistoryButton');
  const clearBtn = document.getElementById('clearHistoryButton');

  searchInput?.addEventListener('input', (e) => filterHistory(e.target.value));
  exportBtn?.addEventListener('click', exportHistory);
  importBtn?.addEventListener('click', () => document.getElementById('importFileInput')?.click());
  clearBtn?.addEventListener('click', clearAllHistory);

  // File input for import
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'importFileInput';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', handleHistoryImport);
  document.body.appendChild(fileInput);

  // Load history on initialization
  loadHistory();
}

async function loadHistory() {
  try {
    const result = await chrome.storage.local.get('auditHistory');
    const history = result.auditHistory || [];

    displayHistory(history);
  } catch (error) {
    console.error('Load history error:', error);
    showError('Failed to load history');
  }
}

function displayHistory(history) {
  const resultsDiv = document.getElementById('historyResults');
  if (!resultsDiv) return;

  if (history.length === 0) {
    resultsDiv.innerHTML = '<p class="placeholder">No audit history yet. Run an audit to get started!</p>';
    return;
  }

  resultsDiv.innerHTML = `
    <div class="history-list">
      ${history.map((item, index) => `
        <div class="history-item" data-index="${index}" data-id="${item.id}">
          <div class="history-header">
            <div class="history-info">
              <h4 class="history-url">${getHostname(item.url)}</h4>
              <span class="history-date">${formatDate(item.date)}</span>
            </div>
            <div class="history-score ${getScoreClass(item.data?.overall || 0)}">
              ${item.data?.overall || 'N/A'}
            </div>
          </div>
          <div class="history-meta">
            <span class="history-stat">
              <span class="stat-label">Health:</span>
              <span class="stat-value">${item.data?.health || 'N/A'}</span>
            </span>
            <span class="history-stat">
              <span class="stat-label">Issues:</span>
              <span class="stat-value">${(item.data?.errors || 0) + (item.data?.warnings || 0)}</span>
            </span>
          </div>
          <div class="history-actions">
            <button class="btn btn-sm view-history-btn" data-index="${index}">
              👁️ View Report
            </button>
            <button class="btn btn-sm delete-history-btn" data-id="${item.id}">
              🗑️ Delete
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Add event listeners
  document.querySelectorAll('.view-history-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      loadHistoryReport(history[index]);
    });
  });

  document.querySelectorAll('.delete-history-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = parseInt(e.target.dataset.id);
      await deleteHistoryItem(id);
    });
  });
}

async function filterHistory(searchTerm) {
  try {
    const result = await chrome.storage.local.get('auditHistory');
    const history = result.auditHistory || [];

    if (!searchTerm.trim()) {
      displayHistory(history);
      return;
    }

    const filtered = history.filter(item => {
      const url = item.url.toLowerCase();
      const hostname = getHostname(item.url).toLowerCase();
      const search = searchTerm.toLowerCase();
      return url.includes(search) || hostname.includes(search);
    });

    displayHistory(filtered);
  } catch (error) {
    console.error('Filter history error:', error);
  }
}

async function loadHistoryReport(historyItem) {
  try {
    // Switch to auditor tab
    const auditorTab = document.querySelector('.tab-link[data-tab="auditor"]');
    if (auditorTab) {
      auditorTab.click();
    }

    // Load data into AppState
    AppState.auditData = historyItem.data;
    AppState.auditReport = historyItem.report;

    // Display the dashboard
    displayAuditDashboard(historyItem.data);

    // Show success message
    showSuccess('Historical report loaded successfully!');
  } catch (error) {
    console.error('Load history report error:', error);
    showError('Failed to load report');
  }
}

async function deleteHistoryItem(itemId) {
  if (!confirm('Are you sure you want to delete this audit report?')) {
    return;
  }

  try {
    const result = await chrome.storage.local.get('auditHistory');
    const history = result.auditHistory || [];

    const updatedHistory = history.filter(item => item.id !== itemId);

    await chrome.storage.local.set({ auditHistory: updatedHistory });

    // Reload display
    displayHistory(updatedHistory);

    showSuccess('Report deleted successfully');
  } catch (error) {
    console.error('Delete history error:', error);
    showError('Failed to delete report');
  }
}

async function clearAllHistory() {
  if (!confirm('Are you sure you want to delete ALL audit history? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.set({ auditHistory: [] });

    // Clear display
    displayHistory([]);

    showSuccess('All history cleared');
  } catch (error) {
    console.error('Clear history error:', error);
    showError('Failed to clear history');
  }
}

async function exportHistory() {
  try {
    const result = await chrome.storage.local.get('auditHistory');
    const history = result.auditHistory || [];

    if (history.length === 0) {
      showError('No history to export');
      return;
    }

    const exportData = {
      version: '3.1',
      exportDate: new Date().toISOString(),
      totalReports: history.length,
      reports: history
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `spectrum-ai-history-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);

    showSuccess(`Exported ${history.length} audit reports`);
  } catch (error) {
    console.error('Export history error:', error);
    showError('Failed to export history');
  }
}

async function handleHistoryImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const importData = JSON.parse(text);

    // Validate format
    if (!importData.reports || !Array.isArray(importData.reports)) {
      throw new Error('Invalid history file format');
    }

    // Get existing history
    const result = await chrome.storage.local.get('auditHistory');
    const existingHistory = result.auditHistory || [];

    // Merge histories (avoid duplicates by ID)
    const existingIds = new Set(existingHistory.map(item => item.id));
    const newReports = importData.reports.filter(item => !existingIds.has(item.id));

    const mergedHistory = [...existingHistory, ...newReports];

    // Respect max history limit
    const maxHistory = AppState.settings?.maxHistory || 100;
    if (mergedHistory.length > maxHistory) {
      mergedHistory.length = maxHistory;
    }

    // Save merged history
    await chrome.storage.local.set({ auditHistory: mergedHistory });

    // Reload display
    displayHistory(mergedHistory);

    showSuccess(`Imported ${newReports.length} new audit reports`);
  } catch (error) {
    console.error('Import history error:', error);
    showError('Failed to import history: ' + error.message);
  } finally {
    // Reset file input
    event.target.value = '';
  }
}

// Helper functions
function getHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return url;
  }
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    return dateString;
  }
}

function getScoreClass(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}