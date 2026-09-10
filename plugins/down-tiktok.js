import axios from 'axios'

// ── API 1 (utama): api-faa ──
async function viaFaa(url) {
  const { data } = await axios.get(
    `https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`,
    { timeout: 60000 }
  )
  const r = data?.result
  if (!data?.status || !r) throw new Error('FAA tidak mengembalikan data')

  // Slideshow / foto: data berupa array, atau type image
  if (Array.isArray(r.data)) return { kind: 'images', images: r.data.filter(Boolean), meta: r }
  if (/image/i.test(r.type || '')) {
    const raw = Array.isArray(r.images) ? r.images : [r.data].filter(Boolean)
    const images = raw.map((x) => (typeof x === 'string' ? x : (x?.url || x?.link))).filter(Boolean)
    if (!images.length) throw new Error('FAA: gambar tidak ditemukan')
    return { kind: 'images', images, meta: r }
  }

  const videoUrl = r.alternatives?.hd || r.data
  if (!videoUrl || typeof videoUrl !== 'string') throw new Error('FAA: video tidak ditemukan')
  return { kind: 'video', video: videoUrl, meta: r }
}

// ── API 2 (fallback): siputzx ──
async function viaSiputzx(url) {
  const { data } = await axios.get(
    `https://api.siputzx.my.id/api/d/tiktok/v2?url=${encodeURIComponent(url)}`,
    { timeout: 60000 }
  )
  const d = data?.data
  if (!data?.status || !d) throw new Error('Siputzx tidak mengembalikan data')

  if (Array.isArray(d.images) && d.images.length) {
    const images = d.images.map((x) => (typeof x === 'string' ? x : (x?.url || x?.link))).filter(Boolean)
    if (!images.length) throw new Error('Siputzx: gambar tidak ditemukan')
    return { kind: 'images', images, meta: d }
  }

  const videoUrl = d.no_watermark_link_hd || d.no_watermark_link || d.watermark_link
  if (!videoUrl) throw new Error('Siputzx: video tidak ditemukan')
  return { kind: 'video', video: videoUrl, meta: d }
}

function videoCaption(meta = {}) {
  const lines = ['🎬 *TIKTOK VIDEO*']
  const title = meta.title || meta.desc || meta.description
  if (title) lines.push(`📝 ${title}`)
  if (meta.duration) lines.push(`⏱️ Durasi: ${meta.duration}`)
  if (meta.taken_at) lines.push(`📅 ${meta.taken_at}`)
  if (meta.region) lines.push(`🌍 Region: ${meta.region}`)
  const id = meta.id || meta.itemId
  if (id) lines.push(`🆔 ${id}`)
  return lines.join('\n')
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const url = args[0] || m.quoted?.text
  if (!url || !/tiktok\.com|vt\.tiktok/.test(url)) {
    return m.reply(
      `🔗 Kirim URL TikTok yang valid!\n\nContoh:\n${usedPrefix + command} https://www.tiktok.com/@user/video/123...`
    )
  }

  await m.react('🕒').catch(() => {})

  try {
    // Coba API utama, gagal -> fallback
    let result
    try {
      result = await viaFaa(url)
    } catch (e) {
      console.error('[tiktok] FAA gagal, coba siputzx:', e.message)
      result = await viaSiputzx(url)
    }

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
      caption: videoCaption(result.meta)
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
