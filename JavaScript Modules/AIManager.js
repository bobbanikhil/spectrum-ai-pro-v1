/**
 * AIManager - Production v6.0
 * Uses Chrome's built-in Prompt API with Gemini Nano
 * Updated for Chrome 127+ (No Origin Trial Required)
 */

class AIManager {
  constructor() {
    this.session = null;
    // FIX: More specific availability statuses
    this.availability = 'unknown'; // 'unknown', 'unavailable', 'downloadable', 'downloading', 'readily'
    this.modelCheckPromise = null; // To prevent multiple checks running concurrently
  }

  /**
   * Check if AI is available using the new API
   * @returns {Promise<string>} 'readily', 'after-download', 'downloading', 'unavailable'
   */
  async checkAvailability() {
    // Check if the API structure exists
    if (typeof globalThis.ai === 'undefined' || typeof globalThis.ai.languageModel === 'undefined') {
      console.warn('⚠️ AI API (globalThis.ai.languageModel) not found. Check manifest permission or Chrome version (127+).');
      this.availability = 'unavailable'; // FIX: Consistent 'unavailable' status
      return 'unavailable';
    }
    try {
      // Call the official availability function
      const availability = await globalThis.ai.languageModel.availability();
      this.availability = availability;
      console.log(`✅ AI Model availability: ${availability}`);
      return availability;
    } catch (error) {
      console.error('❌ Error checking AI availability:', error);
      this.availability = 'unavailable'; // FIX: Consistent 'unavailable' status
      return 'unavailable';
    }
  }

  /**
   * Initialize AI Manager and update UI banner
   * @returns {Promise<boolean>} true if readily available
   */
  async initialize() {
    // Only run the check once if multiple calls happen quickly
    if (!this.modelCheckPromise) {
        this.modelCheckPromise = this.checkAvailability();
    }
    const availability = await this.modelCheckPromise;
    this.modelCheckPromise = null; // Reset promise after check completes

    const banner = document.getElementById('aiWarningBanner');
    const bannerText = document.getElementById('aiWarningText'); // Assuming text span

    // FIX: Ensure banner elements exist before trying to modify them
    if (!banner || !bannerText) {
        console.warn("AI warning banner elements not found in HTML.");
        // Attempt to proceed, but banner won't work
    }

    switch (availability) {
      case 'readily':
        console.log('✅ AI Model is readily available.');
        if (banner) banner.style.display = 'none'; // Hide banner if ready
        return true;
      case 'downloadable': // FIX: Correct status name from downloadable
        console.log('📥 AI model needs download. Will be triggered on first use.');
        if (banner) banner.style.display = 'flex';
        if (banner) banner.className = 'status-message warning'; // Ensure correct class
        if(bannerText) bannerText.textContent = '⏳ AI Model needs download. Click an AI feature to start.';
        // Don't show an error toast here, it's expected
        return false; // Not ready yet
      case 'downloading': // FIX: Added handling for downloading status
        console.log('⏳ AI model is downloading...');
        if (banner) banner.style.display = 'flex';
        if (banner) banner.className = 'status-message warning';
        if(bannerText) bannerText.textContent = 'AI Model is downloading...';
        // FIX: Show status in relevant sections using utility function
        if (typeof showStatus === 'function') {
            showStatus('auditorStatus', 'AI Model downloading...', true);
            showStatus('organizerStatus', 'AI Model downloading...', true);
            showStatus('scribeStatus', 'AI Model downloading...', true);
         }
        return false; // Not ready yet
      case 'unavailable': // FIX: Use 'unavailable' consistently
      default:
        console.warn('⚠️ AI model unavailable on this device.');
        if (banner) banner.style.display = 'flex';
        if (banner) banner.className = 'status-message error'; // FIX: Ensure error class
        if(bannerText) bannerText.textContent = '❌ On-Device AI unavailable. Check flags & Chrome version (See Setup page).';
        // FIX: Use showError utility function for consistency
        if (typeof showError === 'function') {
          showError('On-Device AI unavailable. Ensure Chrome 127+, flags enabled, and compatible hardware.', 'warning');
        }
        return false;
    }
  }

  /**
   * Get AI model parameters
   * @returns {Promise<Object>} Model parameters
   */
  async getParams() {
    if (typeof globalThis.ai === 'undefined' || typeof globalThis.ai.languageModel === 'undefined') {
      throw new Error('AI API not available');
    }

    try {
      const params = await globalThis.ai.languageModel.params();
      console.log('📊 AI Model Parameters:', params);
      return params;
    } catch (error) {
      console.error('Error getting AI params:', error);
      // FIX: Provide reasonable defaults if params() fails
      return {
        defaultTopK: 3,
        maxTopK: 128,
        defaultTemperature: 0.7, // Slightly adjusted default
        maxTemperature: 2
      };
    }
  }

  /**
   * Create AI session with download monitoring
   * @param {Object} options - Session options { systemPrompt?, temperature?, topK? }
   * @returns {Promise<Object>} AI session
   */
  async createSession(options = {}) {
    // Return existing session if readily available
    if (this.session && this.availability === 'readily') {
      return this.session;
    }

    // Ensure availability is checked if it hasn't been yet or if session failed previously
    const availability = (this.availability === 'unknown' || this.availability === 'unavailable')
      ? await this.checkAvailability()
      : this.availability;

    // FIX: Throw specific error if unavailable after check
    if (availability === 'unavailable') {
      // Error message is shown by initialize(), just throw
      throw new Error('AI model is not available.');
    }

    // If downloadable or downloading, show status and proceed to trigger creation/download
    if (availability === 'downloadable' || availability === 'downloading') {
       // FIX: Show status using utility function
       if (typeof showStatus === 'function') {
          const msg = availability === 'downloading'
            ? 'AI Model download in progress...'
            : 'Initializing AI Model (downloading may take time)...';
          showStatus('auditorStatus', msg, true);
          showStatus('organizerStatus', msg, true); // Show on other tabs too
          showStatus('scribeStatus', msg, true);
       }
       console.log("Attempting to trigger AI model download/creation...");
    }

    try {
      // Get model parameters for defaults
      const params = await this.getParams();

      // Create session, attaching monitor for download progress
      this.session = await globalThis.ai.languageModel.create({
        // FIX: Allow overriding system prompt via options
        systemPrompt: options.systemPrompt ||
          'You are a helpful AI assistant specialized in web analysis, tab organization, and workflow documentation. Provide clear, actionable, and concise responses in Markdown format where appropriate.',
        // FIX: Use nullish coalescing for temperature and topK
        temperature: options.temperature ?? params.defaultTemperature,
        topK: options.topK ?? params.defaultTopK,
        // Add monitor for download progress
        monitor: (m) => {
          m.addEventListener('downloadprogress', (e) => {
            // FIX: Check if total is known to avoid NaN%
            if (!e.total) return;
            const progress = Math.round((e.loaded / e.total) * 100);
            console.log(`📥 AI Model Download Progress: ${progress}%`);
            const msg = `Downloading AI Model: ${progress}%...`;
            // Update status on all relevant tabs
            if (typeof showStatus === 'function') {
                showStatus('auditorStatus', msg, true);
                showStatus('organizerStatus', msg, true);
                showStatus('scribeStatus', msg, true);
            }
          });
          // FIX: Added listeners for completion and errors
           m.addEventListener('downloadcomplete', () => {
             console.log('✅ AI Model Download Complete!');
             this.availability = 'readily'; // Update status immediately
             if (typeof showSuccess === 'function') showSuccess('AI Model Downloaded!');
             if (typeof showStatus === 'function') { // Clear status messages
                  showStatus('auditorStatus', '', false);
                  showStatus('organizerStatus', '', false);
                  showStatus('scribeStatus', '', false);
             }
             const banner = document.getElementById('aiWarningBanner');
             if (banner) banner.style.display = 'none'; // Hide banner on success
          });
          m.addEventListener('downloaderror', (e) => {
              console.error('❌ AI Model Download Error:', e);
              this.availability = 'unavailable'; // Set as unavailable on download error
              this.session = null; // Ensure session is nullified
               if (typeof showError === 'function') showError('Failed to download AI Model. Check network and storage.', 'error');
                if (typeof showStatus === 'function') { // Clear status messages
                  showStatus('auditorStatus', '', false);
                  showStatus('organizerStatus', '', false);
                  showStatus('scribeStatus', '', false);
               }
          });
        }
      });

      this.availability = 'readily'; // Update status after successful creation
      console.log('✅ AI Session created successfully');

      // FIX: Clear status messages only if not already cleared by downloadcomplete
       if (typeof showStatus === 'function' && availability !== 'downloading' && availability !== 'downloadable') {
        showStatus('auditorStatus', '', false);
        showStatus('organizerStatus', '', false);
        showStatus('scribeStatus', '', false);
      }
      // FIX: Hide banner only if not already hidden by downloadcomplete
      if (this.availability === 'readily') {
         const banner = document.getElementById('aiWarningBanner');
         if (banner) banner.style.display = 'none';
         // Show success only if it wasn't a download trigger and now ready
         if (availability === 'readily' && typeof showSuccess === 'function') {
             showSuccess('AI Model Ready!');
         }
      }


      return this.session;

    } catch (error) {
      console.error('❌ Failed to create AI session:', error);
      this.availability = 'unavailable'; // FIX: Consistent status on error
      this.session = null; // Ensure session is null

      // Clear loading states
      if (typeof showStatus === 'function') {
        showStatus('auditorStatus', '', false);
        showStatus('organizerStatus', '', false);
        showStatus('scribeStatus', '', false);
      }
      // Show informative error message
      if (typeof showError === 'function') {
        showError(`AI Session Error: ${error.message}. Please check Chrome flags (see Setup page) and restart Chrome.`, 'error');
      }

      // Re-throw the error with a more user-friendly message
      throw new Error(`Could not create AI session: ${error.message}. Check flags & restart.`);
    }
  }

   /**
   * Send prompt and get complete response
   * @param {string} message - User prompt
   * @param {Object} options - Prompt options { context?: string, signal?: AbortSignal, sessionOptions?: object }
   * @returns {Promise<string>} AI response
   */
   async prompt(message, options = {}) {
    // FIX: Pass sessionOptions to createSession if provided
    const session = await this.createSession(options.sessionOptions);
    const context = options.context || ''; // Get context from options

    try {
      // FIX: Construct prompt array (allow context via sessionOptions or direct option)
      const prompts = [];
      // If a system prompt was used for session creation, don't add another here unless explicitly different context is needed
      // if (context && (!options.sessionOptions || !options.sessionOptions.systemPrompt)) {
      if (context) { // Simpler: always add context if provided as an option here
        prompts.push({ role: 'system', content: context });
      }
      prompts.push({ role: 'user', content: message });


      const response = await session.prompt(prompts, { // Pass prompt array
        signal: options.signal
      });

      console.log("✅ AI Prompt Response:", response);
      return response || 'AI did not generate a response.'; // Handle empty response

    } catch (error) {
      if (error.name === 'AbortError') { // Handle user cancellation
        console.log('⚠️ AI Prompt aborted by user');
        throw error;
      }
      console.error('❌ AI Prompt error:', error);
      if (typeof showError === 'function') {
        showError(`AI Request Failed: ${error.message}`, 'error');
      }
      throw error; // Re-throw for specific handling
    }
  }

  /**
   * Stream prompt with real-time chunks
   * @param {string} message - User prompt
   * @param {string} [context=''] - Optional system context for this prompt
   * @param {Function} [onChunk=null] - Callback function for each received chunk
   * @param {Object} [options={}] - Additional options { signal?: AbortSignal, sessionOptions?: object }
   * @returns {Promise<string>} Complete final response
   */
  async streamPrompt(message, context = '', onChunk = null, options = {}) {
    const session = await this.createSession(options.sessionOptions); // Ensures session exists

    try {
      // FIX: Construct prompt array similarly to prompt()
      const prompts = [];
      if (context) {
        prompts.push({ role: 'system', content: context });
      }
      prompts.push({ role: 'user', content: message });

      const stream = await session.promptStreaming(prompts, { // FIX: Pass prompt array
        signal: options.signal
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse = chunk; // In Chrome 127+, each chunk IS the cumulative response so far
        if (onChunk) {
             // FIX: Wrap onChunk call in try/catch to prevent its errors from stopping stream
             try { onChunk(chunk); } catch (chunkError) { console.error("Error in onChunk callback:", chunkError); }
        }
      }

      console.log('✅ AI Streaming completed. Final response length:', fullResponse.length);
      return fullResponse;

    } catch (error) {
      if (error.name === 'AbortError') { // Handle user cancellation
        console.log('⚠️ AI Stream aborted by user');
        throw error;
      }
      console.error('❌ AI Streaming error:', error);
      if (typeof showError === 'function') {
        showError(`AI Streaming Failed: ${error.message}`, 'error');
      }
      throw error; // Re-throw
    }
  }

  /**
   * Clone current session (preserves system prompt, resets context)
   * @returns {Promise<Object>} Cloned session
   */
  async cloneSession() {
    // FIX: Ensure session exists before trying to clone
    const session = await this.createSession();
    if (!session) { // createSession throws if unavailable, but double-check
      throw new Error('Cannot clone: AI session is not available.');
    }

    try {
      const cloned = await session.clone();
      console.log('✅ Session cloned');
      return cloned;
    } catch (error) {
      console.error('❌ Error cloning session:', error);
      throw error;
    }
  }

  /**
   * Get current session usage (Note: Chrome 127+ API doesn't expose usage yet)
   * @returns {Object} Placeholder usage stats
   */
  getUsage() {
    // The Chrome 127+ API currently doesn't provide inputUsage/inputQuota.
    // Return placeholder values.
    console.warn("AI session usage information is not available with the current Chrome API.");
    return {
      inputUsage: 0,
      inputQuota: 0,
      percentUsed: 0
    };
  }

  /**
   * Destroy current session and free resources
   */
  destroy() {
    if (this.session) {
      try {
        this.session.destroy();
        console.log('✅ AI Session destroyed');
      } catch (error) {
        console.error('Error destroying AI session:', error);
      } finally {
        this.session = null;
        this.availability = 'unknown'; // Reset status
      }
    }
  }
}

// Export for global use if needed (e.g., in setup.js)
if (typeof window !== 'undefined') {
  window.AIManager = AIManager;
}