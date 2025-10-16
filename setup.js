// setup.js - Spectrum AI V2.2 - Production Ready & Corrected

document.addEventListener('DOMContentLoaded', async () => {
    const statusContainer = document.getElementById('status-container');

    const openUrl = (url) => chrome.tabs.create({ url });

    const steps = {
        flags: {
            title: "Step 1: Enable Chrome's AI Flags",
            buttonText: "Open Chrome Flags",
            action: () => openUrl('chrome://flags'),
            instructions: "You must enable two experimental flags. On the page that opens, find and enable both <code>#prompt-api-for-gemini-nano</code> and <code>#optimization-guide-on-device-model</code>, then relaunch Chrome when prompted."
        },
        model: {
            title: "Step 2: Download the On-Device Model",
            buttonText: "Open Components Page",
            action: () => openUrl('chrome://components'),
            instructions: "Find the component named <strong>\"On-Device Model\"</strong> and click <strong>\"Check for update\"</strong>. The download may take several minutes. Once the status shows \"Up-to-date\", please <strong>fully restart your browser one more time</strong>."
        },
        complete: {
            title: "Step 3: Setup Complete!",
            instructions: "You can now close this tab and start using Spectrum AI. Right-click on any webpage or use the extension icon in your toolbar to open the side panel."
        }
    };

    function renderStep(id, title, instructions, buttonText, action) {
        const stepDiv = document.createElement('div');
        stepDiv.id = id;
        stepDiv.className = 'setup-step';
        let innerHTML = `<h3>${title}</h3><p>${instructions}</p>`;
        stepDiv.innerHTML = innerHTML;

        if (buttonText && action) {
            const button = document.createElement('button');
            button.textContent = buttonText;
            button.addEventListener('click', action);
            stepDiv.appendChild(button);
        }
        return stepDiv;
    }

    // --- Main Logic ---
    if (typeof self.LanguageModel === 'undefined') {
        // AI API is not present at all.
        statusContainer.appendChild(renderStep('step-flags', steps.flags.title, steps.flags.instructions, steps.flags.buttonText, steps.flags.action));
        statusContainer.insertAdjacentHTML('beforeend', `
            <div class="status error">
                <h3>Error: Gemini Nano API Not Found</h3>
                <p>The core AI model is not detected in your browser. Please complete Step 1 and relaunch Chrome.</p>
            </div>
        `);
    } else {
        // AI API is present, check its status.
        const flagsStep = renderStep('step-flags', steps.flags.title, "✅ Chrome AI flags are enabled.");
        flagsStep.classList.add('completed');
        statusContainer.appendChild(flagsStep);
        
        try {
            const availability = await self.LanguageModel.availability();
            
            if (availability === 'readily') {
                // SUCCESS: The model is fully ready.
                const modelStep = renderStep('step-model', steps.model.title, "✅ On-Device AI Model is downloaded and ready.");
                modelStep.classList.add('completed');
                statusContainer.appendChild(modelStep);
                statusContainer.appendChild(renderStep('step-complete', steps.complete.title, steps.complete.instructions));
                statusContainer.insertAdjacentHTML('beforeend', `
                    <div class="status success">
                        <h3>Setup Complete!</h3>
                        <p>Spectrum AI is fully operational. You can now close this page.</p>
                    </div>
                `);
            } else {
                // The model is available/downloadable but not ready yet.
                statusContainer.appendChild(renderStep('step-model', steps.model.title, steps.model.instructions, steps.model.buttonText, steps.model.action));
                statusContainer.insertAdjacentHTML('beforeend', `
                    <div class="status error">
                        <h3>Action Required: AI Model Not Ready (Status: ${availability})</h3>
                        <p>The AI is available but needs to be downloaded. Please complete Step 2 above. After clicking "Check for update," the download may take several minutes. <strong>A final browser restart is required after the download is complete.</strong></p>
                    </div>
                `);
            }
        } catch (e) {
            statusContainer.insertAdjacentHTML('beforeend', `
                <div class="status error">
                    <h3>An Unexpected Error Occurred</h3>
                    <p>${e.message}</p>
                </div>
            `);
        }
    }
});