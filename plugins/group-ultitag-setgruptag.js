import fs from 'fs'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!fs.existsSync('./json')) fs.mkdirSync('./json')
    
    let setting = {}
    if (fs.existsSync('./json/setgrup.json')) {
        setting = JSON.parse(fs.readFileSync('./json/setgrup.json'))
    }

    if (text.toLowerCase() === 'on') {
        if (!m.isGroup) throw '❌ Perintah ini harus dilakukan di dalam grup target!'
        
        setting[m.sender] = {
            chat: m.chat,
            name: await conn.getName(m.chat),
            setAt: new Date().toLocaleString()
        }
        
        fs.writeFileSync('./json/setgrup.json', JSON.stringify(setting, null, 2))
        return m.reply(`✅ *Ultimate Hidetag Aktif!*\n\nTarget: *${setting[m.sender].name}*\n\nApapun (Teks/Media) yang kamu kirim ke PM bot akan diteruskan sebagai hidetag ke sini.`)
    }

    if (text.toLowerCase() === 'off') {
        delete setting[m.sender]
        fs.writeFileSync('./json/setgrup.json', JSON.stringify(setting, null, 2))
        return m.reply('✅ Sesi Ultimate Hidetag dimatikan.')
    }

    throw `❓ *Format Salah*\n\nKetik *${usedPrefix + command} on* di grup tujuan.`
}

handler.help = ['setgruptag on/off']
handler.tags = ['group']
handler.command = /^(setgruptag|setgrup)$/i

export default handler