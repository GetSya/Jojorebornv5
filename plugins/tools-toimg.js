import sharp from 'sharp' // untuk konversi WebP → PNG/JPG (in-memory, tanpa file tmp)

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        // pastikan ada sticker
        let q = m.quoted ? m.quoted : m
        let mime = (q.msg || q).mimetype || ''

        if (!/webp/.test(mime)) {
            return m.reply(
`✨ *TOIMAGE ENGINE*
Reply sticker untuk dikonversi menjadi gambar

Contoh:
${usedPrefix + command}`
            )
        }

        const buffer = await q.download()
        if (!buffer?.length) return m.reply('❌ Gagal mengunduh sticker. Coba kirim / reply ulang stickernya.')

        // Deteksi sticker animasi (penyebab umum "Gagal mengubah" kemarin)
        let animated = false
        try {
            const meta = await sharp(buffer).metadata()
            animated = (meta?.pages || 1) > 1
        } catch {}

        // Konversi in-memory (tanpa tulis file tmp -> tidak ada race / file nyangkut).
        // Sticker animasi diambil frame pertamanya.
        let imgBuffer
        try {
            imgBuffer = await sharp(buffer, { animated: false }).png().toBuffer()
        } catch (e) {
            throw 'Sticker ini tidak bisa dibaca (format tidak didukung).'
        }
        if (!imgBuffer?.length) throw 'Hasil konversi kosong, coba sticker lain.'

        await conn.sendMessage(m.chat, {
            image: imgBuffer,
            caption: animated
                ? '✨ Sticker animasi dikonversi (frame pertama).\nMau versi geraknya? Pakai *.togif*'
                : '✨ Sticker berhasil dikonversi menjadi gambar'
        }, { quoted: m })

    } catch (err) {
        console.error('[toimg]', err)
        return m.reply(typeof err === 'string' ? `❌ ${err}` : '❌ Gagal mengubah sticker menjadi gambar.')
    }
}

handler.help = ['toimg <reply sticker>']
handler.tags = ['tools']
handler.command = /^(toimg|sticker2img|stikertoimg)$/i
handler.limit = true

export default handler
