// setup_inline.js

// Check AI availability on page load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof self.LanguageModel === 'undefined') {
        const statusElement = document.createElement('div');
        statusElement.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="color: #856404; margin-top: 0;"> AI Model Detected</h3>
                <p style="color: #856404; margin-bottom: 0;">Please follow the setup steps above to enable Chrome's built-in AI features.</p>
            </div>
        `;
        document.querySelector('.section').insertBefore(statusElement, document.querySelector('.step'));
    }
});
