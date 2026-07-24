import fs from 'fs'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(`Masukkan kodenya!\nContoh: *${usedPrefix + command} GIFTCODE*`)

    const path = './json/tknredeem.json'
    if (!fs.existsSync(path)) return m.reply('❌ Database redeem tidak ditemukan.')

    let dbToken = {}
    try {
        dbToken = JSON.parse(fs.readFileSync(path, 'utf-8'))
    } catch (e) {
        return m.reply('❌ Database rusak.')
    }

    const inputCode = text.trim().toLowerCase()

    // 1. Cek keberadaan kode
    if (!dbToken[inputCode]) return m.reply('❌ Kode redeem tidak valid.')

    let token = dbToken[inputCode]
    let jid = m.sender

    // 2. Cek apakah waktu sudah expired
    if (Date.now() > token.expiry) {
        return m.reply('❌ Maaf, waktu untuk kode ini sudah habis (Expired).')
    }

    // 3. CEK APAKAH USER SUDAH ADA DI KOLOM USER: {}
    if (token.user[jid]) {
        return m.reply('❌ Kamu sudah menggunakan kode ini sebelumnya!')
    }

    // 4. Proses Hadiah
    let user = global.db.data.users[jid]
    if (!user) return m.reply('❌ Data kamu tidak terdaftar di database bot.')

    user.money = (user.money || 0) + token.money
    user.limit = (user.limit || 0) + token.limit

    // 5. Masukkan user ke kolom user: {} dengan keterangan waktu redeem
    token.user[jid] = {
        name: m.pushName || 'User',
        redeemedAt: new Date().toLocaleString()
    }

    // Simpan kembali
    fs.writeFileSync(path, JSON.stringify(dbToken, null, 2))

    m.reply(`🎉 *REDEEM BERHASIL!*\n\n💰 *+${token.money.toLocaleString()} Money*\n🎫 *+${token.limit} Limit*\n\nTerima kasih telah menggunakan layanan kami!`)
}

handler.help = ['redeem']
handler.tags = ['main']
handler.command = /^(redeem)$/i

export default handler