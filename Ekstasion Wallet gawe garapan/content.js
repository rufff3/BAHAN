function injectScript(file_path, node) {
    const script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', file_path);
    node.appendChild(script);
}

injectScript(chrome.runtime.getURL('inpage.js'), document.documentElement);

window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'TO_WALLET_BACKGROUND') {
        chrome.runtime.sendMessage(event.data.payload, (response) => {
            window.postMessage({ type: 'FROM_WALLET_BACKGROUND', response }, '*');
        });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'WALLET_ACCOUNT_CHANGED') {
        window.postMessage(message, '*');
    }
    if (message.type === 'WALLET_STATE_UPDATED') {
        window.postMessage(message, '*');
    }
});