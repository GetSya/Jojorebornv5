let handler = async (m, { conn, args, usedPrefix, command }) => {
    let who = m.mentionedJid[0] ? m.mentionedJid[0] : (m.quoted ? m.quoted.sender : null)
    if (!who) throw `Tag atau balas pesan orang yang ingin ditransfer!`
    
    let txt = args[0] || args[1]
    if (!txt || isNaN(txt)) throw `Masukkan jumlah uang! Contoh: ${usedPrefix + command} 5000 @user`
    
    let jumlah = parseInt(txt)
    let pengirim = global.db.data.users[m.sender]
    let penerima = global.db.data.users[who]

    if (pengirim.money < jumlah) throw `Uang kamu tidak cukup untuk transfer Rp${jumlah.toLocaleString('id-ID')}`
    if (jumlah < 100) throw `Minimal transfer adalah Rp100`

    // Proses Transfer
    pengirim.money -= jumlah
    penerima.money += jumlah

    m.reply(`✅ *TRANSFER BERHASIL*\n\n💰 Sejumlah: Rp${jumlah.toLocaleString('id-ID')}\n👤 Ke: @${who.split('@')[0]}`, null, { mentions: [who] })
}

handler.help = ['transfer <jumlah>  @user']
handler.tags = ['ekonomi']
handler.command = /^(transfer|tf)$/i
handler.group = true

export default handler