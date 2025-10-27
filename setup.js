/**
 * Setup page - Check AI availability and guide users
 */

document.addEventListener('DOMContentLoaded', () => {
  const aiStatusCheck = document.getElementById('aiStatusCheck');

  async function checkAIAvailability() {
    aiStatusCheck.innerHTML = '<div class="loader"></div><p>Checking AI availability...</p>';

    // Check if API exists
    if (typeof globalThis.ai === 'undefined' ||
        typeof globalThis.ai.languageModel === 'undefined') {
      aiStatusCheck.classList.remove('success');
      aiStatusCheck.classList.add('error');
      aiStatusCheck.innerHTML = `
        <h3>❌ Chrome AI API Not Available</h3>
        <p>The Prompt API (Gemini Nano) is not detected.</p>
        <h4>Required Steps:</h4>
        <ol>
          <li><strong>Chrome Version:</strong> Ensure you're using Chrome 127 or higher (Dev/Canary recommended)</li>
          <li><strong>Enable Flags:</strong> Navigate to <code>chrome://flags</code> and enable:
            <ul>
              <li><code>#prompt-api-for-gemini-nano</code> → <strong>Enabled</strong></li>
              <li><code>#optimization-guide-on-device-model</code> → <strong>Enabled BypassPerfRequirement</strong></li>
            </ul>
          </li>
          <li><strong>Restart Chrome</strong> completely after enabling flags</li>
        </ol>
        <p><a href="chrome://flags" target="_blank">Open chrome://flags</a></p>
      `;
      return;
    }

    try {
      // Check availability status
      const availability = await globalThis.ai.languageModel.availability();

      if (availability === 'readily') {
        // Model is ready
        aiStatusCheck.classList.remove('error');
        aiStatusCheck.classList.add('success');
        aiStatusCheck.innerHTML = `
          <h3>✅ Chrome AI API Available!</h3>
          <p><strong>Status:</strong> Gemini Nano is ready to use</p>
          <p>All AI features are fully functional. You can start using Spectrum AI Pro Enhanced.</p>
        `;

        // Get model parameters
        try {
          const params = await globalThis.ai.languageModel.params();
          aiStatusCheck.innerHTML += `
            <h4>Model Parameters:</h4>
            <ul>
              <li>Temperature: ${params.defaultTemperature} (max: ${params.maxTemperature})</li>
              <li>Top-K: ${params.defaultTopK} (max: ${params.maxTopK})</li>
            </ul>
          `;
        } catch (paramError) {
          console.error('Error getting params:', paramError);
        }

      } else if (availability === 'after-download') {
        // Model needs download
        aiStatusCheck.classList.remove('error');
        aiStatusCheck.classList.add('success');
        aiStatusCheck.innerHTML = `
          <h3>⏳ Chrome AI API Available (Download Required)</h3>
          <p><strong>Status:</strong> Gemini Nano needs to be downloaded (~1.5GB)</p>
          <p>The model will automatically download when you first use an AI feature.</p>
          <p><strong>Note:</strong> Requires user interaction (click) and may take 5-10 minutes depending on connection speed.</p>
        `;

      } else {
        // Not available
        aiStatusCheck.classList.remove('success');
        aiStatusCheck.classList.add('error');
        aiStatusCheck.innerHTML = `
          <h3>⚠️ Chrome AI API Status: ${availability}</h3>
          <p>The Prompt API is detected but not available on this device.</p>
          <h4>Troubleshooting:</h4>
          <ol>
            <li>Ensure Chrome flags are enabled (see above)</li>
            <li>Restart Chrome completely</li>
            <li>Check device compatibility (requires modern hardware)</li>
            <li>Try Chrome Dev or Canary for better support</li>
          </ol>
          <p><a href="https://developer.chrome.com/docs/ai/built-in" target="_blank">Learn more about Chrome AI requirements</a></p>
        `;
      }

    } catch (error) {
      aiStatusCheck.classList.remove('success');
      aiStatusCheck.classList.add('error');
      aiStatusCheck.innerHTML = `
        <h3>❌ Error Checking AI Availability</h3>
        <p><strong>Error:</strong> ${error.message}</p>
        <p>Please ensure Chrome flags are enabled and restart your browser.</p>
        <p><a href="chrome://flags" target="_blank">Open chrome://flags</a></p>
      `;
    }
  }

  checkAIAvailability();
});
