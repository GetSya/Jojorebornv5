import fetch from "node-fetch"

let handler = async (m, { conn, text }) => {
  if (!text) return m.reply("Contoh: .play kota ini tak sama tanpamu")

  await m.react('🕒')

  try {
    // Memanggil API ytplay dengan query pencarian
    const api = `https://api-faa.my.id/faa/ytplay?query=${encodeURIComponent(text)}`
    const res = await fetch(api)
    
    if (!res.ok) throw new Error("Server API sedang bermasalah.")
    
    const json = await res.json()

    if (!json.status || !json.result) {
      throw new Error("Lagu tidak ditemukan.")
    }

    // Mengambil data dari result sesuai response yang kamu berikan
    const { 
      title, 
      url, 
      mp3, 
      thumbnail, 
      duration, 
      views, 
      published, 
      author 
    } = json.result

    // 1. Kirim info lagu beserta thumbnail sebagai preview awal
    const caption = `
✨ *YT PLAY MUSIC*

> 🎵 *Judul* : ${title}
> 👤 *Artis* : ${author}
> ⏳ *Durasi* : ${duration} detik
> 👁️ *Views* : ${views.toLocaleString()}
> 📅 *Upload* : ${published}

> *Status* : Sedang mengirim audio...
`.trim()

    await conn.sendMessage(m.chat, { 
      image: { url: thumbnail }, 
      caption 
    }, { quoted: m })

    // 2. Ambil buffer audio dari link mp3
    const audioBuffer = await fetch(mp3).then(r => r.buffer())

    // Cek limit ukuran file (WhatsApp limit ~50MB)
    if (audioBuffer.length > 50 * 1024 * 1024) {
      return m.reply(`❌ File terlalu besar.\nKamu bisa download manual di sini: ${mp3}`)
    }

    // 3. Kirim file Audio
    await conn.sendMessage(m.chat, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg'
    }, { quoted: m })

    await m.react('✅')

  } catch (e) {
    console.error(e)
    m.reply(`❌ Terjadi kesalahan:\n${e.message || "Gagal memproses permintaan."}`)
  }
}

handler.help = ["play <judul lagu>"]
handler.tags = ["downloader"]
handler.command = /^play$/i
handler.limit = true

export default handler