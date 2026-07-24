import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // 1. Validasi Input (Cek quoted message atau teks langsung)
    let txt = m.quoted ? m.quoted.text : text
    if (!txt) throw `Kirim/Reply teks yang ingin dijadikan stiker!\nContoh: *${usedPrefix + command}* Halo Arasya`
    
    // Opsional: Batasi panjang teks agar tidak terlalu kecil di stiker
    if (txt.length > 200) throw `Teks terlalu panjang!`

    try {
        await m.react('🕒')

        // 2. URL API Brat
        let url = `https://brat.siputzx.my.id/image?text=${encodeURIComponent(txt)}`

        // 3. Proses Pembuatan Stiker menggunakan fungsi internal lib/sticker.js
        // sticker(buffer, url, packname, author)
        let stiker = await sticker(false, url, `My Sticker`, `Sticker Akuh`)

        if (stiker) {
            await conn.sendFile(m.chat, stiker, 'brat.webp', '', m)
            await m.react('✅')
        } else {
            // Fallback: Jika stiker gagal dibuat, kirim sebagai gambar (seperti konsep bajingan)
            await conn.sendFile(m.chat, url, 'brat.png', `*Brat:* ${txt}`, m)
            await m.react('⚠️')
        }
    } catch (e) {
        console.error(e)
        await m.react('❌')
        m.reply(`Terjadi kesalahan: ${e.message}`)
    }
}

handler.help = ['brat <teks>']
handler.tags = ['sticker']
handler.command = /^(brat)$/i
handler.limit = true

export default handler