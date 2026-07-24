import fetch from "node-fetch"

let handler = async (m, { conn, args, text }) => {
  // Mengambil URL dari argumen (mengabaikan teks kualitas karena API ini direct)
  const url = args.find(v => v.match(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//))
  
  if (!url) {
    return conn.reply(m.chat, "🔗 Kirim URL YouTube yang valid!\n\nContoh:\n.ytmp4 https://youtu.be/xxxx", m)
  }

  await m.react('🕒')

  try {
    // Memanggil API baru
    const api = `https://api-faa.my.id/faa/ytmp4?url=${encodeURIComponent(url)}`
    const res = await fetch(api)
    
    if (!res.ok) throw new Error(`API Down atau Error: ${res.statusText}`)
    
    const json = await res.json()

    // Validasi respon sesuai format yang kamu berikan
    if (!json.status || !json.result?.download_url) {
      throw new Error("Gagal mendapatkan link download dari API.")
    }

    const videoUrl = json.result.download_url
    
    // Kirim pesan sebagai video langsung menggunakan URL (lebih hemat RAM bot)
    await conn.sendMessage(m.chat, {
      video: { url: videoUrl },
      mimetype: 'video/mp4',
      caption: `🎬 *YouTube Video*\n🚩 Format: ${json.result.format}\n\n*Note:* Jika video tidak muncul, link mungkin kedaluwarsa.`,
      fileName: `video.mp4`
    }, { quoted: m })

    await m.react('✅')

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, `❌ Gagal download video:\n${e.message}`, m)
  }
}

handler.help = ['ytmp4 <url>']
handler.tags = ['download']
handler.command = /^ytv|ytmp4$/i
handler.limit = true
handler.register = true

export default handler