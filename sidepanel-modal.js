// ============================================
// MODAL MODULE
// ============================================

function initializeModal() {
  document.getElementById('settingsBtn')?.addEventListener('click', openSettings);
  document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
  document.getElementById('cancelSettingsButton')?.addEventListener('click', closeModal);
  document.getElementById('saveSettingsButton')?.addEventListener('click', saveSettingsFromModal);
}

function openSettings() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  content.innerHTML = `
    <div class="settings-form">
      <h3>🤖 AI Configuration</h3>
      <label><input type="checkbox" id="aiEnabled" ${AppState.settings?.aiEnabled ? 'checked' : ''}> Enable AI</label>
      <h3>🎨 Display</h3>
      <label><input type="checkbox" id="darkMode" ${AppState.settings?.darkMode ? 'checked' : ''}> Dark Mode</label>
      <label><input type="checkbox" id="animations" ${AppState.settings?.animations ? 'checked' : ''}> Animations</label>
    </div>
  `;
  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

async function saveSettingsFromModal() {
  AppState.settings = {
    aiEnabled: document.getElementById('aiEnabled')?.checked ?? true,
    darkMode: document.getElementById('darkMode')?.checked ?? true,
    animations: document.getElementById('animations')?.checked ?? true,
    autoGroup: false,
    maxHistory: 100,
    screenshotQuality: 0.7
  };
  
  // Use the core saveSettings function
  await saveSettings();
  closeModal();
  
  // Apply settings immediately
  if (AppState.settings.darkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  
  showSuccess('Settings saved!');
}

console.log('✅ Modal module loaded');
