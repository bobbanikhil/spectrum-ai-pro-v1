// docflow.js
// Injected into web pages to record user interactions for Doc Flow

(function() {
    if (window.hasDocFlowInjected) {
        return; // Already injected
    }
    window.hasDocFlowInjected = true;

    console.log('Doc Flow.js injected. Recording user actions...');

    function recordAction(type, data) {
        chrome.runtime.sendMessage({
            action: 'recordAction',
            data: { type, ...data }
        });
    }

    // Capture clicks
    document.addEventListener('click', (e) => {
        const target = e.target;
        let selector = '';
        if (target.id) {
            selector = `#${target.id}`;
        } else if (target.className) {
            selector = `.${target.className.split(' ')[0]}`;
        } else {
            selector = target.tagName.toLowerCase();
        }

        recordAction('click', {
            selector: selector,
            text: target.innerText.substring(0, 100),
            url: window.location.href
        });

        // Request a screenshot after a click
        chrome.runtime.sendMessage({ action: 'takeScreenshot' });
    }, true); // Use capture phase to ensure we get the event before it's consumed

    // Capture input changes
    document.addEventListener('change', (e) => {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            let selector = '';
            if (target.id) {
                selector = `#${target.id}`;
            } else if (target.className) {
                selector = `.${target.className.split(' ')[0]}`;
            } else {
                selector = target.tagName.toLowerCase();
            }

            recordAction('input', {
                selector: selector,
                value: target.value.substring(0, 100),
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
        }, 200); // Debounce to avoid too many events
    }, true);

    // Initial page load action
    recordAction('navigation', {
        url: window.location.href,
        title: document.title
    });

})();
