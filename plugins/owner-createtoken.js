import fs from 'fs'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(`*Format Salah!*\n\nContoh: ${usedPrefix + command} GIFTCODE`)

    const path = './json/tknredeem.json'
    const code = text.trim().toLowerCase() 
    
    if (!fs.existsSync('./json')) fs.mkdirSync('./json')

    let dbToken = {}
    if (fs.existsSync(path)) {
        try {
            const content = fs.readFileSync(path, 'utf-8')
            dbToken = content ? JSON.parse(content) : {}
        } catch (e) {
            dbToken = {}
        }
    }

    if (dbToken[code]) return m.reply('❌ Kode tersebut sudah ada!')

    // Waktu expired 10 jam dari sekarang
    const expiryTime = Date.now() + (10 * 60 * 60 * 1000)

    dbToken[code] = {
        money: 50000,
        limit: 15,
        expiry: expiryTime,
        user: {}, // Kolom untuk mencatat JID user yang redeem
        createdAt: new Date().toLocaleString()
    }

    fs.writeFileSync(path, JSON.stringify(dbToken, null, 2))
    m.reply(`✅ *TOKEN BERHASIL DIBUAT*\n\nKode: *${code.toUpperCase()}*\nHadiah: 50.000 Money & 15 Limit\nExpired: 10 Jam ke depan.\n\nKetik /redeem ${code.toUpperCase()}`)
}

handler.help = ['create-token']
handler.tags = ['owner']
handler.command = /^(create-token|createtoken)$/i
handler.owner = true

export default handler