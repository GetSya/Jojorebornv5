import fs from 'fs'

let handler = async (m, { conn }) => {
    const jtPath = './json/jt.json'
    
    // 1. Cek apakah file ada
    if (!fs.existsSync(jtPath)) {
        return m.reply('❌ Belum ada data jatuh tempo yang tersimpan.')
    }

    let dataJt = JSON.parse(fs.readFileSync(jtPath, 'utf-8'))
    
    // 2. Cek apakah ada isinya
    if (dataJt.length === 0) {
        return m.reply('❌ Daftar jatuh tempo kosong.')
    }

    // Ambil waktu sekarang untuk perbandingan
    let sekarang = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    let hariIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());

    let teks = `*Daftar Jatuh Tempo (Total: ${dataJt.length})*\n\n`

    dataJt.forEach((item, index) => {
        let [y, m_bln, d] = item.tanggal.split('-')
        let tglTarget = new Date(y, m_bln - 1, d)
        
        // Hitung selisih hari
        let selisihMili = tglTarget.getTime() - hariIni.getTime();
        let sisaHari = Math.round(selisihMili / (1000 * 60 * 60 * 24));

        let status = ''
        if (sisaHari < 0) {
            status = `❌ *SUDAH LEWAT* (${Math.abs(sisaHari)} hari lalu)`
        } else if (sisaHari === 0) {
            status = `🚨 *HARI INI*`
        } else if (sisaHari <= 3) {
            status = `⚠️ *${sisaHari} HARI LAGI*`
        } else {
            status = `✅ *${sisaHari} HARI LAGI*`
        }

        teks += `${index + 1}. *${item.target}*\n`
        teks += `   📅 Tgl: ${d}-${m_bln}-${y}\n`
        teks += `   🔔 Status: ${status}\n\n`
    })

    teks += `_Gunakan *cancel* saat input /setjt untuk membatalkan sesi._`

    await m.reply(teks)
}

handler.command = /^(listjt)$/i

export default handler