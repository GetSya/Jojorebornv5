import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Fallback untuk webp ANIMASI: ffmpeg build ini tidak bisa demux webp
// animasi langsung ("image data not found"). Jadi frame diekstrak dulu
// pakai sharp, lalu dirakit jadi mp4. Kembalikan daftar file frame
// sementara agar bisa dibersihkan pemanggil.
async function webpAnimToMp4(inputPath, outputPath) {
  const meta = await sharp(inputPath).metadata()
  const pages = Math.min(meta.pages || 1, 90) // batasi 90 frame
  if (pages < 2) throw new Error('Bukan webp animasi')

  // fps dari delay frame (ms) -> batasi 5..30
  const delayMs = meta.delay?.[0] || 100
  const fps = Math.max(5, Math.min(30, Math.round(1000 / delayMs)))

  const framePattern = `${outputPath}.f%d.png`
  const framePaths = []
  for (let i = 0; i < pages; i++) {
    const fp = `${outputPath}.f${i}.png`
    await sharp(inputPath, { page: i }).png().toFile(fp)
    framePaths.push(fp)
  }

  await execFileAsync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(fps),
    '-i', framePattern,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-movflags', 'faststart',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    outputPath
  ])

  if (!existsSync(outputPath)) throw new Error('Rakit frame gagal')
  return framePaths
}

let handler = async (m, { conn, usedPrefix, command }) => {
    const asGif = /gif/i.test(command)
    const label = asGif ? 'GIF' : 'video'
    const tmpDir = join(__dirname, '../tmp')
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

    const base = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
    const inputPath = join(tmpDir, `${base}.webp`)
    const outputPath = join(tmpDir, `${base}.mp4`)

    try {
        // pastikan ada sticker
        let q = m.quoted ? m.quoted : m
        let mime = (q.msg || q).mimetype || ''

        if (!/webp/.test(mime)) {
            return m.reply(
`✨ *${asGif ? 'TOGIF' : 'TOVIDEO'} ENGINE*
Reply sticker untuk dikonversi menjadi ${label}

Contoh:
${usedPrefix + command}`
            )
        }

        const buffer = await q.download()
        if (!buffer?.length) return m.reply('❌ Gagal mengunduh sticker. Coba kirim / reply ulang stickernya.')

        writeFileSync(inputPath, buffer)
        await m.react('🕒').catch(() => {})

        // WebP -> MP4 (H.264, dimensi genap agar valid).
        // Coba ffmpeg langsung (cepat, untuk webp statis).
        // Gagal -> fallback ekstrak frame via sharp (untuk webp animasi).
        let framePaths = []
        try {
            await execFileAsync('ffmpeg', [
                '-y', '-loglevel', 'error',
                '-i', inputPath,
                '-movflags', 'faststart',
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                outputPath
            ])
            if (!existsSync(outputPath)) throw new Error('no-output')
        } catch (e) {
            console.error('[togif/tovid] ffmpeg langsung gagal, pakai fallback frame:', e?.message || e)
            try { if (existsSync(outputPath)) unlinkSync(outputPath) } catch {}
            framePaths = await webpAnimToMp4(inputPath, outputPath)
        }

        const outBuffer = existsSync(outputPath) ? readFileSync(outputPath) : null
        for (const fp of framePaths) {
            try { if (existsSync(fp)) unlinkSync(fp) } catch {}
        }
        if (!outBuffer?.length) throw 'Hasil konversi kosong, coba sticker lain.'

        await conn.sendMessage(m.chat, {
            video: outBuffer,
            mimetype: 'video/mp4',
            ...(asGif ? { gifPlayback: true } : {}),
            caption: `✨ Sticker berhasil dikonversi menjadi ${label}`
        }, { quoted: m })
        await m.react('✅').catch(() => {})

    } catch (err) {
        console.error('[togif/tovid]', err)
        const msg = typeof err === 'string' ? err : (err?.message || 'Gagal mengonversi sticker.')
        if (/ffmpeg|ENOENT/i.test(msg)) {
            return m.reply('❌ ffmpeg tidak ditemukan di server. Hubungi owner bot.')
        }
        return m.reply(`❌ Gagal mengubah sticker menjadi ${label}.\n${msg}`)
    } finally {
        for (const p of [inputPath, outputPath]) {
            try { if (existsSync(p)) unlinkSync(p) } catch {}
        }
    }
}

handler.help = ['togif <reply sticker>', 'tovid <reply sticker>']
handler.tags = ['tools']
handler.command = /^(togif|tovid|stickertogif|stickertovid)$/i
handler.limit = true

export default handler
