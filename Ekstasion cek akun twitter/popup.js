document.getElementById('btnMulai').addEventListener('click', mulaiScan);
document.getElementById('btnSalin').addEventListener('click', salinHasil);

// Fungsi Regex untuk membaca berbagai format
function bacaFormatAkun(teks) {
  let daftarAkun = [];
  // Memotong teks berdasarkan garis atau jarak enter
  let blokBlok = teks.split(/\n\s*\n|-{5,}/);
  
  for (let blok of blokBlok) {
    blok = blok.trim();
    if (!blok) continue;
    
    // Jika format baru (ada kata Username)
    if (blok.toLowerCase().includes("username") && blok.toLowerCase().includes("email")) {
      let usernameMatch = blok.match(/Username\s*:\s*(\S+)/i);
      let emailMatch = blok.match(/Email\s*:\s*(\S+)/i);
      if (usernameMatch && emailMatch) {
        daftarAkun.push({ username: usernameMatch[1], email: emailMatch[1] });
      }
    } 
    // Jika format lama (2 baris)
    else {
      let baris = blok.split('\n').map(b => b.trim()).filter(b => b);
      if (baris.length >= 2) {
        daftarAkun.push({ username: baris[0], email: baris[1] });
      }
    }
  }
  return daftarAkun;
}

// Fungsi menembak API
async function cekTwitter(username) {
  try {
    let response = await fetch(`https://api.fxtwitter.com/${username}`);
    if (response.status === 200) {
      let data = await response.json();
      if (data.user) return true;
    }
  } catch (e) {
    // Abaikan error koneksi dan anggap mati
  }
  return false;
}

// Fungsi Utama Scan
async function mulaiScan() {
  let inputTeks = document.getElementById('inputArea').value;
  let outputArea = document.getElementById('outputArea');
  let statusTeks = document.getElementById('statusTeks');
  
  let daftarTarget = bacaFormatAkun(inputTeks);
  let total = daftarTarget.length;
  
  if (total === 0) {
    statusTeks.innerText = "⚠️ Tidak ada akun yang terbaca!";
    return;
  }
  
  // Reset tampilan
  outputArea.value = "";
  let akunDiScan = 0;
  let akunHidup = 0;
  document.getElementById('btnMulai').disabled = true;
  document.getElementById('btnMulai').innerText = "Sedang Scan...";
  
  // MULTITHREADING DI JAVASCRIPT: Kita jalankan 5 asisten sekaligus
  let batasAsisten = 5; 
  let indexAntrean = 0;
  
  async function asistenPengecek() {
    while (indexAntrean < total) {
      // Ambil antrean
      let akun = daftarTarget[indexAntrean];
      indexAntrean++; // Majukan antrean untuk asisten lain
      
      let statusHidup = await cekTwitter(akun.username);
      akunDiScan++;
      
      // Update Live UI
      statusTeks.innerText = `⏳ Memproses: ${akunDiScan} / ${total} akun...`;
      
      if (statusHidup) {
        akunHidup++;
        outputArea.value += `${akun.username}\n${akun.email}\n\n`;
        // Scroll otomatis ke bawah
        outputArea.scrollTop = outputArea.scrollHeight; 
      }
    }
  }
  
  // Memanggil 5 asisten bekerja bersamaan
  let paraAsisten = [];
  for (let i = 0; i < batasAsisten; i++) {
    paraAsisten.push(asistenPengecek());
  }
  
  // Tunggu semua asisten selesai
  await Promise.all(paraAsisten);
  
  statusTeks.innerText = `🎉 Selesai! Menemukan ${akunHidup} akun hidup.`;
  document.getElementById('btnMulai').disabled = false;
  document.getElementById('btnMulai').innerText = "Mulai Scan Ulang";
}

// Fungsi untuk tombol Salin
function salinHasil() {
  let outputTeks = document.getElementById('outputArea');
  if (outputTeks.value.trim() === "") return;
  
  // Memilih dan menyalin teks
  outputTeks.select();
  navigator.clipboard.writeText(outputTeks.value).then(() => {
    let btn = document.getElementById('btnSalin');
    btn.innerText = "✅ Berhasil Disalin!";
    setTimeout(() => { btn.innerText = "Salin Akun Hidup"; }, 2000);
  });
}