let handler = async (m, { conn }) => {
    // 1. Ambil semua data user dari database global
    let users = global.db.data.users
    let botJid = conn.user.jid

    // 2. Olah data: Ambil JID dan Money, lalu filter
    let daftarKaya = Object.entries(users)
        .map(([jid, val]) => {
            return {
                jid: jid,
                money: val.money || 0,
                name: val.name || conn.getName(jid)
            }
        })
        .filter(user => user.jid !== botJid && user.money > 0) // Filter bot & user yang gak punya uang

    // 3. Urutkan dari yang paling tajir
    daftarKaya.sort((a, b) => b.money - a.money)

    // 4. Ambil Top 10
    let top10 = daftarKaya.slice(0, 10)

    if (top10.length === 0) throw '❌ Belum ada data kekayaan di database.'

    // 5. Susun Teks
    let text = `👑 *TOP 10 USER TERKAYA* 👑\n`
    text += `_(Berdasarkan Database Global)_\n\n`
    
    text += top10.map((user, i) => {
        let cleanJid = user.jid.split('@')[0]
        return `${i + 1}. *${user.name}* (@${cleanJid})\n   💰 Saldo: *Rp${parseInt(user.money).toLocaleString('id-ID')}*`
    }).join('\n\n')

    // 6. Hitung total uang beredar
    let totalUang = daftarKaya.reduce((a, b) => a + b.money, 0)
    text += `\n\n________________________\nTotal uang rakyat: *Rp${totalUang.toLocaleString('id-ID')}*`

    // 7. Kirim dengan mention
    conn.reply(m.chat, text, m, {
        mentions: top10.map(v => v.jid)
    })
}

handler.help = ['topkaya']
handler.tags = ['ekonomi']
handler.command = /^(topkaya|leaderboard|terkaya)$/i

export default handler