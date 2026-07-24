import { Sticker } from 'wa-sticker-formatter'
import axios from "axios"
import FormData from "form-data"

// --- FUNGSI UPLOADER DELINE ---
const uploadDeline = async (buffer, ext = "bin", mime = "application/octet-stream") => {
  const fd = new FormData()
  fd.append("file", buffer, { filename: `file.${ext}`, contentType: mime })

  const res = await axios.post("https://api.deline.web.id/uploader", fd, {
    headers: fd.getHeaders(),
    maxBodyLength: 50 * 1024 * 1024,
    maxContentLength: 50 * 1024 * 1024,
    timeout: 60000
  })

  const data = res.data || {}
  if (data.status === false) throw new Error(data.message || "Upload failed")
  return data?.result?.link || data?.url || data?.path
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    
    // 1. Validasi: Support Gambar dan Stiker
    const isImage = /image\/(jpe?g|png)/.test(mime)
    const isSticker = /webp/.test(mime)

    if (!isImage && !isSticker) throw `Balas *Gambar* atau *Stiker* dengan caption *${usedPrefix + command}* teks_atas|teks_bawah`
    if (!text) throw `Masukan teksnya! Contoh: *${usedPrefix + command}* lu beban|banget`

    try {
        await m.react('🕒')

        // 2. Download Media
        let buffer = await q.download()
        if (!buffer) throw 'Gagal mendownload media.'

        // 3. Proses Upload (Paksa ke PNG jika stiker agar API Memegen bisa baca)
        let ext = isSticker ? 'png' : (mime.split("/")[1] || "jpg")
        let uploadMime = isSticker ? 'image/png' : mime
        let url = await uploadDeline(buffer, ext, uploadMime)
        
        // 4. Parsing Teks
        let [atas, bawah] = text.split('|')
        atas = encodeURIComponent(atas ? atas.trim() : ' ')
        bawah = encodeURIComponent(bawah ? bawah.trim() : ' ')

        // 5. URL API Memegen
        const responseUrl = `https://api.memegen.link/images/custom/${atas}/${bawah}.png?background=${url}`
        
        // 6. Membuat Output Stiker (Sama seperti fitur brat kamu)
        let stiker = await createSticker(
            false,
            responseUrl,
            global.stickpack || 'Smeme Hybrid',
            global.stickauth || 'Bot',
            40 
        )

        if (stiker) {
            await conn.sendFile(m.chat, stiker, 'smeme.webp', '', m)
            await m.react('✅')
        } else {
            throw new Error('Gagal mengonversi stiker')
        }

    } catch (e) {
        console.error("Error Smeme Hybrid:", e)
        await m.react('❌')
        m.reply(`❌ *Terjadi Kesalahan!*\n\nDetail: ${e.message}`)
    }
}

handler.help = ['stcmeme <teks>|<teks2>']
handler.tags = ['maker']
handler.command = /^(smeme|stcmeme|ssmeme)$/i
handler.limit = true

export default handler

/**
 * Fungsi helper stiker menggunakan wa-sticker-formatter
 */
async function createSticker(img, url, packName, authorName, quality) {
    let stickerMetadata = {
        type: 'crop',
        pack: packName,
        author: authorName,
        quality
    }
    return (new Sticker(img ? img : url, stickerMetadata)).toBuffer()
}