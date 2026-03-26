const WALLET_EXT_ID = "nbhojbdeaganbbolklkibdibcgadfodk"; // Ganti dengan ID ekstensi Wallet yang sesuai
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'MINTA_GANTI_WALLET') {
        console.log("🚀 Meneruskan perintah ganti akun ke Wallet");
        chrome.runtime.sendMessage(WALLET_EXT_ID, { type: 'AUTO_NEXT_WALLET' }, (res) => {
            sendResponse(res);
        });
        return true; 
    }
});