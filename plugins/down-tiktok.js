import { fetchTiktok, tiktokVideoCaption } from '../lib/tiktokdl.js'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const url = args[0] || m.quoted?.text
  if (!url || !/tiktok\.com|vt\.tiktok/.test(url)) {
    return m.reply(
      `🔗 Kirim URL TikTok yang valid!\n\nContoh:\n${usedPrefix + command} https://www.tiktok.com/@user/video/123...`
    )
  }

  await m.react('🕒').catch(() => {})

  try {
    // API FAA (utama) -> fallback Siputzx (di dalam fetchTiktok)
    const result = await fetchTiktok(url)

    // Gambar/slideshow: kirim tiap gambar TANPA caption
    if (result.kind === 'images') {
      for (const img of result.images) {
        await conn.sendMessage(m.chat, { image: { url: img } }, { quoted: m })
      }
      await m.react('✅').catch(() => {})
      return
    }

    // Video: kirim 1 video + caption berisi datanya
    await conn.sendMessage(m.chat, {
      video: { url: result.video },
      mimetype: 'video/mp4',
      caption: tiktokVideoCaption(result.meta)
    }, { quoted: m })
    await m.react('✅').catch(() => {})

  } catch (e) {
    console.error('[tiktok]', e?.message || e)
    await m.react('❌').catch(() => {})
    m.reply(`❌ Gagal download TikTok.\n${e?.message || 'Coba lagi nanti.'}`)
  }
}

handler.help = ['tiktok <url>', 'tt <url>']
handler.tags = ['downloader']
handler.command = /^(tiktok|tt|ttdl|ttvideo)$/i
handler.limit = true

export default handler
