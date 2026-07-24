import Sticker from 'wa-sticker-formatter' // FIXED: Changed to default import
import fetch from 'node-fetch'

let handler = async (m, { conn, text }) => {
    // Logic to handle quoted text or input text
    if (m.quoted && m.quoted.text) {
        text = m.quoted.text
    } else if (text) {
        text = text
    } else if (!text && !m.quoted) {
        return m.reply('Reply pesan atau masukkan teks! Contoh: .brathd hallo')
    }

    try {
        await m.react('🕒')

        // Construct the API URL
        const apiUrl = `https://brat.siputzx.my.id/gif?text=${encodeURIComponent(text)}`

        // 1. Fetch the image buffer first (More stable than passing URL directly)
        const response = await fetch(apiUrl)
        const buffer = await response.buffer()

        // 2. Create the sticker
        let stiker = await createSticker(
            buffer, 
            null, // URL is null because we are passing buffer
            "My Sticker",
            "Sticker Saya",
            20 // Increased quality slightly for better text readability
        )

        if (stiker) {
            await conn.sendFile(m.chat, stiker, 'brathd.webp', '', m)
            await m.react('✅')
        } else {
            await m.react('❌')
            m.reply('Gagal membuat sticker.')
        }

    } catch (e) {
        console.error(e)
        await m.react('❌')
        m.reply('Terjadi kesalahan pada server atau API.')
    }
}

handler.help = ['brathd <text>']
handler.tags = ['sticker']
handler.command = /^(brathd)$/i
handler.limit = true
handler.register = false
handler.group = false

export default handler

async function createSticker(img, url, packName, authorName, quality) {
    let stickerMetadata = {
        type: 'full', // Changed to 'full' so text doesn't get cropped
        pack: packName,
        author: authorName,
        quality
    }
    // If img (buffer) is present use it, otherwise use url
    return (new Sticker(img ? img : url, stickerMetadata)).toBuffer()
}