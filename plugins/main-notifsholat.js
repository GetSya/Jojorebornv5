import fetch from 'node-fetch'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let chat = global.db.data.chats[m.chat] || {}
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = chat

    if (command === 'notifsholat') {
        if (!text) throw `*Format Salah!*\nContoh: *${usedPrefix + command} on* atau *off*`
        let type = text.toLowerCase()

        if (type === 'on') {
            chat.notifsholat = true
            m.reply(`✅ Notifikasi Sholat berhasil *DIAKTIFKAN* untuk chat ini.`)
        } else if (type === 'off') {
            chat.notifsholat = false
            m.reply(`❌ Notifikasi Sholat berhasil *DIMATIKAN*.`)
        } else throw 'Pilih *on* atau *off*'
    }

    // Perintah setkota dan jadwalsholat tetap sama seperti sebelumnya
    if (command === 'setkota') {
        if (!text) throw `*Format Salah!*\nContoh: *${usedPrefix + command} jakarta*`
        let res = await fetch(`https://api.myquran.com/v2/sholat/kota/cari/${text}`)
        let json = await res.json()
        if (!json.status || json.data.length === 0) throw `❌ Kota *${text}* tidak ditemukan.`
        let data = json.data[0]
        chat.kotaSholat = data.id
        chat.namaKota = data.lokasi
        m.reply(`✅ Berhasil mengatur lokasi ke: *${data.lokasi}* (ID: ${data.id})`)
    }

    if (command === 'jadwalsholat') {
        let idKota = chat.kotaSholat || '1301'
        let date = new Date().toISOString().split('T')[0]
        let res = await fetch(`https://api.myquran.com/v2/sholat/jadwal/${idKota}/${date}`)
        let json = await res.json()
        if (!json.status) throw '❌ Gagal mengambil jadwal sholat.'
        let j = json.data.jadwal
        let teks = `🕌 *JADWAL SHOLAT* 🕌\n\n`
        teks += `📍 Lokasi: *${json.data.lokasi}*\n`
        teks += `📅 Tanggal: *${j.tanggal}*\n\n`
        teks += `◦ Imsak: ${j.imsak}\n◦ Subuh: ${j.subuh}\n◦ Dzuhur: ${j.dzuhur}\n◦ Ashar: ${j.ashar}\n◦ Maghrib: ${j.maghrib}\n◦ Isya: ${j.isya}\n\n`
        teks += `_Gunakan *${usedPrefix}notifsholat on*_`
        m.reply(teks)
    }
}

handler.help = ['notifsholat', 'setkota', 'jadwalsholat']
handler.tags = ['tools']
handler.command = /^(notifsholat|setkota|jadwalsholat)$/i

export default handler