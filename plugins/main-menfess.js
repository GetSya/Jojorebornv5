import fs from 'fs'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Bagian database menfess bisa dihapus jika Anda tidak ingin ada fitur chat anonim sama sekali
    // if (!global.db.data.menfess) global.db.data.menfess = {} 
    
    if (!text) throw `*Format Salah!*\n\nContoh: *${usedPrefix + command} 0851-8322-1210 | Halo, aku suka kamu*`

    let [jid, pesan] = text.split('|')
    if (!jid || !pesan) throw `*Format Salah!*\nGunakan tanda | sebagai pemisah.\nContoh: *${usedPrefix + command} 0851-8322-1210 | Halo*`

    let target = jid.trim().replace(/[^0-9]/g, '')
    if (target.startsWith('0')) target = '62' + target.slice(1)
    let targetJid = target + '@s.whatsapp.net'

    if (targetJid === m.sender) throw 'Gak bisa kirim menfess ke diri sendiri!'

    try {
        let imagePath = './media/surat.jpeg'
        let caption = `👋 *Seseorang mengirimkan Menfess (Pesan Rahasia) kepadamu!*\n\n`
        caption += `💬 *Pesan:* \n_"${pesan.trim()}"_\n\n`
        // Hapus info tentang membalas pesan karena kita ingin sekali kirim selesai
        caption += `_Pesan ini dikirim secara rahasia melalui bot._`

        // Kirim Pesan dengan Gambar
        await conn.sendMessage(targetJid, { 
            image: fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : { url: 'https://cdn.pixabay.com/photo/2016/06/15/16/47/letters-1459347_1280.png' },
            caption: caption
        })

        await conn.reply(m.chat, '✅ Menfess berhasil dikirim!', m)

        /* BAGIAN DI BAWAH INI DIHAPUS/DIKOMENTAR 
           Agar tidak membuat sesi chatting berkelanjutan
        */
        /*
        let id = + new Date
        global.db.data.menfess[id] = {
            id,
            a: m.sender,
            b: targetJid,
            status: 'CHATTING'
        }
        */

    } catch (e) {
        console.error(e)
        throw '❌ Gagal mengirim. Pastikan nomor benar atau bot sudah pernah chat dengan nomor tersebut.'
    }
}

handler.help = ['menfess <nomor|pesan>']
handler.tags = ['main']
handler.command = /^(menfess|confess)$/i
handler.private = true 

export default handler