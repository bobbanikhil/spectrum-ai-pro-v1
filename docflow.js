// docflow.js
// Injected into web pages to record user interactions for Doc Flow

(function() {
    if (window.hasDocFlowInjected) {
        return; // Already injected
    }
    window.hasDocFlowInjected = true;

    console.log('Doc Flow.js injected. Recording user actions...');

    function recordAction(type, data) {
        try {
            // Use sendResponse to ensure message is sent before navigation
            chrome.runtime.sendMessage({
                action: 'recordAction',
                data: { type, ...data }
            });
        } catch (e) {
            console.warn('Spectrum AI: Doc Flow connection lost.', e.message);
        }
    }

    // --- Visual Feedback for Clicks ---
    function showClickIndicator(x, y) {
        let indicator = document.createElement('div');
        indicator.className = 'docflow-click-indicator';
        document.body.appendChild(indicator);

        indicator.style.left = `${x}px`;
        indicator.style.top = `${y}px`;

        indicator.addEventListener('animationend', () => {
            indicator.remove();
        });
    }

    // Get a simple CSS selector for a target
    function getSelector(target) {
        if (target.id) {
            return `#${target.id}`;
        }
        if (target.classList && target.classList.length > 0) {
             return `.${Array.from(target.classList).join('.')}`;
        }
        if (target.name) {
            return `[name="${target.name}"]`;
        }
        return target.tagName.toLowerCase();
    }

    // Capture clicks
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('docflow-click-indicator')) {
            return;
        }

        showClickIndicator(e.clientX, e.clientY);

        recordAction('click', {
            selector: getSelector(target),
            text: (target.innerText || target.value || '').substring(0, 100),
            url: window.location.href
        });

    }, true); // Use capture phase

    // Capture input changes
    document.addEventListener('change', (e) => {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {

            let value = target.value;
            if (target.type === 'password') {
                value = '********';
            }

            recordAction('input', {
                selector: getSelector(target),
                value: value.substring(0, 100),
                typeAttribute: target.type || 'text',
                url: window.location.href
            });
        }
    }, true);

    // Capture scroll events (debounced)
    let scrollTimeout;
    document.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            recordAction('scroll', {
                x: window.scrollX,
                y: window.scrollY,
                url: window.location.href
            });
        }, 500); // Debounce to avoid too many events
    }, true);

    // ★★★ FIX: Removed initial page load action from here. ★★★
    // It's now handled by the service worker's `tabs.onUpdated` listener,
    // which is more reliable and prevents duplicate navigation steps.

})();