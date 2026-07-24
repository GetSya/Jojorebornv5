let handler = async (m, { conn }) => {
    // 1. Tentukan target
    let who = m.isGroup 
        ? (m.mentionedJid[0] ? m.mentionedJid[0] : (m.quoted ? m.quoted.sender : m.sender)) 
        : (m.quoted ? m.quoted.sender : m.sender)

    // 2. Ambil data langsung dari database global
    let user = global.db.data.users[who]

    if (!user) throw 'User tidak ditemukan di database!'

    let name = user.name || conn.getName(who)
    let saldo = user.money || 0 // Diambil dari global.db.data.users[who].money

    let text = `✨ *SALDO USER*

👤 *Username* : ${name}
💰 *Uang* : Rp${parseInt(saldo).toLocaleString('id-ID')}
📊 *Limit* : ${user.limit}

*Note:* Gunakan bot dengan bijak!`.trim()

    conn.sendMessage(m.chat, { text }, { quoted: m })
}

handler.help = ['uang [@user]']
handler.tags = ['ekonomi']
handler.command = /^(uang|money|saldo|balance)$/i

export default handler