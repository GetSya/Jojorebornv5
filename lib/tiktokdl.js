// Shared TikTok downloader: API FAA (utama) -> Siputzx (fallback).
// Dipakai command .tiktok (plugins/down-tiktok.js) & auto-download (handler.js).

async function getJson(url, timeoutMs = 60000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

// ── API 1 (utama): api-faa ──
async function viaFaa(url) {
  const data = await getJson(`https://api-faa.my.id/faa/tiktok?url=${encodeURIComponent(url)}`)
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
  const data = await getJson(`https://api.siputzx.my.id/api/d/tiktok/v2?url=${encodeURIComponent(url)}`)
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

// Hasil: { kind: 'video', video, meta } | { kind: 'images', images[], meta }
export async function fetchTiktok(url) {
  try {
    return await viaFaa(url)
  } catch (e) {
    console.error('[tiktokdl] FAA gagal, coba siputzx:', e?.message || e)
    return await viaSiputzx(url)
  }
}

// Caption video dari metadata (hanya field yang tersedia)
export function tiktokVideoCaption(meta = {}) {
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
