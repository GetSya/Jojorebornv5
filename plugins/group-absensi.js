import { Canvas, loadImage } from 'skia-canvas'

let handler = async (m, { conn, usedPrefix, command, text }) => {
    conn.absensi = conn.absensi ? conn.absensi : {}
    let id = m.chat

    if (command === 'absensi') {
        if (id in conn.absensi) return conn.reply(m.chat, `⚠️ Masih ada absensi yang berlangsung di grup ini!\nKetik *${usedPrefix}hapusabsen* untuk memulai ulang.`, conn.absensi[id][0])
        
        let judul = text ? text : 'Absensi Harian'
        conn.absensi[id] = [
            await m.reply(`✅ *ABSENSI DIMULAI*\n\nJudul: *${judul}*\n\nKetik *${usedPrefix}hadir* atau klik tombol (jika tersedia) untuk mengisi daftar hadir.`),
            [], // Daftar yang hadir
            judul,
            Date.now()
        ]
    }

    else if (command === 'hadir') {
        if (!(id in conn.absensi)) return m.reply(`❌ Tidak ada absensi yang sedang berlangsung. Ketik *${usedPrefix}absensi* untuk memulai.`)
        
        let [pesan, list, judul, waktu] = conn.absensi[id]
        if (list.includes(m.sender)) return m.reply('✅ Kamu sudah absen sebelumnya.')
        
        list.push(m.sender)
        let count = list.length
        
        let caption = `📝 *DAFTAR HADIR: ${judul}*\n\n`
        caption += list.map((v, i) => ` ${i + 1}. @${v.split('@')[0]}`).join('\n')
        caption += `\n\nTotal: *${count}* peserta\nKetik *${usedPrefix}cekabsen* untuk melihat daftar terbaru.`

        await conn.reply(m.chat, `Berhasil absen! (Urutan ke-${count})`, m)
    }

    else if (command === 'cekabsen') {
        if (!(id in conn.absensi)) return m.reply('❌ Tidak ada absensi aktif.')
        let [pesan, list, judul] = conn.absensi[id]
        if (list.length === 0) return m.reply('Belum ada yang absen.')

        let caption = `📊 *REKAP ABSENSI: ${judul}*\n\n`
        caption += list.map((v, i) => ` ${i + 1}. @${v.split('@')[0]}`).join('\n')
        caption += `\n\nTotal: *${list.length}* orang`
        
        conn.reply(m.chat, caption, null, { mentions: list })
    }

    else if (command === 'hapusabsen') {
        if (!(id in conn.absensi)) return m.reply('❌ Memang tidak ada absensi aktif.')
        delete conn.absensi[id]
        m.reply('✅ Sesi absensi berhasil dihapus/dihentikan.')
    }
}

handler.help = ['absensi', 'hadir', 'cekabsen', 'hapusabsen']
handler.tags = ['group']
handler.command = /^(absensi|hadir|cekabsen|hapusabsen)$/i
handler.group = true // Hanya bisa di grup

export default handler