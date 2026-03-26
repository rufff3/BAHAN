console.log("🟢 Ekstasion Wallet Aktif!");
const eventListeners = {};
let currentChainId = "0x38"; // Default awal

const myWalletProvider = {
    isMetaMask: true, isOKxWallet: true, isOkxWallet: true,
    isConnected: () => true,
    on: (event, handler) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event].push(handler);
    },
    removeListener: (event, handler) => {
        if (!eventListeners[event]) return;
        eventListeners[event] = eventListeners[event].filter(h => h !== handler);
    },
    removeAllListeners: () => {},
    emit: function(event, data) {
        if (eventListeners[event]) eventListeners[event].forEach(handler => handler(data));
    },
    request: async function(args) {
        console.log("👉 Web minta:", args.method, args.params);
        if (args.method === 'eth_chainId') return currentChainId;
        if (args.method === 'net_version') return parseInt(currentChainId, 16).toString();
        
        if (args.method === 'wallet_switchEthereumChain') {
            const targetChainId = args.params[0].chainId;
            
            if (currentChainId === targetChainId) {
                console.log(`✅ Sudah berada di jaringan ${currentChainId}, bypass prompt.`);
                return null; 
            }
            
            currentChainId = targetChainId;
            console.log(`🔄 BERUBAH KE JARINGAN: ${currentChainId}`);
            setTimeout(() => this.emit('chainChanged', currentChainId), 100);
            window.postMessage({ type: 'TO_WALLET_BACKGROUND', payload: { id: Date.now(), method: 'INTERNAL_SWITCH_CHAIN', params: [currentChainId] } }, '*');
            return null; 
        }
        
        if (args.method === 'wallet_addEthereumChain') return null; 
        
        return new Promise((resolve, reject) => {
            const requestId = Date.now() + Math.random().toString();
            const handleResponse = (e) => {
                if (e.data.type === 'FROM_WALLET_BACKGROUND' && e.data.response.id === requestId) {
                    window.removeEventListener('message', handleResponse); 
                    if (e.data.response.error) reject({ message: e.data.response.error.message || e.data.response.error, code: 4001 }); 
                    else resolve(e.data.response.result); 
                }
            };
            window.addEventListener('message', handleResponse);
            window.postMessage({ type: 'TO_WALLET_BACKGROUND', payload: { id: requestId, method: args.method, params: args.params } }, '*');
        });
    },
    sendAsync: function(payload, callback) {
        this.request(payload).then(result => callback(null, { id: payload.id || 1, jsonrpc: "2.0", result })).catch(error => callback(error, null));
    },
    send: function(payload, callback) {
        if (typeof callback === 'function') this.sendAsync(payload, callback);
        else return this.request(payload);
    }
};

window.ethereum = myWalletProvider;
window.okxwallet = myWalletProvider;

setTimeout(() => { myWalletProvider.emit('connect', { chainId: currentChainId }); }, 100);

const providerInfo = {
    uuid: "3506709c-9306-44c5-af6e-9189b3f30325",
    name: "OKX Wallet",
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJDMi40OCAyIDAgNC40OCAwIDEyczIuNDggMTAgMTAgMTAgMTAtMi40OCAxMC0xMFMyMS41MiAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4eiIvPjwvc3ZnPg==",
    rdns: "com.okex.wallet"
};

function announceProvider() {
    try {
        window.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
            detail: { info: providerInfo, provider: myWalletProvider }
        }));
    } catch (e) {}
}
announceProvider();

window.addEventListener("eip6963:requestProvider", () => {
    announceProvider();
});

window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'WALLET_STATE_UPDATED') {
        const newAddress = event.data.payload.address;
        const newChainId = event.data.payload.chainId;
        
        if (currentChainId !== newChainId) {
            currentChainId = newChainId;
            console.log(`🔄 Sinkronisasi Jaringan dApp ke: ${currentChainId}`);
            myWalletProvider.emit('chainChanged', currentChainId);
        }
        
        if (newAddress) {
            myWalletProvider.emit('accountsChanged', [newAddress.toLowerCase()]);
        }
    }
});