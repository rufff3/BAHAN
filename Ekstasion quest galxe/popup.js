document.getElementById('startBotBtn').addEventListener('click', () => {
    const targetUrl = document.getElementById('targetUrl').value.trim();
    if (!targetUrl) {
        alert("Link web wajib diisi");
        return;
    }
    chrome.storage.local.set({ 'botAktif': true }, () => {
        chrome.tabs.create({ url: targetUrl });
    });
});