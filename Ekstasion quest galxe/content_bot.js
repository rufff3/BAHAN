console.log("GALXE AUTO QUEST🤖");
const s = document.createElement('script');
s.src = chrome.runtime.getURL('injeksi.js'); 
try { (document.head || document.documentElement).appendChild(s); } catch(e){}

const SEL_LOGIN = '.e2e-login-btn';
const SEL_TUGAS = 'p.break-all';
const jedaManusiawi = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));

function klikPaksa(elemen) {
    if (!elemen) return false;
    const tombolAsli = elemen.closest('button, [role="button"], a, div.cursor-pointer') || elemen;
    if (tombolAsli.tagName && tombolAsli.tagName.toLowerCase() === 'a') {
        tombolAsli.removeAttribute('target');
        tombolAsli.removeAttribute('href');
    }
    if (typeof tombolAsli.click === 'function') {
        tombolAsli.click();
    }
    tombolAsli.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
}

function ketikTipeReact(elemen, teks) {
    if (!elemen) return;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeInputValueSetter.call(elemen, teks);
    elemen.dispatchEvent(new Event('input', { bubbles: true }));
    elemen.dispatchEvent(new Event('change', { bubbles: true }));
}

async function cariDanKlikTombol(teksTombol, batasWaktuDetik = 15) {
    let batas = batasWaktuDetik;
    while (batas > 0) {
        let btn = Array.from(document.querySelectorAll('button, div[role="button"]'))
            .find(el => el.innerText && el.innerText.trim() === teksTombol);
        
        if (btn && !btn.disabled && window.getComputedStyle(btn).pointerEvents !== 'none') {
            console.log(`🎯 Menemukan dan mengeklik: [${teksTombol}]`);
            klikPaksa(btn);
            return true;
        }
        await jedaManusiawi(1000, 1500);
        batas--;
    }
    return false;
}

function cekStatusQuest() {
    let daftarTugas = document.querySelectorAll(SEL_TUGAS);
    let sukses = 0;
    let sisa = 0;
    let skip = 0;
    let listSisa = [];
    daftarTugas.forEach((tugas) => {
        let teksTugas = tugas.innerText ? tugas.innerText.toLowerCase() : "";

        let isSurvey = teksTugas.includes('survey') || teksTugas.includes('quiz');
        let isReferral = teksTugas.includes('refer') || teksTugas.includes('invite');

        if (isReferral && !isSurvey) {
            console.log(`⏭️ Melewati tugas (Skip): [${tugas.innerText}]`);
            skip++;
            return; 
        }

        let baris = tugas.closest('div.border, div.rounded-xl, div.cursor-pointer') || tugas.parentElement.parentElement;
        let udahBeres = baris.querySelector('.text-success, .text-green-500, svg[class*="success"], svg[class*="green"]');
        if (udahBeres) {
            sukses++;
        } else {
            sisa++;
            listSisa.push(tugas);
        }
    });
    return { total: daftarTugas.length, sukses, sisa, skip, listSisa };
}

async function hajarBosTerakhir() {
    console.log("🐉 Mengecek Tombol(Participate / Claim)...");
    let btnParticipate = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.trim() === 'Participate');
    
    if (btnParticipate && !btnParticipate.disabled && window.getComputedStyle(btnParticipate).pointerEvents !== 'none') {
        console.log("⚔️ Tombol Participate Aktif! KLIK!");
        klikPaksa(btnParticipate);
        console.log("⏳ Menganalisa Jalur: Nunggu 5 detik untuk cek apakah ada Popup Approve/Claim...");
        
        let popupMuncul = false;
        let batasCek = 5;
        while(batasCek > 0) {
            let btnApprove = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.trim() === 'Approve');
            let btnClaimDirectly = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.trim() === 'Claim Directly');
            
            if (btnApprove || btnClaimDirectly) {
                popupMuncul = true;
                break;
            }
            await jedaManusiawi(1000, 1500);
            batasCek--;
        }

        if (popupMuncul) {
            console.log("💡 POPUP DITEMUKAN! Memproses Participate (Butuh Approve).");
            let btnApproveAkhir = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.trim() === 'Approve');
            if (btnApproveAkhir) {
                console.log("📝 KLIK Approve...");
                klikPaksa(btnApproveAkhir);
                await jedaManusiawi(2000, 3000);
            }
            
            // 🔥 FIX DEWA: KITA PASANG RADAR LOOPING 10 DETIK BUAT NYARI CLAIM DIRECTLY
            console.log("🔥 Memastikan klik [Claim Directly] di popup akhir...");
            let batasFinal = 10;
            while (batasFinal > 0) {
                let btnClaimFinal = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.trim() === 'Claim Directly');
                
                if (btnClaimFinal) {
                    if (btnClaimFinal.disabled || window.getComputedStyle(btnClaimFinal).pointerEvents === 'none') {
                        let checkbox = Array.from(document.querySelectorAll('div, span, label')).find(el => el.innerText && el.innerText.includes('acknowledge and accept'));
                        if (checkbox) {
                            console.log("📝 Centang S&K di popup biar tombol Claim nyala");
                            klikPaksa(checkbox);
                            await jedaManusiawi(1000, 1500);
                        }
                    } else {
                        console.log(`💥 KLIK Claim Directly: [${btnClaimFinal.innerText}]`);
                        klikPaksa(btnClaimFinal);
                        break; 
                    }
                }
                await jedaManusiawi(1000, 1500);
                batasFinal--;
            }
        } else {
            console.log("💸 TIDAK ADA POPUP! Participate (Langsung Bayar Fee).");
        }
        
        console.log("⏳ PARTICIPATE SELESAI DITEKAN! Menunggu Jaringan (15 Detik)...");
        await jedaManusiawi(15000, 18000); 
        console.log("✅ WAKTU TUNGGU SELESAI!");
        return true; 
    }

    console.log("💎 Mencari tombol Claim di halaman utama...");
    let batasClaim = 15;
    let suksesClaim = false;
    while (batasClaim > 0) {
        let btnClaim = Array.from(document.querySelectorAll('button, div[role="button"]'))
            .find(el => {
                if (!el.innerText) return false;
                let teks = el.innerText.trim();
                return teks.includes('Claim Directly') || teks.includes('Claim ') || teks === 'Claim';
            });
        
        if (btnClaim && !btnClaim.disabled && window.getComputedStyle(btnClaim).pointerEvents !== 'none') {
            console.log(`🎯 Ketemu! Mengeklik tombol pertama: [${btnClaim.innerText}]`);
            klikPaksa(btnClaim);
            suksesClaim = true;
            break;
        }
        await jedaManusiawi(1000, 1500);
        batasClaim--;
    }

    if (suksesClaim) {
        console.log("⏳ Menunggu Approve (Compliance Reminder) jika ada...");
        await jedaManusiawi(2000, 3000); 
        let btnApproveAkhir = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.trim() === 'Approve');
        if (btnApproveAkhir) {
            console.log("📝 KLIK Approve (Compliance Reminder)...");
            klikPaksa(btnApproveAkhir);
            await jedaManusiawi(2000, 3000);
        }
        console.log("🔥 Memastikan klik [Claim Directly] di popup akhir...");
        let batasFinal = 10;
        while (batasFinal > 0) {
            let btnClaimFinal = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.trim() === 'Claim Directly');
            if (btnClaimFinal) {
                if (btnClaimFinal.disabled || window.getComputedStyle(btnClaimFinal).pointerEvents === 'none') {
                    let checkbox = Array.from(document.querySelectorAll('div, span, label')).find(el => el.innerText && el.innerText.includes('acknowledge and accept'));
                    if (checkbox) {
                        console.log("📝 Centang S&K di popup biar tombol Claim nyala");
                        klikPaksa(checkbox);
                        await jedaManusiawi(1000, 1500);
                    }
                } else {
                    console.log(`💥 Klik Tombol Claim Directly: [${btnClaimFinal.innerText}]`);
                    klikPaksa(btnClaimFinal);
                    break; 
                }
            }
            await jedaManusiawi(1000, 1500);
            batasFinal--;
        }
        console.log("⏳ CLAIM! Menunggu Jaringan");
        await jedaManusiawi(15000, 18000); 
        console.log("✅ WAKTU TUNGGU SELESAI!");
        return true;
    }
    return false; 
}

async function eksekusiMassal(listSisa) {
    console.log(`🧹 Mencari ${listSisa.length} tugas yang belum selesai...`);
    for (let i = 0; i < listSisa.length; i++) {
        let teksTugas = listSisa[i].innerText ? listSisa[i].innerText.toLowerCase() : "";
        console.log(`▶️ Memproses Tugas Sisa ke-${i + 1}...`);

        if (teksTugas.includes('survey') || teksTugas.includes('quiz')) {
            console.log("📝 Deteksi Tugas Survey!");
            let btnStart = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.trim() === 'Start');
            if (btnStart && !btnStart.disabled) {
                klikPaksa(btnStart);
                await jedaManusiawi(2000, 3000); 
                
                let inputKotak = document.querySelector('input[placeholder="Enter answer"]');
                if (inputKotak) {
                    console.log("✅ Kotak isian ketemu!");
                    ketikTipeReact(inputKotak, "LFG"); 
                    await jedaManusiawi(1500, 2000);
                    
                    let btnSubmit = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.trim() === 'Submit');
                    if (btnSubmit) {
                        console.log("🚀 KLIK 'Submit' Quiz...");
                        klikPaksa(btnSubmit);
                        await jedaManusiawi(2000, 3000); 
                    }
                }
            }
        } else {
            console.log("🖱️ Klik Panel Tugas Normal...");
            klikPaksa(listSisa[i]);
            await jedaManusiawi(2000, 3000); 

            let tombolContinue = Array.from(document.querySelectorAll('div, button, a')).find(el => el.innerText && el.innerText.trim() === 'Continue to Access');
            if (tombolContinue) {
                console.log("🚧 KLIK 'Continue to Access'...");
                klikPaksa(tombolContinue);
                await jedaManusiawi(1500, 2000);
            }
            let tombolFollow = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.trim() === 'Follow');
            if (tombolFollow) {
                console.log("🚀 KLIK 'Follow Space'...");
                klikPaksa(tombolFollow);
                await jedaManusiawi(1500, 2000);
            }
        }
    }
    console.log("⏳ Semua tugas sisa selesai diklik! REFRESH HALAMAN UNTUK VERIFY");
    await jedaManusiawi(4000, 5000);
    chrome.storage.local.set({ 'botAktif': true }, () => window.location.reload());
}

chrome.storage.local.get(['botAktif'], async function(result) {
    if (result.botAktif) {
        chrome.storage.local.remove(['botAktif']); 
        console.log("🤖 BOT AKTIF!");
        await jedaManusiawi(4000, 6000);
        let butuhLogin = document.querySelector(SEL_LOGIN);
        if (butuhLogin) {
            console.log("🔑 Memulai proses Login...");
            klikPaksa(butuhLogin);
            await jedaManusiawi(2500, 3500); 
            let btnWallet = document.querySelector('img[src*="MetaMask"], img[alt*="MetaMask"], img[src*="OKX"]');
            if (btnWallet) {
                console.log(" Sikat logo Dompet!");
                klikPaksa(btnWallet);
            }
            await jedaManusiawi(7000, 9000); 
        }

        let udahRaffle = Array.from(document.querySelectorAll('div, span, p')).find(el => el.innerText && el.innerText.includes('Raffle in'));
        let udahClaimed = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.trim() === 'Claimed');
        if (udahRaffle || udahClaimed) {
            console.log("🏆 DETEKSI 'Raffle in' / 'Claimed'! Akun ini SELESAI!");
            console.log("🎉 MISI SELESAI TOTAL! Langsung minta dompet ganti akun...");
            await jedaManusiawi(2000, 3000);
            chrome.runtime.sendMessage({ type: 'MINTA_GANTI_WALLET' }, (res) => {
                if (res && res.success) {
                    console.log(`🚀 Sukses pindah ke dompet #${res.nextIndex + 1}! Refreshing halaman...`);
                    chrome.storage.local.set({ 'botAktif': true }, () => window.location.reload());
                } else {
                    console.log("🏁 AUTO-PILOT SELESAI!");
                    alert("🎉 AUTO-PILOT SELESAI!\nSemua dompet di ekstensi sudah SELESAI!");
                }
            });
            return; 
        }

        let statusQuest = cekStatusQuest();
        console.log(`📊 RADAR QUEST: Total ${statusQuest.total} | Sukses ${statusQuest.sukses} | Skip ${statusQuest.skip} | Sisa ${statusQuest.sisa}`);
        
        if (statusQuest.sisa > 0) {
            console.log("⚠️ ADA QUEST YANG BELUM SELESAI! Tahan tombol Participate/Claim, kita kerjain quest dulu...");
            await eksekusiMassal(statusQuest.listSisa);
        } 
        else {
            console.log("✅ SEMUA QUEST UDAH BERES");
            const lagiLawanBos = await hajarBosTerakhir();
            if (lagiLawanBos) {
                console.log("🔄 TRANSAKSI DIKIRIM! Refresh halaman untuk memicu deteksi 'Raffle in' / 'Claimed'...");
                await jedaManusiawi(3000, 5000);
                chrome.storage.local.set({ 'botAktif': true }, () => window.location.reload());
            } else {
                console.log("🔄 Tombol belum muncul. Refresh mancing Galxe...");
                await jedaManusiawi(3000, 4000);
                chrome.storage.local.set({ 'botAktif': true }, () => window.location.reload());
            }
        }
    }
});