// ╔══════════════════════════════════════════════════╗
// ║        AI TAG BOT - JOJO BOT                     ║
// ║  Tag nomor bot -> bot menjawab via Gemini AI     ║
// ║  Contoh: "@jojo siapa kamu?"                    ║
// ║  Reply pesan AI bot -> lanjut obrolan (tanpa     ║
// ║  tag). Reply ke pesan bot SELAIN jawaban AI      ║
// ║  (menu, game, dll) TIDAK dibalas.               ║
// ║  API: api.siputzx.my.id/api/ai/gemini           ║
// ╚══════════════════════════════════════════════════╝
//
// Cara kerja:
// 1. handler.before di bawah jalan untuk SETIAP pesan.
// 2. Kalau pesan men-tag JID bot (m.mentionedJid berisi nomor bot),
//    tag dibuang dari teks dan sisanya dijadikan pertanyaan.
// 3. Kalau pesan me-reply jawaban AI bot (ID-nya tercatat),
//    teks reply dianggap lanjutan obrolan -> dijawab juga.
// 4. Pertanyaan dikirim ke API Gemini, jawabannya di-reply.
// 5. Pesan command (diawali prefix) TIDAK dibajak.

import fetch from 'node-fetch'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// ── KONFIG ──────────────────────────────────────
// Ganti COOKIE kalau expired (API balas error / respons kosong).
// Ganti PROMPT_SYSTEM untuk ubah kepribadian bot.
const GEMINI_COOKIE = 'sidts-CjIBXMw41UT6szxuJ-l_JdAeBV0yOEXrWgCgVwUCqkEGd2r8h2gFCNogjwEBKa_9PjtW_RAA'
const PROMPT_SYSTEM = 'kamu adalah jojo, bot whatsapp yang ramah, santai, dan helpful. Bahasa: Indonesia santai. ATURAN UTAMA: jawab SESINGKAT mungkin — langsung ke inti jawaban, tanpa basa-basi, tanpa kalimat pembuka atau penutup yang tidak perlu. Default maksimal 1-3 kalimat pendek. Jangan gunakan format markdown berlebihan (tanpa heading, tanpa daftar panjang, tanpa bold di mana-mana) kecuali diminta. KECUALI: jika user secara eksplisit meminta penjelasan detail — misalnya dengan kata "jelaskan", "jelaskan secara detail", "elaborasikan", "panjang", "lengkap", "step by step" — maka jawab SELENGKAP dan SEDETAIL mungkin dengan struktur yang rapi. Jangan pernah menyebut kamu AI atau model bahasa kecuali ditanya.'
// ─────────────────────────────────────────────────

const cooldown = new Map() // sender -> timestamp (anti spam / flood API)
const COOLDOWN_MS = 5000

// ID pesan jawaban AI bot -> timestamp (untuk deteksi reply lanjutan).
// Hanya jawaban AI yang dicatat, jadi reply ke pesan bot lain
// (menu, game, dsb) TIDAK akan dibalas.
const aiReplies = new Map()
const AI_REPLY_TTL_MS = 15 * 60 * 1000 // konteks reply hangus 15 menit
const AI_REPLY_MAX = 200

function rememberAiReply(msgId) {
  if (!msgId) return
  // Prune: buang yang kedaluwarsa + batasi ukuran (FIFO)
  const now = Date.now()
  for (const [id, ts] of aiReplies) {
    if (now - ts > AI_REPLY_TTL_MS) aiReplies.delete(id)
  }
  while (aiReplies.size >= AI_REPLY_MAX) {
    aiReplies.delete(aiReplies.keys().next().value)
  }
  aiReplies.set(msgId, now)
}

function isAiReply(quotedId) {
  if (!quotedId) return false
  const ts = aiReplies.get(quotedId)
  if (!ts) return false
  if (Date.now() - ts > AI_REPLY_TTL_MS) {
    aiReplies.delete(quotedId)
    return false
  }
  return true
}

// Ambil nomor dari JID (buang device id ":xx" & domain)
const num = (jid = '') => String(jid).split('@')[0].split(':')[0].replace(/[^0-9]/g, '')

// ── TTS: jawaban AI dijadikan voice note (model nahida) ────────
// Gagal di tahap mana pun -> lempar error -> pemanggil fallback ke teks.
async function ttsNahidaUrl(text) {
  const res = await fetch(
    `https://api-faa.my.id/faa/tts-legkap?text=${encodeURIComponent(text)}`
  )
  if (!res.ok) throw new Error(`TTS API ${res.status}`)
  const json = await res.json()
  const nahida = json?.result?.find?.((r) => r?.model === 'nahida' && r?.url)
  if (!nahida?.url) throw new Error('Model nahida gagal generate suara')
  return nahida.url
}

async function ttsVoiceNote(text) {
  const url = await ttsNahidaUrl(text)
  const dl = await fetch(url)
  if (!dl.ok) throw new Error('Download hasil TTS gagal')
  const wav = Buffer.from(await dl.arrayBuffer())
  if (!wav.length) throw new Error('File TTS kosong')
  // wav -> opus ogg (format voice note WhatsApp) via file tmp
  // (pipe stdin macet di ffmpeg Windows, jadi pakai file)
  const { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } = await import('fs')
  const { join } = await import('path')
  const tmpDir = join(process.cwd(), 'tmp')
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })
  const base = join(tmpDir, `tts_${Date.now()}_${Math.floor(Math.random() * 1e6)}`)
  const inWav = base + '.wav'
  const outOgg = base + '.ogg'
  try {
    writeFileSync(inWav, wav)
    await execFileAsync('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-i', inWav,
      '-c:a', 'libopus', '-b:a', '48k',
      '-f', 'ogg', outOgg
    ])
    if (!existsSync(outOgg)) throw new Error('Konversi opus gagal')
    const ogg = readFileSync(outOgg)
    if (!ogg?.length) throw new Error('Hasil opus kosong')
    return ogg
  } finally {
    for (const p of [inWav, outOgg]) {
      try { if (existsSync(p)) unlinkSync(p) } catch {}
    }
  }
}

// Jawaban panjang (>400 char) langsung teks saja (TTS berat & lama).
const TTS_MAX_CHAR = 400

async function askGemini(question) {
  const url =
    `https://api.siputzx.my.id/api/ai/gemini` +
    `?text=${encodeURIComponent(question)}` +
    `&cookie=${encodeURIComponent(GEMINI_COOKIE)}` +
    `&promptSystem=${encodeURIComponent(PROMPT_SYSTEM)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const json = await res.json()
  const answer = json?.data?.response
  if (!answer) throw new Error('Respons API kosong.')
  return answer
}

// Tidak ada command — semua lewat .before
let handler = async () => {}

handler.before = async function (m, { conn }) {
  const replyAi = async (query) => {
    // Cooldown anti spam (diam saja kalau masih cooldown)
    const last = cooldown.get(m.sender) || 0
    if (Date.now() - last < COOLDOWN_MS) return true
    cooldown.set(m.sender, Date.now())

    try {
      await conn.sendPresenceUpdate('composing', m.chat)
    } catch {}

    const answer = await askGemini(query)

    // 1. Coba jawab pakai voice note (model nahida)
    if (answer.length <= TTS_MAX_CHAR) {
      try {
        try { await conn.sendPresenceUpdate('recording', m.chat) } catch {}
        const vn = await ttsVoiceNote(answer)
        const sent = await conn.sendMessage(m.chat,
          { audio: vn, mimetype: 'audio/ogg; codecs=opus', ptt: true },
          { quoted: m })
        rememberAiReply(sent?.key?.id)
        return true
      } catch (e) {
        console.error('[ai-tagbot][vn] gagal, fallback teks:', e?.message || e)
      }
    }

    // 2. Fallback: teks biasa (juga untuk jawaban panjang)
    const sent = await conn.reply(m.chat, answer, m)
    rememberAiReply(sent?.key?.id)
    return true
  }

  try {
    if (!m.text || m.isBaileys || m.fromMe) return
    // Jangan bajak command, mis. ".menu @bot"
    if (global.prefix && global.prefix.test(m.text)) return

    const botNum = num(this?.user?.jid || conn?.user?.jid)
    if (!botNum) return
    const mentioned = m.mentionedJid || []
    const tagBot = mentioned.some((jid) => num(jid) === botNum)

    if (tagBot) {
      // Buang semua tag "@angka", sisanya = pertanyaan
      const query = m.text.replace(/@\d+/g, '').trim()
      if (!query) {
        await conn.reply(
          m.chat,
          `Halo! Aku *${global.namebot || 'JOJO BOT'}*.\nTag aku + tulis pertanyaanmu, contoh:\n@${botNum} siapa kamu?`,
          m
        )
        return true
      }
      return await replyAi(query)
    }

    // Lanjutan obrolan: reply ke jawaban AI bot (tanpa perlu tag lagi).
    // Reply ke pesan bot SELAIN jawaban AI -> diabaikan.
    // Jawaban AI sebelumnya disertakan sebagai konteks agar kata
    // ganti seperti "nya", "itu", "kalau itu" tetap nyambung.
    const q = m.quoted
    if (q?.id && isAiReply(q.id) && (q.fromMe || num(q.sender) === botNum)) {
      const clean = m.text.replace(/@\d+/g, '').trim()
      if (!clean) return
      const prev = (q.text || '').trim().slice(0, 800)
      const query = prev
        ? `Konteks percakapan sebelumnya:\n"${prev}"\nPertanyaan lanjutan: ${clean}`
        : clean
      return await replyAi(query)
    }
  } catch (e) {
    console.error('[ai-tagbot]', e?.message || e)
    try {
      await m.reply('Maaf, AI lagi error. Coba lagi nanti ya.')
    } catch {}
    return true
  }
}

handler.help = ['tagbot']
handler.tags = ['ai']

export default handler
