/* FILE: game-mancing-fish_stats.js 
  Data diambil otomatis dari global.db.data (./database.json)
*/

let handler = async (m, { conn, usedPrefix }) => {
    // 1. Ambil data user dari database global
    let u = global.db.data.users[m.sender]
    
    // 2. Cek apakah user ada di database
    if (!u) {
        throw `⚠️ Kamu belum terdaftar di database! Ketik apapun untuk mendaftar otomatis.`
    }

    // 3. Pastikan nilai default jika data mancing masih kosong (agar tidak NaN)
    let level = u.level || 1
    let exp = u.exp || 0
    let totalTangkap = u.total_tangkapan || 0
    let rod = (typeof u.rod !== 'undefined') ? u.rod : 100
    let location = u.location || 'Empang'
    let bait = u.bait || 'None'
    let bait_count = u.bait_count || 0

    // --- LOGIKA PROGRESS BAR EXP ---
    let xpNeeded = level * 500
    let persenAsli = Math.floor((exp / xpNeeded) * 100)
    let persenVisual = Math.min(100, persenAsli)
    let persenExp = Math.min(100, Math.floor((exp / xpNeeded) * 100))
    let barFull = Math.floor(persenExp / 10)
    let barEmpty = 10 - barFull
    let visualBar = '▓'.repeat(barFull) + '░'.repeat(barEmpty)

    // --- LOGIKA STATUS LUCK ---
    let statusLuck = totalTangkap < 10 
        ? '🔥 GACOR (Newbie Buff)' 
        : (level > 20 ? '💎 Professional' : '✨ Normal')

    // --- LOGIKA KONDISI ALAT ---
    let rodStatus = rod > 70 ? '🟢 Bagus' : (rod > 30 ? '🟡 Aus' : '🔴 Rusak Parah')

    let txt = `
🎣 *PROFIL PEMANCING* 🎣
━━━━━━━━━━━━━━━━━━━━
👤 *Nama:* ${conn.getName(m.sender)}
🍀 *Status Luck:* ${statusLuck}
🎣 *Total Tangkap:* ${totalTangkap} Ikan
━━━━━━━━━━━━━━━━━━━━

📊 *STATISTIK LEVEL*
🏅 *Level:* ${level}
✨ *Exp:* ${exp} / ${xpNeeded}
${visualBar} [${persenExp}%]

📍 *INFO LOKASI & ALAT*
🗺️ *Lokasi:* ${location}
🛠️ *Kondisi Rod:* ${rod}% (${rodStatus})
🪱 *Stok Umpan:* ${bait_count}x ${bait}

💡 *Tips:* ${totalTangkap < 10 
    ? '_Manfaatkan sisa Gacor-mu untuk mencari ikan mahal!_' 
    : '_Tingkatkan levelmu untuk memancing di Laut atau Abyss!_'}
━━━━━━━━━━━━━━━━━━━━
    `.trim()

    // 4. Kirim pesan
    conn.reply(m.chat, txt, m)
}

handler.help = ['fishstats', 'fstat']
handler.tags = ['game']
handler.command = /^(fishstats|fstat|mystat|profilmancing)$/i

export default handler