/* FILE: game-mancing-move.js
  Berfungsi untuk berpindah lokasi mancing di database utama
*/

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // 1. Ambil data dari database pusat
    let u = global.db.data.users[m.sender]
    
    // Inisialisasi jika data dasar belum ada
    if (!u) throw '⚠️ Data kamu tidak ditemukan. Silahkan chat dulu.'
    if (typeof u.level === 'undefined') u.level = 1
    if (typeof u.location === 'undefined') u.location = 'Empang'

    // 2. Konfigurasi Lokasi (Pastikan Nama Lokasi SAMA dengan di game-mancing.js)
    const travelLoc = {
        'empang': { minLevel: 1, name: 'Empang', emoji: '🏡' },
        'sungai': { minLevel: 5, name: 'Sungai', emoji: '🌊' },
        'laut': { minLevel: 15, name: 'Laut', emoji: '🚢' },
        'abyss': { minLevel: 1000, name: 'Abyss', emoji: '🌋' }
    }

    let target = args[0]?.toLowerCase()

    // 3. Jika tidak ada input lokasi, tampilkan daftar lokasi
    if (!target || !travelLoc[target]) {
        let txt = `📍 *DAFTAR LOKASI MEMANCING*\n\n`
        for (let key in travelLoc) {
            let info = travelLoc[key]
            let lock = u.level >= info.minLevel ? '✅' : '🔒'
            let current = u.location === info.name ? '*(📍 Kamu di sini)*' : ''
            
            txt += `${lock} *${info.name}* ${info.emoji}\n`
            txt += `   └ Min. Lv.${info.minLevel} ${current}\n`
        }
        txt += `\n*Cara pindah:* ${usedPrefix}${command} sungai`
        return m.reply(txt)
    }

    let loc = travelLoc[target]

    // 4. Validasi Level
    if (u.level < loc.minLevel) {
        throw `❌ Level kamu tidak cukup! Kamu butuh *Lv.${loc.minLevel}* untuk pergi ke ${loc.name}.`
    }

    // 5. Cek jika sudah di lokasi tersebut
    if (u.location === loc.name) {
        throw `📍 Kamu sudah berada di ${loc.name}!`
    }

    // 6. Proses Perpindahan (Animasi)
    const { key } = await conn.sendMessage(m.chat, { text: `🚗 Bersiap menuju ${loc.name}...` }, { quoted: m })
    
    await new Promise(res => setTimeout(res, 2000))

    // 7. UPDATE DATABASE (PENTING)
    // Kita langsung update variabel 'u' karena itu referensi ke global.db.data.users
    u.location = loc.name

    // 8. Kirim pesan sukses (Edit Message)
    await conn.sendMessage(m.chat, { 
        text: `✅ *TIBA!* Kamu sekarang berada di *${loc.name}* ${loc.emoji}.\nSiapkan umpanmu dan ketik *.mancing*!`, 
        edit: key 
    })
}

handler.help = ['move [lokasi]', 'pindah']
handler.tags = ['game']
handler.command = /^(move|pindah|pergi)$/i

export default handler