import fs from 'fs'

export async function all(m) {
    // 1. Filter: Hanya proses jika di Private Chat, bukan dari bot sendiri, dan ada teks
    if (m.isGroup || m.fromMe || !m.text) return

    // 2. Filter: Jangan teruskan jika itu adalah perintah (diawali prefix)
    const prefix = /^[./!#]/
    if (prefix.test(m.text)) return

    // 3. Baca database
    let setting = {}
    if (fs.existsSync('./json/setgrup.json')) {
        setting = JSON.parse(fs.readFileSync('./json/setgrup.json'))
    }
    
    // 4. Cek apakah user pengirim (m.sender) punya sesi aktif
    if (!setting[m.sender]) return

    try {
        let targetGrup = setting[m.sender].chat
        let groupMetadata = await this.groupMetadata(targetGrup)
        let participants = groupMetadata.participants

        // 5. Teruskan sebagai hidetag
        await this.sendMessage(targetGrup, {
            text: m.text,
            mentions: participants.map(a => a.id)
        })

        // Feedback ke user di PM
        await m.reply(`🚀 *Terkirim ke:* ${setting[m.sender].name}`)

    } catch (e) {
        console.error("Error Ultimate Hidetag:", e)
        // Jika grup tidak ketemu/bot dikick, hapus sesi agar tidak error terus
        delete setting[m.sender]
        fs.writeFileSync('./json/setgrup.json', JSON.stringify(setting, null, 2))
        await m.reply('❌ Gagal mengirim. Grup target tidak ditemukan, sesi dimatikan.')
    }
}