
// ============================================
// SPECTRUM AI PRO ENHANCED v3.2 - MOCK AI
// ============================================

class MockAIManager {
  constructor() {
    this.isAvailable = true;
  }

  async initialize() {
    console.log('🤖 Using Mock AI Manager');
    return true;
  }

  async createSession() {
    console.log('🤖 Mock AI Session Created');
    return true;
  }

  async prompt(message, context = '') {
    console.log('🤖 Mock AI Prompt:', message);
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('This is a mock AI response. The real AI is not available.');
      }, 500);
    });
  }

  async streamPrompt(message, context = '', onChunk) {
    console.log('🤖 Mock AI Stream Prompt:', message);
    const response = 'This is a mock AI streaming response. The real AI is not available.';
    const chunks = response.split(' ');
    
    let fullResponse = '';
    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 100));
      fullResponse += chunk + ' ';
      if (onChunk) {
        onChunk(fullResponse.trim());
      }
    }
    return fullResponse.trim();
  }

  destroy() {
    console.log('🤖 Mock AI Destroyed');
  }
}
