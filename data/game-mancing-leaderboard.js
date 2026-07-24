/* FILE: game-mancing-leaderboard.js 
   Mengambil data peringkat langsung dari database utama bot
*/

let handler = async (m, { conn, usedPrefix }) => {
    // 1. Ambil seluruh data user dari database pusat
    let users = global.db.data.users
    
    // 2. Ubah objek database menjadi array dan filter hanya yang pernah mancing
    let pemancing = Object.entries(users)
        .map(([jid, stats]) => {
            return {
                jid,
                level: stats.level || 0,
                total_tangkapan: stats.total_tangkapan || 0
            }
        })
        .filter(user => user.total_tangkapan > 0 || user.level > 1) // Hanya tampilkan yang sudah mulai main

    if (pemancing.length === 0) throw '⚠️ Belum ada data pemancing di database!'

    // 3. Sortir: Level tertinggi dahulu, jika sama cek Total Tangkapan
    pemancing.sort((a, b) => {
        if (b.level !== a.level) {
            return b.level - a.level
        }
        return b.total_tangkapan - a.total_tangkapan
    })

    // 4. Ambil Top 10
    let top10 = pemancing.slice(0, 10)
    
    let text = `🏆 *PAPAN PERINGKAT PEMANCING SAKTI* 🏆\n`
    text += `_Menampilkan 10 Master Angler Terbaik_\n`
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`

    top10.forEach((user, i) => {
        let name = conn.getName(user.jid)
        let badge = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : '🎗️'))
        
        text += `${badge} *RANK ${i + 1}* - ${name}\n`
        text += `   ╰  🏅 *Lv.${user.level}* | 🎣 *${user.total_tangkapan} Ekor*\n\n`
    })

    text += `━━━━━━━━━━━━━━━━━━━━\n`
    text += `_Gunakan *${usedPrefix}mancing* untuk menaikkan peringkatmu!_`

    // 5. Kirim pesan dengan mention ke top 10
    conn.reply(m.chat, text, m, {
        mentions: top10.map(v => v.jid)
    })
}

handler.help = ['leaderboardmancing', 'topmancing']
handler.tags = ['game']
handler.command = /^(leaderboardmancing|topmancing|lbman|lbfishing)$/i

export default handler