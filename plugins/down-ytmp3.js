import { YtDlp } from 'ytdlp-nodejs'

const ytdlp = new YtDlp()

let handler = async (m, { conn, args }) => {
    const url = args[0]
    
    // Validasi URL
    if (!url || !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
        return conn.reply(m.chat, "🔗 Masukkan URL YouTube yang valid!", m)
    }

    await m.react('🕒')

    try {
        // 1. Ambil Info Video (Judul, Thumbnail, dll)
        const info = await ytdlp.getInfoAsync(url)
        const title = info.title || 'YouTube Audio'

        // 2. Proses Stream Audio ke Buffer
        // Menggunakan filter 'audioonly' dengan format 'mp3'
        const audioBuffer = await ytdlp
            .stream(url)
            .filter('audioonly')
            .audioFormat('mp3')
            .on('progress', (p) => {
                // Kamu bisa log progress di console jika perlu
                console.log(`Downloading ${title}: ${p.percentage_str}`)
            })
            .toBuffer()

        // 3. Kirim ke WhatsApp
        await conn.sendMessage(m.chat, {
            audio: audioBuffer, 
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${title}.mp3`,
        }, { quoted: m })

        await m.react('✅')

    } catch (e) {
        console.error(e)
        // Jika error karena binary yt-dlp belum ada, beri tahu owner
        if (e.message.includes('not found')) {
            conn.reply(m.chat, `❌ Error: yt-dlp binary belum terinstall di server.`, m)
        } else {
            conn.reply(m.chat, `❌ Terjadi Kesalahan: ${e.message || e}`, m)
        }
        await m.react('✖️')
    }
}

handler.help = ["yta <url>", "ytmp3 <url>"]
handler.tags = ["downloader"]
handler.command = /^yta|ytmp3$/i
handler.limit = true

export default handler