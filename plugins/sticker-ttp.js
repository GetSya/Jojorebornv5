import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // 1. Validasi Input (Cek quoted message atau teks langsung)
    let txt = m.quoted ? m.quoted.text : text
    if (!txt) throw `Masukkan teks yang ingin dijadikan stiker!\nContoh: *${usedPrefix + command}* pspsps`
    
    // Batasi panjang teks agar hasil gambar tetap bagus
    if (txt.length > 100) throw `Teks terlalu panjang! Maksimal 100 karakter.`

    try {
        await m.react('🕒')

        // 2. URL API TTP (Text To PNG)
        // Menggunakan endpoint: https://brat.siputzx.my.id/meme/text?text=
        let url = `https://brat.siputzx.my.id/meme/text?text=${encodeURIComponent(txt)}`

        // 3. Proses Pembuatan Stiker menggunakan fungsi internal lib/sticker.js
        // sticker(buffer, url, packname, author)
        let stiker = await sticker(false, url, global.packname, global.author)

        if (stiker) {
            // Kirim sebagai stiker jika berhasil dikonversi
            await conn.sendFile(m.chat, stiker, 'ttp.webp', '', m)
            await m.react('✅')
        } else {
            // Fallback: Kirim sebagai gambar PNG jika konversi stiker gagal
            await conn.sendFile(m.chat, url, 'ttp.png', `*TTP:* ${txt}`, m)
            await m.react('⚠️')
        }
    } catch (e) {
        console.error(e)
        await m.react('❌')
        m.reply(`Terjadi kesalahan: ${e.message}`)
    }
}

handler.help = ['ttp <teks>']
handler.tags = ['sticker']
handler.command = /^(ttp)$/i
handler.limit = true

export default handler