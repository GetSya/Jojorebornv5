import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const execFileAsync = promisify(execFile)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

        // WebP (statis / animasi) -> MP4 (H.264, dimensi genap agar valid)
        await execFileAsync('ffmpeg', [
            '-y', '-loglevel', 'error',
            '-i', inputPath,
            '-movflags', 'faststart',
            '-pix_fmt', 'yuv420p',
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
            outputPath
        ])

        if (!existsSync(outputPath)) throw 'File hasil tidak terbentuk (ffmpeg gagal).'
        const outBuffer = readFileSync(outputPath)
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
