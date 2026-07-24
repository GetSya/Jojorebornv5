import { sticker } from '../lib/sticker.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // 1. Validasi Input
    if (!text) throw `Masukan Nama!\nContoh: *${usedPrefix + command}* Arasya`
    if (text.length > 30) throw `Teks terlalu panjang! Maksimal 30 karakter.`

    // 2. URL API Memegen (Menggunakan template "Bajingan Lu")
    // Note: Pastikan URL background https://telegra.ph/file/d608ec3cb57ff6b9ac708.jpg masih aktif
    let q = encodeURIComponent(text)
    let url = `https://api.memegen.link/images/custom/Bajingan_Lu/${q}.png?background=https://telegra.ph/file/d608ec3cb57ff6b9ac708.jpg`

    // 3. Proses Pembuatan Stiker
    try {
        let stiker = await sticker(false, url, global.packname, global.author)
        if (stiker) return conn.sendFile(m.chat, stiker, 'bajingan.webp', '', m)
        
        // Fallback jika lib sticker gagal, kirim sebagai gambar
        await conn.sendFile(m.chat, url, 'bajingan.png', `*Bajingan Lu ${text}*`, m)
    } catch (e) {
        console.error(e)
        m.reply('❌ Terjadi kesalahan saat membuat stiker. Pastikan link gambar background masih aktif.')
    }
}

handler.help = ['bajingan <nama>']
handler.tags = ['sticker']
handler.command = /^(bajingan)$/i
handler.limit = true // Menggunakan limit sesuai sistem bot kamu
handler.register = true // Opsional: jika ingin user daftar dulu

export default handler