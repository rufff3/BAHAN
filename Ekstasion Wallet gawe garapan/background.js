importScripts('ethers.js');
console.log("WALLET");

const RPC_MAP = {
    "0x1": "https://eth.llamarpc.com", 
    "0x38": "https://bsc-dataseed.binance.org/", 
    "0x89": "https://polygon-mainnet.g.alchemy.com/v2/56hawCppdeNWhxYEHqzM0yut_wrN_zaW",
    "0xa4b1": "https://arb1.arbitrum.io/rpc", 
    "0x659": "https://rpc.gravity.xyz", 
    "0x2105": "https://mainnet.base.org",
    "0xa86a": "https://api.avax.network/ext/bc/C/rpc",
    "0xa": "https://mainnet.optimism.io",
    "0xcc": "https://opbnb-mainnet-rpc.bnbchain.org"
};

let globalActiveNetwork = "0x38"; 
let lastScannedWallets = []; 

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)", 
    "function decimals() view returns (uint8)", 
    "function symbol() view returns (string)", 
    "function transfer(address, uint256) returns (bool)"
];

chrome.storage.local.get(['activeNetwork'], (res) => {
    if (res.activeNetwork) globalActiveNetwork = res.activeNetwork;
});

async function getAdjustedGas(provider, speed) {
    let gp = await provider.getGasPrice(); 
    if(speed === 'slow') return gp.mul(80).div(100); 
    if(speed === 'fast') return gp.mul(120).div(100); 
    return gp; 
}

function getStaticProvider(rpcUrl, chainIdHex) {
    let chainIdDec = parseInt(chainIdHex, 16);
    return new ethers.providers.StaticJsonRpcProvider(rpcUrl, chainIdDec);
}

function sendProgress(target, text) {
    chrome.runtime.sendMessage({ type: 'PROGRESS_UPDATE', target, text }, () => {
        if (chrome.runtime.lastError) {}
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request) return false;

    if (request.type === 'CHANGE_ACTIVE_WALLET') {
        chrome.storage.local.set({currentIndex: request.payload.index}, () => {
            chrome.storage.local.get(['wallets'], (res) => {
                const wallets = res.wallets || [];
                const currentWallet = wallets[request.payload.index];
                if (currentWallet) {
                    chrome.tabs.query({}, function(tabs) {
                        for (let i = 0; i < tabs.length; i++) {
                            chrome.tabs.sendMessage(tabs[i].id, {
                                type: 'WALLET_STATE_UPDATED',
                                payload: { address: currentWallet.address, chainId: globalActiveNetwork }
                            });
                        }
                    });
                }
            });
            sendResponse({ success: true });
        });
        return true; 
    }

    if (request.type === 'CHANGE_ACTIVE_NETWORK') {
        globalActiveNetwork = request.payload.chainId;
        chrome.tabs.query({}, function(tabs) {
            for (let i = 0; i < tabs.length; i++) {
                chrome.tabs.sendMessage(tabs[i].id, {
                    type: 'WALLET_STATE_UPDATED',
                    payload: { address: null, chainId: globalActiveNetwork, onlyNetwork: true }
                });
            }
        });
        sendResponse({ success: true });
        return true;
    }

    if (request.method === 'INTERNAL_SWITCH_CHAIN') {
        globalActiveNetwork = request.params[0];
        chrome.storage.local.set({ activeNetwork: globalActiveNetwork });
        sendResponse({ id: request.id, result: "OK" }); 
        return true;
    }

    if (request.type === 'SCAN_WALLETS') {
        chrome.storage.local.get(['wallets'], async (res) => {
            const wallets = res.wallets || [];
            const targetRpc = RPC_MAP[request.payload.chainId] || RPC_MAP[globalActiveNetwork];
            const provider = getStaticProvider(targetRpc, request.payload.chainId);
            let fundedWallets = [];
            console.log(`🔍 Memulai Scan ${wallets.length} dompet...`);
            for (let i = 0; i < wallets.length; i++) {
                sendProgress('scanNto1', `🔍 Scan Dompet: ${i + 1} / ${wallets.length}...`);
                try {
                    let rawBalance = ethers.BigNumber.from(0); 
                    let sym = "Native", fmt = "0", dec = 18;
                    if (request.payload.isToken) {
                        const tc = new ethers.Contract(request.payload.contract, ERC20_ABI, provider);
                        rawBalance = await tc.balanceOf(wallets[i].address);
                        if (rawBalance.gt(0)) { 
                            dec = await tc.decimals().catch(()=>18);
                            fmt = ethers.utils.formatUnits(rawBalance, dec); 
                            sym = await tc.symbol().catch(()=>"TKN"); 
                        }
                    } else {
                        rawBalance = await provider.getBalance(wallets[i].address);
                        if (rawBalance.gt(0)) { fmt = ethers.utils.formatEther(rawBalance); }
                    }
                    if (rawBalance.gt(0)) {
                        fundedWallets.push({ 
                            address: wallets[i].address, privateKey: wallets[i].privateKey, 
                            balance: rawBalance, formattedBalance: fmt, symbol: sym, decimals: dec 
                        });
                        console.log(`✅ Saldo Ditemukan: ${wallets[i].address} -> ${fmt} ${sym}`);
                    }
                    await new Promise(r => setTimeout(r, 100)); 
                } catch (e) {}
            }
            lastScannedWallets = fundedWallets; 
            sendResponse({ success: true, data: fundedWallets });
        });
        return true; 
    }

    if (request.type === 'EXECUTE_MASS_SEND') {
        (async () => {
            const p = request.payload;
            const targetRpc = RPC_MAP[p.chainId] || RPC_MAP[globalActiveNetwork];
            const provider = getStaticProvider(targetRpc, p.chainId);
            let total = lastScannedWallets.length;
            let current = 0;
            console.log(`🚀 Memulai pengiriman massal ke ${p.target}...`);
            for (let w of lastScannedWallets) {
                current++;
                sendProgress('sendNto1', `🚀 Mengirim: ${current} / ${total} Dompet...`);
                try {
                    const wallet = new ethers.Wallet(w.privateKey, provider);
                    const gasPrice = await getAdjustedGas(provider, p.gasSpeed);
                    if (p.isToken) {
                        const tc = new ethers.Contract(p.contract, ERC20_ABI, wallet);
                        let amount = p.amountType === 'max' ? w.balance : ethers.utils.parseUnits(p.customAmount.toString(), w.decimals || 18);
                        let gasLimit;
                        try { gasLimit = (await tc.estimateGas.transfer(p.target, amount, {gasPrice})).mul(120).div(100); } 
                        catch (err) { gasLimit = ethers.BigNumber.from(100000); }
                        const tx = await tc.transfer(p.target, amount, {gasPrice, gasLimit});
                        console.log(`✅ Token Terkirim dari ${w.address}: ${tx.hash}`);
                    } else {
                        const gasLimit = ethers.utils.hexlify(21000); 
                        let feeCost = gasPrice.mul(gasLimit);
                        let amount = p.amountType === 'max' ? w.balance.sub(feeCost) : ethers.utils.parseEther(p.customAmount.toString());
                        let success = false; let attempts = 0;
                        while(!success && attempts < 3 && amount.gt(0)) {
                            try {
                                const tx = await wallet.sendTransaction({ to: p.target, value: amount, gasLimit, gasPrice });
                                console.log(`✅ Native Terkirim dari ${w.address}: ${tx.hash}`);
                                success = true;
                            } catch (e) {
                                attempts++;
                                amount = amount.sub(feeCost); 
                            }
                        }
                    }
                    await new Promise(r => setTimeout(r, 200)); 
                } catch (e) { console.error(`❌ Gagal ${w.address}`, e); }
            }
            sendResponse({ success: true });
        })();
        return true;
    }

    if (request.type === 'EXECUTE_ONE_TO_MANY') {
        chrome.storage.local.get(['wallets', 'currentIndex'], async (res) => {
            try {
                const p = request.payload;
                const targetRpc = RPC_MAP[p.chainId] || RPC_MAP[globalActiveNetwork];
                const provider = getStaticProvider(targetRpc, p.chainId);
                const wallet = new ethers.Wallet(res.wallets[res.currentIndex].privateKey, provider);
                const gasPrice = await getAdjustedGas(provider, p.gasSpeed);
                let currentNonce = await provider.getTransactionCount(wallet.address, 'pending');
                const numTargets = p.targets.length;
                let amountPerTarget = ethers.BigNumber.from(0);
                if (p.isToken) {
                    const tc = new ethers.Contract(p.contract, ERC20_ABI, wallet);
                    let decimals = await tc.decimals().catch(()=>18);
                    if (p.amountType === 'max') {
                        let totalToken = await tc.balanceOf(wallet.address);
                        amountPerTarget = totalToken.div(numTargets);
                    } else {
                        amountPerTarget = ethers.utils.parseUnits(p.customAmount.toString(), decimals);
                    }
                } else {
                    if (p.amountType === 'max') {
                        let totalNative = await provider.getBalance(wallet.address);
                        let totalGasCost = gasPrice.mul(21000).mul(numTargets);
                        let availableToSplit = totalNative.sub(totalGasCost);
                        if(availableToSplit.lte(0)) throw new Error("Saldo tidak cukup untuk bayar gas fee semua alamat.");
                        amountPerTarget = availableToSplit.div(numTargets); 
                    } else {
                        amountPerTarget = ethers.utils.parseEther(p.customAmount.toString());
                    }
                }
                let current = 0;
                console.log(`🚀 Mulai menyebar ke ${numTargets} alamat...`);
                for (let address of p.targets) {
                    current++;
                    sendProgress('send1toN', `🚀 Menyebar: ${current} / ${numTargets} Alamat...`);
                    try {
                        if (p.isToken) {
                            const tc = new ethers.Contract(p.contract, ERC20_ABI, wallet);
                            let gasLimit;
                            try { gasLimit = (await tc.estimateGas.transfer(address, amountPerTarget, {gasPrice})).mul(120).div(100); } 
                            catch(err) { gasLimit = ethers.BigNumber.from(100000); } 
                            const tx = await tc.transfer(address, amountPerTarget, {gasPrice, gasLimit, nonce: currentNonce});
                            console.log(`✅ Ke ${address}: ${tx.hash}`);
                        } else {
                            const tx = await wallet.sendTransaction({ to: address, value: amountPerTarget, gasLimit: 21000, gasPrice, nonce: currentNonce });
                            console.log(`✅ Ke ${address}: ${tx.hash}`);
                        }
                        currentNonce++; 
                    } catch (e) { console.error(`❌ Gagal kirim ke ${address}`, e); }
                }
                sendResponse({ success: true });
            } catch (err) {
                console.error("1-to-N Error:", err);
                sendResponse({ success: false, error: err.message });
            }
        });
        return true;
    }

    if (!request.method) return false;
    chrome.storage.local.get(['wallets', 'currentIndex', 'activeNetwork'], async function(result) {
        const wallets = result.wallets || [];
        const currentIndex = result.currentIndex || 0;
        if (wallets.length === 0) return sendResponse({ id: request.id, error: { message: "Dompet kosong", code: 4001 } });
        
        try {
            const activeWalletData = wallets[currentIndex];
            let privKey = activeWalletData.privateKey;
            if (!privKey.startsWith('0x')) privKey = '0x' + privKey;
            
            let activeHex = result.activeNetwork || globalActiveNetwork || "0x38";
            let currentRpcUrl = RPC_MAP[activeHex] || RPC_MAP["0x38"];
            
            const activeWallet = new ethers.Wallet(privKey);
            const provider = getStaticProvider(currentRpcUrl, activeHex);
            const walletWithProvider = activeWallet.connect(provider);
            const method = request.method;
            const params = request.params || [];
            
            console.log(`🤖 Menerima: ${method} di jaringan ${currentRpcUrl} untuk ${activeWallet.address}`);
            
            if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
                sendResponse({ id: request.id, result: [activeWallet.address.toLowerCase()] });
            }
            else if (method === 'eth_chainId') {
                sendResponse({ id: request.id, result: activeHex });
            }
            else if (method === 'personal_sign') {
                let msg = params[0].startsWith('0x') ? ethers.utils.arrayify(params[0]) : params[0];
                sendResponse({ id: request.id, result: await activeWallet.signMessage(msg) });
            }
            else if (method === 'eth_signTypedData_v4' || method === 'eth_signTypedData_v3' || method === 'eth_signTypedData') {
                let msgParams = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
                if (msgParams.types && msgParams.types.EIP712Domain) delete msgParams.types.EIP712Domain;
                sendResponse({ id: request.id, result: await activeWallet._signTypedData(msgParams.domain, msgParams.types, msgParams.message) });
            }
            else if (method === 'eth_sendTransaction') {
                let tx = { to: params[0].to, data: params[0].data, value: params[0].value || "0x0" };
                let gp = await provider.getGasPrice();
                tx.gasPrice = gp;
                tx.nonce = await provider.getTransactionCount(activeWallet.address, 'pending');
                try {
                    const estimatedGas = await provider.estimateGas({...tx, from: activeWallet.address});
                    tx.gasLimit = estimatedGas.mul(150).div(100); 
                } catch (e) {
                    tx.gasLimit = ethers.utils.hexlify(500000); 
                }
                const txResponse = await walletWithProvider.sendTransaction(tx);
                sendResponse({ id: request.id, result: txResponse.hash });
            }
            else {
                const result = await provider.send(method, params);
                sendResponse({ id: request.id, result: result });
            }
        } catch (err) {
            console.error(`❌ Gagal di ${request.method}:`, err);
            sendResponse({ id: request.id, error: { message: err.message || err.reason, code: 4001 } });
        }
    });
    return true; 
});

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (sender.id === "egnheebogeckichbfbfmakllehfalgfb") { //ganti id ekstasion quest galxe DI MANIFEST.JSON JUGA
        if (request.type === 'AUTO_NEXT_WALLET') {
            chrome.storage.local.get(['wallets', 'currentIndex'], (res) => {
                let wallets = res.wallets || [];
                let currentIndex = res.currentIndex || 0;
                let nextIndex = currentIndex + 1;
                if (nextIndex < wallets.length) {
                    chrome.storage.local.set({ currentIndex: nextIndex }, () => {
                        console.log(`🔄 Berhasil ganti ke wallet #${nextIndex + 1}`);
                        sendResponse({ success: true, nextIndex: nextIndex });
                    });
                } else {
                    console.log("🏁 Semua dompet telah selesai.");
                    sendResponse({ success: false, reason: "finish" });
                }
            });
            return true; 
        }
    }
});