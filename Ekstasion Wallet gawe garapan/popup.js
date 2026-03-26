let wallets = []; 
let currentIndex = 0; 

document.getElementById('tabHome').addEventListener('click', () => switchTab('Home'));
document.getElementById('tabNto1').addEventListener('click', () => switchTab('Nto1'));
document.getElementById('tab1toN').addEventListener('click', () => switchTab('1toN'));

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab' + tabName).classList.add('active');
    document.getElementById('content' + tabName).classList.add('active');
}

chrome.storage.local.get(['wallets', 'currentIndex', 'activeNetwork'], (res) => {
    if (res.wallets) wallets = res.wallets;
    if (res.currentIndex !== undefined) currentIndex = res.currentIndex;
    if (res.activeNetwork) {
        document.getElementById('activeNetworkHome').value = res.activeNetwork;
    }
    updateUI();
});

function updateUI() {
    if (wallets.length === 0) {
        document.getElementById('walletAddress').innerText = "Belum ada dompet";
        document.getElementById('senderAddress1toN').innerText = "Belum ada dompet";
        document.getElementById('walletCounter').innerText = "0/0";
        return;
    }
    document.getElementById('walletAddress').innerText = wallets[currentIndex].address;
    document.getElementById('senderAddress1toN').innerText = wallets[currentIndex].address.substring(0,8) + "...";
    document.getElementById('walletCounter').innerText = `${currentIndex + 1} / ${wallets.length}`;
}

document.getElementById('activeNetworkHome').addEventListener('change', (e) => {
    const newChainId = e.target.value;
    chrome.storage.local.set({ activeNetwork: newChainId }, () => {
        chrome.runtime.sendMessage({ 
            type: 'CHANGE_ACTIVE_NETWORK', 
            payload: { chainId: newChainId } 
        });
    });
});

function gantiWallet(index) {
    currentIndex = index;
    chrome.storage.local.set({ currentIndex }, () => {
        updateUI();
        chrome.runtime.sendMessage({ type: 'CHANGE_ACTIVE_WALLET', payload: { index } });
    });
}

document.getElementById('prevBtn').addEventListener('click', () => { if (currentIndex > 0) gantiWallet(currentIndex - 1); });
document.getElementById('nextBtn').addEventListener('click', () => { if (currentIndex < wallets.length - 1) gantiWallet(currentIndex + 1); });

document.getElementById('addWalletBtn').addEventListener('click', () => {
    const lines = document.getElementById('walletInput').value.trim().split('\n');
    let added = 0;
    for (let line of lines) {
        line = line.trim(); if (!line) continue;
        try {
            let pk = line.includes(' ') ? ethers.Wallet.fromMnemonic(line).privateKey : (line.startsWith('0x') ? line : '0x' + line);
            let address = new ethers.Wallet(pk).address;
            if (!wallets.find(w => w.address === address)) { wallets.push({ address, privateKey: pk }); added++; }
        } catch (e) {}
    }
    if(added > 0) {
        chrome.storage.local.set({ wallets }, () => { updateUI(); document.getElementById('walletInput').value=''; alert(`Sukses! ${added} dompet ditambahkan.`); });
    }
});

document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm("Yakin hapus SEMUA dompet dari ekstensi ini?")) { 
        wallets = []; currentIndex = 0; 
        chrome.storage.local.set({ wallets, currentIndex }, () => {
            updateUI();
            alert("Semua data dompet berhasil dibersihkan!");
        }); 
    }
});

document.getElementById('tokenTypeNto1').addEventListener('change', (e) => {
    document.getElementById('tokenContractNto1').style.display = e.target.value === 'token' ? 'block' : 'none';
});
document.getElementById('amountTypeNto1').addEventListener('change', (e) => {
    document.getElementById('customAmountNto1').style.display = e.target.value === 'custom' ? 'block' : 'none';
});

document.getElementById('scanBtn').addEventListener('click', () => {
    const chainId = document.getElementById('networkSelectNto1').value;
    const isToken = document.getElementById('tokenTypeNto1').value === 'token';
    const contract = document.getElementById('tokenContractNto1').value.trim();
    if (isToken && !contract) return alert("Masukkan Smart Contract Token!");
    document.getElementById('scanResult').innerHTML = `<span style="color:#ff9800;" id="progressTextNto1">⏳ Memulai mesin scanner...</span>`;
    chrome.runtime.sendMessage({ type: 'SCAN_WALLETS', payload: { chainId, isToken, contract } }, (res) => {
        if (res.success && res.data.length > 0) {
            let html = `<span style="color:green;">✅ ${res.data.length} dompet berisi:</span><div class="scan-list">`;
            res.data.forEach(w => html += `<div class="scan-item"><span>${w.address.substring(0,6)}...</span> <b>${w.formattedBalance} ${w.symbol}</b></div>`);
            document.getElementById('scanResult').innerHTML = html + `</div>`;
            document.getElementById('sendArea').style.display = 'block';
        } else {
            document.getElementById('scanResult').innerHTML = `<span style="color:red;">❌ Kosong / Semua dompet saldo 0.</span>`;
            document.getElementById('sendArea').style.display = 'none';
        }
    });
});

document.getElementById('executeNto1Btn').addEventListener('click', () => {
    const payload = {
        target: document.getElementById('targetAddressNto1').value.trim(),
        chainId: document.getElementById('networkSelectNto1').value,
        isToken: document.getElementById('tokenTypeNto1').value === 'token',
        contract: document.getElementById('tokenContractNto1').value.trim(),
        amountType: document.getElementById('amountTypeNto1').value, 
        customAmount: document.getElementById('customAmountNto1').value,
        gasSpeed: document.getElementById('gasSpeedNto1').value
    };
    if (!payload.target) return alert("Masukkan alamat penampung!");
    document.getElementById('executeNto1Btn').innerText = "🚀 Memproses...";
    document.getElementById('executeNto1Btn').disabled = true;
    chrome.runtime.sendMessage({ type: 'EXECUTE_MASS_SEND', payload }, () => {
        alert("Proses Mass Send Selesai!");
        document.getElementById('executeNto1Btn').innerText = "🚀 Eksekusi Kirim Massal";
        document.getElementById('executeNto1Btn').disabled = false;
        document.getElementById('scanResult').innerHTML = `<span style="color:green;">✅ Pengiriman Massal Selesai! Cek Console.</span>`;
    });
});

document.getElementById('tokenType1toN').addEventListener('change', (e) => {
    document.getElementById('tokenContract1toN').style.display = e.target.value === 'token' ? 'block' : 'none';
});
document.getElementById('amountType1toN').addEventListener('change', (e) => {
    document.getElementById('customAmount1toN').style.display = e.target.value === 'custom' ? 'block' : 'none';
});

document.getElementById('execute1toNBtn').addEventListener('click', () => {
    const listRaw = document.getElementById('targetList1toN').value.trim().split('\n');
    let addresses = [];
    for(let line of listRaw) {
        let addr = line.trim();
        if(addr.includes(',')) addr = addr.split(',')[0].trim();
        if(addr.startsWith('0x') && addr.length === 42) addresses.push(addr);
    }
    if(addresses.length === 0) return alert("Masukkan minimal 1 alamat valid!");
    const amountType = document.getElementById('amountType1toN').value;
    const customAmount = document.getElementById('customAmount1toN').value;
    if(amountType === 'custom' && (!customAmount || customAmount <= 0)) return alert("Masukkan jumlah yang valid!");
    const payload = {
        targets: addresses, 
        amountType: amountType,
        customAmount: customAmount,
        chainId: document.getElementById('networkSelect1toN').value,
        isToken: document.getElementById('tokenType1toN').value === 'token',
        contract: document.getElementById('tokenContract1toN').value.trim(),
        gasSpeed: document.getElementById('gasSpeed1toN').value
    };
    document.getElementById('result1toN').innerHTML = `<span style="color:#ff9800;" id="progressText1toN">⏳ Menghitung gas...</span>`;
    chrome.runtime.sendMessage({ type: 'EXECUTE_ONE_TO_MANY', payload }, (res) => {
        if(res.success) {
            alert("Selesai disebar!");
            document.getElementById('result1toN').innerHTML = `<span style="color:green;">✅ Disperse Selesai!</span>`;
        } else {
            alert("Error: " + res.error);
            document.getElementById('result1toN').innerHTML = `<span style="color:red;">❌ Gagal: Cek Console!</span>`;
        }
    });
});

// --- LOGIKA GENERATE WALLET ---
document.getElementById('generateBtn').addEventListener('click', () => {
    const count = parseInt(document.getElementById('genCount').value) || 1;
    const type = document.getElementById('genType').value;
    let results = [];
    
    document.getElementById('generateBtn').innerText = "⚙️ Memproses...";
    
    setTimeout(() => {
        for (let i = 0; i < count; i++) {
            const randomWallet = ethers.Wallet.createRandom();
            if (type === 'private') {
                results.push(randomWallet.privateKey);
            } else {
                results.push(randomWallet.mnemonic.phrase);
            }
        }
        
        document.getElementById('genResult').value = results.join('\n');
        document.getElementById('genResultArea').style.display = 'block';
        document.getElementById('generateBtn').innerText = "⚙️ Generate Wallet";
    }, 100);
});

document.getElementById('copyGenBtn').addEventListener('click', () => {
    const text = document.getElementById('genResult').value;
    navigator.clipboard.writeText(text).then(() => {
        alert('Data berhasil disalin ke clipboard!');
    }).catch(err => {
        alert('Gagal menyalin data.');
    });
});

document.getElementById('addGenBtn').addEventListener('click', () => {
    const text = document.getElementById('genResult').value;
    if (!text) return;
    document.getElementById('walletInput').value = text;
    document.getElementById('addWalletBtn').click();
    document.getElementById('genResultArea').style.display = 'none';
    document.getElementById('genResult').value = '';
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'PROGRESS_UPDATE') {
        if (msg.target === 'scanNto1') {
            const el = document.getElementById('progressTextNto1');
            if(el) el.innerText = msg.text;
        } else if (msg.target === 'sendNto1') {
            const btn = document.getElementById('executeNto1Btn');
            if(btn) btn.innerText = msg.text;
        } else if (msg.target === 'send1toN') {
            const el = document.getElementById('progressText1toN');
            if(el) el.innerText = msg.text;
        }
    }
});