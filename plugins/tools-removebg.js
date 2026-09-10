import axios from 'axios'
import FormData from 'form-data'

// Upload ke Uguu (utama, seperti editimg) -> fallback Catbox
const uploadUguu = async (buffer, ext = 'jpg') => {
  const form = new FormData()
  form.append('files[]', buffer, { filename: `upload.${ext}` })
  const res = await axios.post('https://uguu.se/upload.php', form, {
    headers: form.getHeaders(),
    timeout: 90000
  })
  const url = res.data?.files?.[0]?.url
  if (!url) throw new Error('Uguu tidak mengembalikan URL')
  return url
}

const uploadCatbox = async (buffer, ext = 'jpg') => {
  const form = new FormData()
  form.append('reqtype', 'fileupload')
  form.append('fileToUpload', buffer, { filename: `upload.${ext}` })
  const res = await axios.post('https://catbox.moe/user/api.php', form, {
    headers: form.getHeaders(),
    timeout: 90000
  })
  const url = typeof res.data === 'string' ? res.data.trim() : ''
  if (!/^https?:\/\//.test(url)) throw new Error('Catbox gagal')
  return url
}

const uploadImage = async (buffer, ext) => {
  try {
    return await uploadUguu(buffer, ext)
  } catch (e) {
    console.error('[removebg] uguu gagal, coba catbox:', e.message)
    return await uploadCatbox(buffer, ext)
  }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || q.mediaType || ''

    let imageUrl = null

    // 1. Dari reply / kirim foto -> upload dulu
    if (/image/.test(mime)) {
      const media = await q.download()
      if (!media?.length) throw 'Gagal mengunduh media!'
      let ext = (mime.split('/')[1] || 'jpg').split(';')[0]
      if (ext === 'jpeg') ext = 'jpg'
      await m.reply('⏳ Mengupload gambar...')
      imageUrl = await uploadImage(media, ext)
    } else {
      // 2. Dari URL gambar langsung di text
      const urlMatch = (text || '').match(/https?:\/\/\S+/)
      if (urlMatch) imageUrl = urlMatch[0]
    }

    if (!imageUrl) {
      throw `Kirim / reply foto dengan caption:\n` +
            `${usedPrefix + command}\n\n` +
            `Atau:\n${usedPrefix + command} <url gambar>\n\n` +
            `Contoh:\n${usedPrefix + command} https://example.com/foto.jpg`
    }

    await m.reply('⏳ Menghapus background...')

    // 3. Panggil API removebg (balasan = JSON berisi url hasil)
    const apiUrl = `https://api-faa.my.id/faa/removebg?url=${encodeURIComponent(imageUrl)}`
    const res = await axios.get(apiUrl, { timeout: 120000 })
    const resultUrl = res.data?.url || res.data?.result?.url || res.data?.data?.url
    if (!resultUrl) throw 'API tidak mengembalikan URL hasil.'

    // 4. Kirim sebagai DOKUMEN agar background transparan tidak rusak
    //    (kalau dikirim sebagai image, WhatsApp mengubahnya jadi JPG)
    await conn.sendMessage(m.chat, {
      document: { url: resultUrl },
      mimetype: 'image/png',
      fileName: 'removebg.png',
      caption: '✨ Background berhasil dihapus'
    }, { quoted: m })

  } catch (e) {
    console.error('[removebg]', e?.message || e)
    m.reply(typeof e === 'string' ? `❌ ${e}` : `❌ Gagal hapus background.\n${e?.message || 'Coba lagi nanti.'}`)
  }
}

handler.help = ['removebg <reply foto / url>']
handler.tags = ['tools']
handler.command = /^(removebg|nobg|hapusbg)$/i
handler.limit = true

export default handler
