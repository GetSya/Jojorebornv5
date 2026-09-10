import axios from 'axios'
import FormData from 'form-data'

// ── ANTRIAN GILIRAN (per chat) ──────────────────────────────
// 1 grup = 1 jalur render: user lain wajib tunggu giliran.
// Private chat juga 1 jalur: tidak bisa render 2x bersamaan.
// Batas MAKS_ANTRI orang menunggu, selebihnya ditolak halus.
const chatQueues = new Map() // chatId -> { tail: Promise, waiting: number }
const MAKS_ANTRI = 3

function ambilSlot(chatId) {
  let state = chatQueues.get(chatId)
  if (!state) {
    state = { tail: Promise.resolve(), waiting: 0 }
    chatQueues.set(chatId, state)
  }
  if (state.waiting >= MAKS_ANTRI) return null // antrian penuh

  state.waiting++
  const position = state.waiting
  const prev = state.tail
  let done
  const mine = new Promise((res) => { done = res })
  state.tail = prev.then(() => mine)

  return {
    prev, // await ini = tunggu giliran
    position, // nomor antrian (1 = langsung jalan)
    release: () => {
      state.waiting--
      done()
      if (state.waiting <= 0) {
        queueMicrotask(() => { if (state.waiting <= 0) chatQueues.delete(chatId) })
      }
    }
  }
}
// ─────────────────────────────────────────────────────────────

// ── BATAS PAKAI (per user, tersimpan di database) ───────────────
// 5x dalam 6 jam. Owner bot (isOwner) = unlimited, tanpa batas.
const BATAS_PAKAI = 5
const WINDOW_MS = 6 * 60 * 60 * 1000 // 6 jam

function getUsage(user) {
  if (!user.editimgUsage || typeof user.editimgUsage !== 'object') {
    user.editimgUsage = { count: 0, reset: 0 }
  }
  const now = Date.now()
  if (now >= (user.editimgUsage.reset || 0)) {
    user.editimgUsage.count = 0
    user.editimgUsage.reset = now + WINDOW_MS
  }
  return user.editimgUsage
}

function sisaWaktu(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(s / 3600)
  const min = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h} jam ${min} menit`
  if (min > 0) return `${min} menit`
  return `${s} detik`
}
// ─────────────────────────────────────────────────────────────

let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
  // 1. Validasi cepat DULU (tidak makan slot antrian kalau input salah)
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || q.mediaType || ''

  // Prompt edit
  let prompt = (text || '').trim()
  if (!prompt) prompt = 'Edit karakter ini jadi tersenyum'

  const isMedia = /image/.test(mime)
  let urlFromText = null
  if (!isMedia) {
    const urlMatch = (text || '').match(/https?:\/\/\S+/)
    if (urlMatch) {
      urlFromText = urlMatch[0]
      prompt = text.replace(urlFromText, '').trim() || prompt
    }
  }

  if (!isMedia && !urlFromText) {
    throw `Kirim / reply foto yang mau diedit dengan caption:\n` +
          `${usedPrefix + command} <prompt>\n\n` +
          `Contoh:\n${usedPrefix + command} Edit karakter ini jadi tersenyum`
  }

  // 2. Cek kuota (owner = unlimited, lewati cek ini)
  const user = global.db.data.users[m.sender]
  if (!isOwner && user) {
    const usage = getUsage(user)
    if (usage.count >= BATAS_PAKAI) {
      return m.reply(
        `🚫 *JATAH HABIS!*\n` +
        `editimg hanya bisa dipakai *${BATAS_PAKAI}x dalam 6 jam*.\n` +
        `Jatahmu pulih dalam *${sisaWaktu(usage.reset - Date.now())}*.\n` +
        `Sisa jatah: *0/${BATAS_PAKAI}*`
      )
    }
  }

  // 3. Ambil slot giliran untuk chat ini
  const slot = ambilSlot(m.chat)
  if (!slot) {
    return m.reply(
      `⏳ *ANTRIAN PENUH!*\n` +
      `Sedang ada render berjalan + ${MAKS_ANTRI} orang menunggu di chat ini.\n` +
      `Tunggu sebentar lalu coba lagi ya.`
    )
  }
  if (slot.position > 1) {
    await m.reply(`⏳ Kamu antrian *#${slot.position}* di chat ini, tunggu giliranmu ya...`)
  }
  await slot.prev // <-- tunggu giliran

  // 4. Potong kuota atomik saat giliran tiba (owner = unlimited, lewati)
  //    Dicek ulang di sini agar 2 user yang cek bareng tidak bisa
  //    sama-sama lolos saat sisa tinggal 1.
  if (!isOwner && user) {
    const usage = getUsage(user)
    if (usage.count >= BATAS_PAKAI) {
      slot.release()
      return m.reply(
        `🚫 *JATAH HABIS!*\n` +
        `editimg hanya bisa dipakai *${BATAS_PAKAI}x dalam 6 jam*.\n` +
        `Jatahmu pulih dalam *${sisaWaktu(usage.reset - Date.now())}*.`
      )
    }
    usage.count++
    var sisaKuota = BATAS_PAKAI - usage.count
  }

  try {
    let imageUrl = urlFromText

    // Jika user reply foto: download -> upload
    if (isMedia) {
      let media = await q.download()
      if (!media) throw 'Gagal mengunduh media!'

      let form = new FormData()
      form.append('files[]', media, { filename: 'upload.' + mime.split('/')[1] })

      let upload = await axios.post('https://uguu.se/upload.php', form, {
        headers: form.getHeaders()
      })

      imageUrl = upload?.data?.files?.[0]?.url
      if (!imageUrl) throw 'Gagal upload ke Uguu!'
    }

    await m.reply('Tunggu sebentar, sedang mengedit foto...')

    // Panggil API Faa edit foto
    let apiUrl = `https://api-faa.my.id/faa/editfoto?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`
    let res = await axios.get(apiUrl, {
      responseType: 'arraybuffer' // asumsi balasan berupa gambar
    })

    if (!res.data) throw 'Gagal mengedit foto!'

    await conn.sendFile(
      m.chat,
      res.data,
      'edit.jpg',
      isOwner ? `Selesai mengedit foto ✨\n👑 Owner: unlimited` : `Selesai mengedit foto ✨\n🎫 Sisa jatah: *${sisaKuota}/${BATAS_PAKAI}* (reset 6 jam)`,
      m
    )
  } catch (e) {
    console.error(e)
    m.reply(typeof e === 'string' ? e : 'Terjadi error, coba lagi nanti.')
  } finally {
    slot.release() // <-- bebaskan giliran untuk antrian berikutnya
  }
}

handler.help = ['editimg <prompt> (reply foto)']
handler.tags = ['ai', 'tools']
handler.command = /^editimg$/i
handler.limit = true

export default handler
