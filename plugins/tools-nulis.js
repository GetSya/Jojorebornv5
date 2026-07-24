import { Canvas, loadImage, FontLibrary } from 'skia-canvas'
import path from 'path'

FontLibrary.use("Handwriting", "./media/fonts/tulisan.ttf")

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `❌ Masukkan teksnya!\n\nContoh: *${usedPrefix + command}* Halo dunia`

    await m.reply('⏳ Sedang menulis...')

    try {
        const bgPath = path.resolve('./media/kertas.jpg')
        const image = await loadImage(bgPath)

        const canvas = new Canvas(image.width, image.height)
        const ctx = canvas.getContext("2d")

        ctx.drawImage(image, 0, 0)

        const FONT_SIZE = 42
        ctx.font = `${FONT_SIZE}px Handwriting`
        ctx.fillStyle = "#2c3e50"
        ctx.textBaseline = "alphabetic"

        let x = 254
        let firstLineY = 442
        let lineSpacing = 54
        let maxWidth = 900
        let maxLines = 20

        let lineIndex = 0
        let terpotong = false

        const paragraphs = text.split('\n')

        for (let p = 0; p < paragraphs.length; p++) {

            let words = paragraphs[p].split(' ')
            let line = ''

            for (let i = 0; i < words.length; i++) {

                let testLine = line + words[i] + ' '
                let width = ctx.measureText(testLine).width

                if (width > maxWidth && i > 0) {

                    if (lineIndex >= maxLines) {
                        terpotong = true
                        break
                    }

                    let y = firstLineY + (lineIndex * lineSpacing)
                    ctx.fillText(line.trim(), x, y)

                    line = words[i] + ' '
                    lineIndex++

                } else {
                    line = testLine
                }
            }

            if (terpotong) break

            if (lineIndex < maxLines) {
                let y = firstLineY + (lineIndex * lineSpacing)
                ctx.fillText(line.trim(), x, y)
                lineIndex++
            } else {
                terpotong = true
                break
            }
        }

        const buffer = await canvas.toBuffer("png")

        await conn.sendMessage(
            m.chat,
            {
                image: buffer,
                caption: terpotong
                    ? `⚠️ *Teks Terpotong!*\nKertas sudah penuh.`
                    : `✨ *Sukses Menulis*`
            },
            { quoted: m }
        )

    } catch (e) {
        console.error(e)
        m.reply('❌ Gagal memproses gambar.')
    }
}

handler.help = ['nulis <teks>']
handler.tags = ['tools']
handler.command = /^(nulis|tulis)$/i
handler.limit = true
handler.register = true

export default handler
